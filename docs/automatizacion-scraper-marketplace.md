# Documentación: Automatización de scraping de autos en Facebook Marketplace (Cuenca, Ecuador)

Documentación técnica completa del sistema que busca autos en Facebook Marketplace, los normaliza, los guarda en base de datos y los muestra en la app para identificar oportunidades de compra.

---

## 1. ¿Qué es y para qué sirve?

**En pocas palabras:**  
El sistema es como un “robot que mira el tablón de anuncios de autos en Facebook” y trae a casa solo la información que te importa: qué auto es, a qué precio, quién vende y dónde está. Así no tienes que buscar a mano; todo queda guardado y ordenado en tu base de datos y en la app.

**Para qué sirve:**
- Encontrar autos publicados en Marketplace (sobre todo pensado para Cuenca/Ecuador).
- Guardar cada anuncio una sola vez, sin duplicados.
- Unificar nombres de marcas y modelos (por ejemplo: “dmax” → “D-MAX”, “citroen” → “Citroën”).
- Calcular si un precio es bueno o alto comparado con otros del mismo modelo.
- Mostrar en la app qué vendedores están “en patio”, “en taller” o “en cliente” y filtrar por marca, modelo, año, ciudad, etc.

**Analogía simple:**  
Es como tener a alguien que cada día revisa el periódico de clasificados de autos, anota cada anuncio en una ficha y te deja una carpeta ordenada para que tú solo revises las mejores ofertas.

---

## 2. Componentes del sistema

| Componente | Qué hace en una frase |
|------------|------------------------|
| **Facebook Marketplace** | Donde están publicados los anuncios de autos que el sistema lee (búsqueda acotada a Cuenca). |
| **Apify** | Actor `nautical_odyssey~marketplace-scraper`: extrae listings de Marketplace (título, precio, fotos, vendedor, descripción, etc.) y devuelve los datos al workflow. |
| **n8n** | Workflow **"Scraper - Merge Listings con DB (fb_seller_id + url)"**: recibe webhooks, llama a Apify, filtra por precio, extrae datos con OpenAI, normaliza con catálogo, crea/actualiza sellers y vehículos en Supabase. |
| **Supabase** | Base de datos donde se guardan vendedores (`scraper_sellers`), vehículos (`scraper_vehicles`), pedidos (`vehicle_requests`) y, si aplica, estadísticas de precios. |
| **OpenAI** | Nodo **Extract vehicle especifications**: recibe lotes de anuncios (id, título, descripción) y devuelve JSON con brand, model, mileage, extras, specifications, motor, transmission, excluded. |
| **App web** | Interfaz que llama a los webhooks del scraper, filtra por marca/modelo/ciudad/tracción, muestra estadísticas y usa el catálogo `ECUADOR_CAR_DATA`. |

> **Nota:** En el flujo actual de n8n **no se usa Claude Vision**; el análisis de fotos (cabina, exterior, interior, etc.) existe como tipo en la app pero no está implementado en este workflow.

---

## 3. Flujo completo paso a paso

Workflow de n8n: **Scraper - Merge Listings con DB (fb_seller_id + url)**. Tres orígenes de ejecución:

### 3.1 Trigger: búsqueda desde la app (un término)

1. **Trigger FrontEnd** (webhook POST `buscar-producto-marketplace`) recibe el body con `searchValue`.
2. **Convert string to Encode URI**: arma las URLs de búsqueda de Marketplace Cuenca (por término y por categoría) y devuelve `urls`.
3. **Scrap data by enconde uri**: llama a Apify `nautical_odyssey~marketplace-scraper` (run-sync-get-dataset-items) con `urls`, `count: 60`, `untilDate` 7 días atrás, `maxPagesPerUrl: 3`, `getListingDetails: true`. **No se envían cookies de Facebook**: el scraper corre sin sesión para evitar errores "Cookies are no longer valid" y reducir costos; los datos de vendedor (nombre, foto, rating) pueden no estar disponibles y la app no los muestra.
4. **Check if any data exists**: toma los ítems devueltos por Apify (o por el otro branch si viene de pedidos/horario).
5. **Filter cars by price**: mantiene solo listings con precio entre **3.000** y **200.000** (USD).
6. **If**: si no hay ítems tras el filtro, responde con resumen en cero y termina.
7. **Get vehicles on db**: por cada listing se consulta si su `listingUrl` ya existe en `scraper_vehicles`.
8. **Build Batch Prompt**: agrupa listings en lotes (BATCH_SIZE 10), arma texto `listings[]{id,title,description}` y excluye los que ya están en BD por URL.
9. **Extract vehicle especifications** (OpenAI): envía cada lote; el modelo devuelve JSON `vehicles[]` con id, brand, model, mileage, extras, specifications, motor, transmission, excluded.
10. **Split Batch AI Results**: convierte la respuesta de OpenAI en un ítem por vehículo.
11. **Filter**: solo pasan ítems con brand y model no vacíos, model ≠ null y excluded = false.
12. **Map & tag listings**: une datos de Apify con los de OpenAI; calcula tags PATIO/MECANICA y location (patio/taller/cliente); calcula PRECIO_BAJO / PRECIO_ALTO respecto al promedio del lote; arma `mapped_data` (incluye `seller_pic` desde `car.marketplace_listing_seller.pic`).
13. **Sellers Data**: prepara el payload para `scraper_sellers` (fb_seller_id, seller_name, location, is_dealer, badges, seller_pic, rating, etc.).
14. **Get sellers already con db** / **Get many rows**: obtiene sellers ya existentes por `fb_seller_id`. **Code in JavaScript** filtra los que no están en BD; **Create a row** inserta los sellers nuevos en `scraper_sellers`.
15. **Get sellers already con db** (por ítem): para cada ítem busca el seller por `fb_seller_id`. **Filter mapped data by existing sellers1**: normaliza marca/modelo con `ECUADOR_CAR_DATA` y aliases (dmax→d-max, etc.); solo deja pasar los que coinciden con el catálogo y cuyo seller ya está en BD; asigna brand/model canónicos.
16. **Vehicles Listings Data**: mapea campos al formato de `scraper_vehicles` (title, price, year, mileage, url, image_url, tags, brand, model, seller_id, extras, characteristics, motor, transmission, etc.).
17. **Save Listings to DB**: inserta en `scraper_vehicles` (Supabase, dataToSend autoMapInputData).
18. **Update a row**: actualiza `scraper_sellers` (rating, rating_count) cuando aplica.
19. Opcional: **Convert images to base 64** → **Download Image** → **Upload to Supabase Storage** → **Listing image URLs** → **Update images** (actualiza `listing_image_urls` e `image_url` en `scraper_vehicles`).
20. **Build Summary**: calcula resumen (listings_nuevos_guardados, total_scrapeados, pasaron_filtro_precio, total_vehiculos_actualizados, etc.).
21. **Respond to Webhook13**: devuelve ese resumen en JSON al cliente.

### 3.2 Trigger: “buscar todas las marcas”

1. **Trigger FrontEnd1** (webhook POST `buscar-todas-las-marcas`) recibe la petición.
2. El flujo posterior puede usar un nodo que itere por las marcas del catálogo y, para cada una, genere `urls` y llame a **Scrap data by enconde uri** (o equivalente); desde ahí se sigue el mismo pipeline que en 3.1 (Check if any data exists → Filter cars by price → … → Build Summary → Respond).

### 3.3 Trigger: pedidos aprobados (vehicle_requests)

1. **Trigger horario** (Schedule, intervalo en minutos) se ejecuta.
2. **Pedidos**: Supabase getAll en `vehicle_requests` con filtro `status = aprobado`.
3. **Extract vehicle**: por cada pedido arma `carSearchValue` (brand + model + año promedio) y las URLs de búsqueda de Marketplace Cuenca.
4. **Scrap data by vehicle requests** (o **Scrap data by enconde uri** con esas URLs) devuelve los listings.
5. **Check if any data exists** toma esos datos y el flujo continúa igual que en 3.1 desde el paso 5.

**Resumen visual:**

```
[App: buscar-producto / buscar-todas-las-marcas]  →  Webhook n8n
[Trigger horario + Pedidos (vehicle_requests)]     →  Apify (Marketplace Cuenca)
                                                              ↓
Supabase (scraper_sellers, scraper_vehicles)  ←  n8n (filtro precio, OpenAI, Map & tag, normalización catálogo, Create/Update rows)  ←  Listings
```

---

## 4. Base de datos

### 4.1 `scraper_vehicles`

Guarda **cada anuncio de auto** scrapeado.

| Campo | Descripción |
|-------|-------------|
| `id` | UUID del vehículo. |
| `url` | URL del listing en Marketplace. **UNIQUE**: evita duplicados por anuncio. |
| `seller_id` | FK a `scraper_sellers`. Quién vende el auto. |
| `brand`, `model` | Marca y modelo **normalizados** (ej. "Toyota", "Hilux"). |
| `title`, `description` | Título y descripción originales del anuncio. |
| `year`, `motor`, `transmission` | Año, motor, transmisión (extraídos o normalizados). |
| `price`, `mileage` | Precio y kilometraje. |
| `location` | Ciudad/ubicación del anuncio. |
| `publication_date` | Fecha de publicación. |
| `image_url` | URL de la imagen principal. |
| `listing_image_urls` | Array con todas las URLs de fotos del listing. |
| `condition` | Estado (ej. USED, NEW_ITEM, etc.). |
| `extras`, `characteristics`, `tags` | Equipamiento y características. |
| `is_sold` | Si el anuncio está marcado como vendido. |
| `created_at`, `updated_at` | Auditoría. |

### 4.2 `scraper_sellers`

Guarda **vendedores** (cuentas/páginas de Marketplace).

| Campo | Descripción |
|-------|-------------|
| `id` | UUID del vendedor. |
| `fb_seller_id` | ID del vendedor en Facebook. **UNIQUE**: evita duplicados por vendedor. |
| `seller_name` | Nombre mostrado del vendedor. |
| `location` | Ubicación del negocio: `patio`, `taller` o `cliente`. Define la etiqueta PATIO / TALLER / CLIENTE en la app. |
| `is_dealer` | Si se considera concesionaria/dealer. |
| `pic` | URL de la foto de perfil del vendedor (no la foto de un auto). |
| `badges`, `rating`, `rating_count` | Insignias y valoración si Marketplace las entrega. |
| `total_listings`, `first_seen_at`, `last_updated` | Métricas y fechas. |

### 4.3 `vehicle_requests`

Guarda **pedidos de búsqueda de autos** (por ejemplo de un asesor o de un lead).

| Campo | Descripción |
|-------|-------------|
| `id` | ID del pedido. |
| `requested_by` | Usuario que pidió (FK a `profiles`). |
| `lead_id` | Lead asociado (opcional). |
| `brand`, `model` | Marca y modelo solicitados. |
| `year_min`, `year_max` | Rango de año. |
| `budget_max`, `color_preference`, `notes` | Restricciones y notas. |
| `status` | Estado: pendiente, aprobado, comprado, rechazado. |
| `priority` | Prioridad (baja, media, alta). |
| `type` | Tipo de vehículo (sedan, suv, camioneta, etc.). |

### 4.4 `scraper_vehicle_price_statistics`

Estadísticas de precios por **marca + modelo + año** (median_price, avg_price, min, max, percentiles, etc.). Se alimentan por trigger o por job que agrega datos de `scraper_vehicles`.

---

## 5. Triggers y funciones PostgreSQL

En el **workflow de n8n** la normalización de marca/modelo se hace en **código** (nodo Code **Filter mapped data by existing sellers1**), no con una función PostgreSQL dentro del flujo. Si en tu proyecto Supabase tienes funciones o triggers, serían adicionales.

### 5.1 Normalización en n8n (Code)

- **Dónde:** Nodo **Filter mapped data by existing sellers1** (JavaScript).
- **Qué hace:** Función `normalize(value)`: pasa a minúsculas, quita tildes (NFD), unifica guiones entre letras/números y espacios; aplica `BRAND_ALIASES` y `MODEL_ALIASES` (ej. mercedes→mercedes-benz, dmax→d-max); busca la marca/modelo en `ECUADOR_CAR_DATA` y asigna el brand/model canónico. Solo pasan ítems cuya marca y modelo coinciden con el catálogo.
- **Cuándo se ejecuta:** Después de **Map & tag listings** y de tener los sellers en BD; justo antes de **Vehicles Listings Data** y **Save Listings to DB**.

### 5.2 Función PostgreSQL `normalize_text` (si existe)

- En los tipos de Supabase aparece `normalize_text: { Args: { text_input: string }; Returns: string }`. Si está creada en la base, sirve para normalizar texto (p. ej. marca/modelo) de forma consistente; en el flujo actual de n8n no se llama — la normalización es 100% en el nodo Code anterior.

### 5.3 Trigger de estadísticas de precio / limpieza

- Si en Supabase tienes triggers que actualicen `scraper_vehicle_price_statistics` o tareas de limpieza al insertar/actualizar `scraper_vehicles`, se ejecutan según la configuración de tu proyecto. No forman parte del workflow exportado de n8n.

---

## 6. Normalización de marca y modelo

### Por qué existe

En Marketplace la gente escribe “dmax”, “D-MAX”, “citroen”, “Mercedes”… Si no se normaliza, el mismo auto aparece bajo varias “marcas” o “modelos” y no se puede filtrar ni calcular estadísticas bien. Además, el flujo **solo guarda** vehículos cuya marca y modelo coincidan con el catálogo `ECUADOR_CAR_DATA` (nodo **Filter mapped data by existing sellers1**).

### Cómo funciona (en n8n)

- **OpenAI** devuelve `brand` y `model` en crudo.
- En el nodo Code **Filter mapped data by existing sellers1** se usa una función `normalize(value)`: minúsculas, quitar tildes (NFD), reemplazar espacios/paréntesis/barras por guiones, colapsar guiones múltiples.
- Se aplican **BRAND_ALIASES** y **MODEL_ALIASES** (en el mismo Code) para unificar variantes antes de buscar en el catálogo.
- Se busca la clave normalizada en el mapa construido desde `ECUADOR_CAR_DATA`; si hay coincidencia (marca y modelo), se asigna el **canonicalBrand** y **canonicalModel** del catálogo. Si no hay coincidencia, el ítem **no pasa** y no se guarda en `scraper_vehicles`.

### Aliases en el workflow (extracto)

| Tipo | Entrada (normalizada) | Salida / catálogo |
|------|------------------------|-------------------|
| Marca | mercedes, benz, mercedes benz | mercedes-benz → Mercedes-Benz |
| Marca | citroen | citroën |
| Marca | gwm, great-wall, haval | gwm-great-wall-motors → GWM (Great Wall Motors) |
| Marca | gac | gac-motor → GAC Motor |
| Marca | land-rover, landrover | land-rover → Land Rover |
| Modelo | dmax | d-max (D-MAX) |
| Modelo | bt50, bt-50 | bt-50 (BT-50) |
| Modelo | xtrail, x-trail | x-trail (X-Trail) |
| Modelo | crv, hrv | cr-v / hr-v |
| Modelo | rav4, rav-4 | rav-4 (Rav4) |
| Modelo | f150, f-150 | f-150 (F-150) |
| Modelo | id4, id-4 | id-4 (ID.4) |
| Modelo | chr, c-hr | c-hr (C-HR) |

La app usa el mismo `ECUADOR_CAR_DATA` (en `src/data/ecuadorCars.ts`); el workflow tiene una copia embebida en el nodo Code para que marca/modelo guardados coincidan con la app.

---

## 7. Prompts de IA

En el workflow solo se usa **OpenAI** (nodo **Extract vehicle especifications**). No hay nodo de Claude Vision.

### 7.1 OpenAI – Extracción de datos del anuncio

- **Nodo:** **Extract vehicle especifications** (tipo OpenAI, modelo usado en el flujo: gpt-5-nano según configuración).
- **Entrada:** Texto por lotes generado en **Build Batch Prompt**: `listings[N]{id,title,description}` con id, título y descripción (recortada a 500 caracteres, sin “[hidden information]”) de cada anuncio.
- **Mensaje de sistema (literal del workflow):**  
  *"Extrae datos de vehículos automotores de cada anuncio. Devuelve SOLO JSON array llamado \"vehicles\", mismo orden, sin markdown.  
  Campos: {\"id\":null,\"brand\":null,\"model\":null,\"mileage\":null,\"extras\":[],\"specifications\":[],\"motor\":null,\"transmission\":null,\"excluded\":false}  
  excluded:true si no es carro/camioneta/SUV/pickup. No inventes datos."*
- **Mensaje de usuario:** el `batchText` (listados en el formato anterior).
- **Salida:** JSON con array `vehicles` en el mismo orden que los listings; cada elemento con `id`, `brand`, `model`, `mileage`, `extras`, `specifications`, `motor`, `transmission`, `excluded`. Si el anuncio no es vehículo tipo carro/camioneta/SUV/pickup, se marca `excluded: true` y el flujo lo filtra después en el nodo **Filter**.

---

## 8. Sistema de etiquetado (PATIO, MECANICA, PRECIO_BAJO, PRECIO_ALTO)

Todo se calcula en el nodo **Map & tag listings** (Code) del workflow. Las etiquetas se guardan en `scraper_vehicles.tags` y la ubicación del vendedor en `scraper_sellers.location`.

### 8.1 PATIO

- **Cuándo se asigna:** Si en la descripción o título del listing (texto en minúsculas) coincide el regex:  
  `\b(crédito|financiamiento|financiación|cuotas?|entrada|recibimos|parte de pago|aceptamos|visitanos|visítenos|estamos ubicados)\b`.
- **Efecto:** Se añade el tag `"PATIO"` al ítem; además, si no hay tag MECANICA, `scraper_sellers.location` se asigna como **patio** (si hay PATIO o si la descripción incluye "revendedor").

### 8.2 MECANICA

- **Cuándo se asigna:** Si en la descripción o título coincide el regex:  
  `\b(reparar|reparación|dañado|chocado|siniestrado|fallando)\b`.
- **Efecto:** Se añade el tag `"MECANICA"`; y `scraper_sellers.location` se asigna como **taller** (prioridad sobre PATIO).

### 8.3 Ubicación final del vendedor (patio / taller / cliente)

- **Regla en Code:**  
  - Si hay tag MECANICA → `location = "taller"`.  
  - Si hay tag PATIO o "revendedor" en descripción → `location = "patio"`.  
  - En caso contrario → `location = "cliente"`.  
- Ese valor se guarda en **Sellers Data** y en `scraper_sellers.location`. La app usa ese campo para mostrar “En Patio”, “Posible Falla” (taller), “En Cliente”.

### 8.4 PRECIO_BAJO y PRECIO_ALTO

- **Cálculo en el mismo nodo:** Con los ítems que pasaron **Filter cars by price** se calcula el promedio de precios (`avgPrice`) de los listings con precio > 2000. Luego por cada ítem:
  - Si `precio < avgPrice * 0.7` → se añade tag **PRECIO_BAJO** (y se puede usar como `primaryTag`).
  - Si `precio > avgPrice * 1.3` → se añade tag **PRECIO_ALTO**.
- Las estadísticas (avg, min, max, mediana) se calculan en el mismo Code y se guardan en cada ítem como `price_statistics`; no se escriben en la tabla `scraper_vehicle_price_statistics` desde este workflow (esa tabla se alimenta, si aplica, por triggers o jobs en Supabase).

---

## 9. Deduplicación

El workflow evita duplicados en varias capas:

| Capa | Nodo / lugar | Cómo |
|------|----------------|------|
| **Vehículo por URL** | **Get vehicles on db** | Por cada listing se consulta Supabase `scraper_vehicles` con filtro `url = listingUrl`. Si ya existe, ese ítem no se procesa para insert. |
| **Lote enviado a OpenAI** | **Build Batch Prompt** | Construye un set `existingUrls` con las URLs devueltas por **Get vehicles on db**; solo incluye en el batch los ítems cuya URL no está en ese set. Así no se vuelve a extraer ni guardar listings ya presentes en BD. |
| **Vendedor por fb_seller_id** | **Get many rows** + **Get sellers already con db** + **Code in JavaScript** | Se obtienen todos los sellers de `scraper_sellers` (Get many rows). Un Code filtra los ítems de **Sellers Data** cuyo `fb_seller_id` ya está en BD; solo los que no existen se envían a **Create a row**. No se hace “upsert” de sellers en el flujo: o ya están (y se usan) o se crean una vez. |
| **Solo listings con seller en BD** | **Filter mapped data by existing sellers1** | Usa `recentSellersMap` (fb_seller_id → id UUID de scraper_sellers) construido con **Get sellers already con db**. Solo pasan los ítems cuyo `mapped_data.seller_id` (fb_seller_id) está en ese mapa; si el seller es nuevo y aún no se insertó en este run, ese listing no continúa hacia **Vehicles Listings Data** / **Save Listings to DB** en esta ejecución. |
| **BD** | `scraper_sellers.fb_seller_id` UNIQUE, `scraper_vehicles.url` UNIQUE | La base rechaza inserts duplicados por esas claves. |

La fuente de verdad para “¿este listing ya está guardado?” es la **URL** del listing; para “¿este vendedor ya existe?” es **fb_seller_id**.

---

## 10. El catálogo ECUADOR_CAR_DATA

### Por qué existe

- Define **qué marcas y modelos** se consideran válidos para Ecuador.
- En **n8n** el nodo **Filter mapped data by existing sellers1** tiene una **copia embebida** del catálogo (objeto `ECUADOR_CAR_DATA` en el Code). Solo los listings cuya marca y modelo (tras normalizar y aplicar aliases) coinciden con una entrada del catálogo **pasan** al siguiente paso y se guardan en `scraper_vehicles`.
- En la **app** el archivo `src/data/ecuadorCars.ts` exporta el mismo catálogo para filtros y selector de búsqueda del scraper.

### Cómo filtra en el workflow

- Se construye un mapa: por cada marca del catálogo se guarda la clave normalizada, el nombre canónico de la marca y la lista de modelos canónicos (y sus variantes normalizadas).
- Por cada ítem de **Map & tag listings** se normaliza `brand` y `model`, se aplican BRAND_ALIASES y MODEL_ALIASES, y se busca en ese mapa. Si hay coincidencia (marca + modelo dentro del catálogo), se reasignan `mapped_data.brand` y `mapped_data.model` a los valores canónicos y el ítem se incluye en la salida; si no hay coincidencia, el ítem **no se incluye** y no llega a **Save Listings to DB**.

### Si un auto no está en el catálogo

- **En este flujo:** El listing **no se guarda**. Se descarta en **Filter mapped data by existing sellers1**. Para que ese tipo de auto empiece a guardarse hay que añadir la marca y/o modelo al catálogo (en n8n actualizando el Code de ese nodo y en la app en `src/data/ecuadorCars.ts` para mantener consistencia).

---

## 11. Nodos de n8n del workflow "Scraper - Merge Listings con DB"

Lista de nodos **reales** del workflow (solo los que intervienen en el flujo del scraper):

| Nodo | Función en una línea |
|------|----------------------|
| Webhook “buscar-producto-marketplace” | Recibe POST con `searchValue` y dispara la búsqueda por término. |
| Webhook “buscar-todas-las-marcas” | Recibe POST y dispara el escaneo por todas las marcas del catálogo. |
| Loop / Iteración por marcas | Para cada marca (y opcionalmente modelo), arma el término y llama a Apify. |
| Apify: Run Actor | Ejecuta el actor de Facebook Marketplace y devuelve los listings. |
| Procesar items / Split | Separa cada listing para procesarlo uno a uno (o por lotes). |
| Obtener o crear seller | Busca `scraper_sellers` por `fb_seller_id`; si no existe, inserta; devuelve `seller_id`. |
| Filtro de precio | Descarta listings con precio fuera del rango configurado. |
| Normalizar marca/modelo | Aplica reglas o llama a `normalize_text` y mapea al catálogo. |
| OpenAI: extracción de texto | Envía título/descripción al modelo y recibe marca, modelo, año, motor, etc. |
| _(No usado en este workflow)_ | Claude Vision no está en el flujo actual. |
| Supabase: Upsert scraper_vehicles | Inserta o actualiza por `url`; asocia `seller_id`. |
| (Opcional) Supabase: Update seller | Actualiza `total_listings`, `last_updated` o `location` del vendedor. |
| Responder webhook | Devuelve al cliente (app) el resumen (nuevos, actualizados, descartados). |

Los nombres de nodos son los del workflow "Scraper - Merge Listings con DB" en n8n; el orden completo del flujo está en la sección 3.

---

## 12. Problemas comunes y soluciones

| # | Problema | Causa típica | Solución |
|---|----------|--------------|----------|
| 1 | Imagen del vendedor incorrecta (no coincide con el listing) | En el workflow, `pic` se toma de **Map & tag listings** → `car.marketplace_listing_seller.pic` (Apify). Si Apify devuelve ahí la foto del listing en vez del perfil del vendedor, la imagen será incorrecta. | En el nodo que crea/actualiza `scraper_sellers`, asignar a `pic` solo el campo que venga como “seller profile image” / “seller avatar” en la respuesta de Apify. En Map & tag listings usar solo ese campo para seller_pic; no primary_listing_photo ni fotos del listing. |
| 2 | Duplicados de vehículos | Upsert no usa la URL como clave única, o se generan URLs distintas para el mismo listing. | Asegurar que el upsert en `scraper_vehicles` use `url` como clave única y que la URL sea la misma que devuelve Apify para ese listing. |
| 3 | Duplicados de vendedores | Se inserta seller sin comprobar antes por `fb_seller_id`. | Siempre hacer “buscar por fb_seller_id”; si existe, usar ese `id`; si no, insertar y usar el nuevo `id`. |
| 4 | Marca o modelo raros (ej. “dmax” en vez de “D-MAX”) | No se aplica normalización o el catálogo no tiene la variante. | Usar `normalize_text` (o lógica equivalente) y mapear al catálogo; añadir variantes en `ECUADOR_CAR_DATA` si hace falta. |
| 5 | Estadísticas de precio vacías o desactualizadas | El trigger de estadísticas no existe o falla; o los datos recién insertados no se agregan. | Revisar en Supabase que exista el trigger (o job) que actualiza `scraper_vehicle_price_statistics` tras INSERT/UPDATE en `scraper_vehicles`. Ejecutar manualmente el cálculo si es un job. |
| 6 | Webhook no responde o timeout | n8n tarda mucho (Apify + varias IAs); el cliente hace timeout. | Aumentar timeout en la app; hacer que el webhook responda rápido con “procesando” y que el trabajo pesado sea asíncrono (cola, otro workflow). |
| 7 | Listings no aparecen en la app | Filtro de región (Sierra/Costa), catálogo o filtro de precio descarta todo; o la app filtra por marca/modelo que no coincide con lo guardado. | Revisar filtros en n8n (precio, ubicación) y en la app (regionFilter, ciudad). Verificar que marca/modelo en BD coincidan con las claves de `ECUADOR_CAR_DATA`. |
| 8 | OpenAI devuelve formato incorrecto | Prompt poco claro o modelo devuelve texto libre en vez de JSON. | En **Extract vehicle especifications** el system pide "Devuelve SOLO JSON array llamado \"vehicles\""; activar `jsonOutput: true` si está disponible; en **Split Batch AI Results** validar que `row.message?.content?.vehicles` sea array y parsear con cuidado. |

---

## 13. Glosario

| Término | Significado en lenguaje simple |
|--------|---------------------------------|
| **Scraping** | Extraer datos de una página o app (aquí: listados de autos de Facebook Marketplace) de forma automática. |
| **Listing** | Un anuncio: un auto publicado en Marketplace con título, precio, fotos y vendedor. |
| **Webhook** | URL que recibe una petición (POST) para disparar un flujo; aquí, “buscar este término” o “buscar todas las marcas”. |
| **Upsert** | “Insertar si no existe; si ya existe, actualizar.” En este sistema, por URL en `scraper_vehicles` y por `fb_seller_id` en sellers. |
| **Normalización** | Unificar cómo se escriben marca y modelo (dmax → D-MAX, citroen → Citroën) para poder filtrar y calcular estadísticas. |
| **Trigger (BD)** | Acción automática que se ejecuta cuando pasa algo en la base (ej. “después de insertar un vehículo, recalcular estadísticas”). |
| **Seller / Vendedor** | La cuenta o página de Facebook que publica el anuncio; se guarda en `scraper_sellers`. |
| **PATIO / TALLER / CLIENTE** | Etiquetas que vienen del campo `scraper_sellers.location` e indican dónde está el auto o el tipo de vendedor. |
| **Scorer** | En la app, la lógica que asigna un puntaje a cada vehículo según precio, kilometraje, estado, antigüedad, etc., para destacar “oportunidades”. |
| **Catálogo (ECUADOR_CAR_DATA)** | Lista de marcas y modelos que la app (y opcionalmente el flujo) reconoce para Ecuador; usado en filtros y en el selector de búsqueda del scraper. |

---

*Documento actualizado a partir del workflow real de n8n "Scraper - Merge Listings con DB" y del código y esquema del proyecto.*
