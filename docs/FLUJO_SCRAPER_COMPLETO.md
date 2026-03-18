# Flujo completo del Scraper — Con los nuevos cambios integrados

Documento para quien quiere entender **cómo funciona todo de punta a punta** y por qué el sistema está preparado para ayudar a encontrar **las mejores opciones de compra** sin las falencias anteriores. Incluye cómo se manejan los datos “sucios” de Facebook Marketplace (mal escritos, incompletos, solo en descripción).

---

## 1. Objetivo: mejores opciones de compra

El flujo está pensado para alguien que:

- Quiere **comparar precios justos** (mismo tipo de vehículo, no mezclar F-150 base con F-150 Raptor).
- Quiere saber si un listado es **costa o sierra** (precios distintos en Ecuador).
- Quiere ver **variante/trim** (Raptor, Platinum, XLT) para no comparar peras con manzanas.
- Quiere **priorizar listados con datos completos** (motor, km, descripción) y detectar patios/talleres vs clientes.
- Quiere **buscar por texto** (marca, modelo, variante) y que siga funcionando aunque escriban con tildes o errores leves.

Todo lo que se describe abajo está alineado con eso.

---

## 2. Flujo de punta a punta (con los cambios actuales)

### 2.1 Facebook Marketplace → n8n

1. **Trigger:** El usuario en el frontend (o un cron) dispara el webhook de n8n con un término de búsqueda (ej. “Ford F-150”, “Vitara”).
2. **Búsqueda:** n8n arma la URL de Marketplace (hoy típicamente Cuenca; luego se puede parametrizar ciudad).
3. **Listados crudos:** Se obtienen listados de Facebook (título, descripción, fotos, precio, ubicación, etc.) **sin usar cookies de sesión**: el scraper no envía cookies para evitar caducidad y reducir costos; datos detallados del vendedor (nombre, foto) pueden no estar disponibles. Facebook a veces no envía `location_text`, o lo envía raro.
4. **Filtro de precio:** Se descartan precios fuera de rango (ej. &lt; 3000 o &gt; 200000). Los límites son configurables en el workflow para no descartar de forma dura si se quieren ofertas premium.

### 2.2 IA (OpenAI) en n8n — “Extract vehicle specifications”

- **Entrada:** Título + descripción (y lo que el workflow le pase) del listado.
- **Salida estructurada:** marca, modelo, **trim** (variante: Raptor, Platinum, XLT, etc.), motor, transmisión, kilometraje, teléfono, extras, características.
- **Por qué importa:** La gente escribe todo en el título o solo en la descripción; la IA lee ambos y devuelve campos normalizados. Así aunque no pongan “motor 2.0” en un campo dedicado, si está en la descripción se extrae.

### 2.3 “Filter” y exclusión

- Se marcan como excluidos listados que no cumplan criterios (sin marca/modelo válidos, etc.).
- Solo siguen los no excluidos.

### 2.4 “Split Batch AI Results” y mapeo a objeto por vehículo

- Cada vehículo lleva **trim** en el objeto que se pasa al siguiente nodo (`trim: vehicle.trim ?? null`).

### 2.5 “Map & tag listings” (nodo Code) — Corazón del enriquecimiento

- **Filtro de URL:** Se descartan ítems sin `car.listingUrl` para no enviar nunca un listing con `url` null a la base de datos (evita el error de constraint en `scraper_vehicles`).
- **Kilometraje:**  
  - Se usa primero el de la IA; si no hay, el del odómetro de Facebook.  
  - `parseMileage()` acepta número o texto con puntos/espacios y extrae el número (ej. “120.000 km” → 120000). Así se toleran formatos raros.
- **Ubicación del anuncio (ciudad):**  
  - `seller_location = car.location_text?.text ?? null`.  
  - Si Facebook no manda `location_text`, no se rompe; queda `null`.
- **Región (costa/sierra):**  
  - `getDerivedRegion(seller_location)` clasifica por listas de ciudades (COAST / SIERRA).  
  - Se guarda en `mapped_data.region` ('costa' | 'sierra' | null).
- **Trim:**  
  - Viene de la IA: `openAiData.trim ?? null` en `openai_extracted` y en `mapped_data`.
- **Location (tipo de vendedor):**  
  - Se calcula con regex sobre descripción: “patio” (crédito, financiamiento, cuotas), “taller” (reparar, chocado), si no “cliente”.
- **Tags:** PRECIO_BAJO, PRECIO_ALTO, PATIO, MECANICA según contenido del anuncio.
- **Robustez:**  
  - Optional chaining en todo; `primary_listing_photo?.image?.uri`; arrays (extras, características) se limpian y pueden quedar `null` si están vacíos.

### 2.6 “Vehicles Listings Data (Set)” — Payload hacia Supabase

- Se arma el objeto que después se inserta/actualiza en `scraper_vehicles`.
- **seller_id:** Se envía `null` (ya no se usa la tabla `scraper_sellers`).
- **location (ciudad):**  
  `$json.mapped_data?.seller_location ?? $json.location_text?.text ?? ''`  
  Así no falla si falta `location_text`.
- **trim** y **region** se mapean desde `mapped_data` a las columnas de la tabla.

### 2.7 Supabase

- **scraper_vehicles:** Incluye columnas `trim` (text) y `region` (text), con índices para filtrar por región/trim. La columna `seller_id` se envía en `null` (ya no se usa la tabla de vendedores).
- **scraper_vehicle_price_statistics:** Medianas/precios por marca, modelo, año (por ahora sin trim ni región; es mejora futura).

### 2.8 Nodos de vendedores (obsoletos — deshabilitados)

La tabla **scraper_sellers** se eliminó; el scraper ya no guarda ni consulta vendedores. En el workflow siguen existiendo nodos que antes servían para eso; están **deshabilitados** para que no se ejecuten ni fallen. Si los ves en n8n, puedes dejarlos deshabilitados o borrarlos.

| Nodo | Función que tenía | Por qué ya no sirve |
|------|-------------------|----------------------|
| **Sellers Data** | Armaba una fila por vendedor (fb_seller_id, nombre, location patio/taller/cliente, is_dealer, badges, foto, rating, etc.) a partir de Map & tag listings. | Esos datos iban a `scraper_sellers`, tabla eliminada. Además sin cookies ya no llegan bien nombre/foto/rating del vendedor. |
| **Get sellers already con db** | Consultaba `scraper_sellers` por `fb_seller_id` para saber qué vendedores ya estaban en la DB. | La tabla no existe; la consulta fallaría. |
| **Filter mapped data by existing sellers1** | Filtraba los ítems de Map & tag listings para quedarse solo con los cuyo vendedor ya estaba en DB; además normalizaba marca/modelo con el catálogo Ecuador. Su salida antes iba a Vehicles Listings Data. | Depende de Get sellers ya con db y de `mapped_data.seller_id` (quitado). La conexión a Vehicles Listings Data se eliminó; solo Map & tag alimenta ahora. |
| **Get many rows** | Traía todos los registros de `scraper_sellers` para comparar con Sellers Data. | Tabla eliminada. |
| **Code in JavaScript** | Filtraba Sellers Data para dejar solo vendedores nuevos (no presentes en Get many rows) y preparar los ítems para Create a row. | Depende de Get many rows y Sellers Data; todo el flujo de sellers está obsoleto. |
| **HTTP Request** (junto a Create a row) | Descargaba la foto del vendedor (seller_pic) para guardarla. | Formaba parte del flujo de crear filas en scraper_sellers. |
| **Create a row** | Insertaba un nuevo vendedor en `scraper_sellers`. | La tabla no existe. |
| **All sellers** | Consultaba `scraper_sellers` (por listing_id / fb_seller_id). | Tabla eliminada. |
| **All true sellers** | Consultaba `scraper_sellers` por `mapped_data.seller_id`. | Tabla eliminada. |
| **Merge with seller pic** | Cruzaba listados con vendedores ya en DB y añadía seller_db_id y seller_pic al ítem. | Depende de All sellers / All true sellers. |
| **Update a row** | Actualizaba rating y rating_count del vendedor en `scraper_sellers`. | Tabla eliminada. |

Resumen: todo ese flujo servía para **mantener una tabla de vendedores** (patio/taller/cliente, foto, rating) y **filtrar o enriquecer listados** según si el vendedor ya existía. Al quitar la tabla y dejar de usar cookies, esos nodos ya no aportan; el flujo útil es **Map & tag listings → Vehicles Listings Data → Save Listings to DB** (y las ramas de imágenes).

---

## 3. Frontend — Cómo se usa todo

### 3.1 Listado “Todo el inventario” (`/scraper/todo`)

- **Filtros:** Marca, modelo, motor, **variante (trim)**, año, ciudad, **región (costa/sierra)**, fecha, tracción, orden.
- **Región:** Si eliges Costa o Sierra, la query usa la columna `region` ('costa' | 'sierra'). Los listados antiguos sin `region` no aparecen en esos filtros hasta que se re-llenen (re-scrape o backfill).
- **Trim:** Si eliges una variante, se filtra por columna `trim`. Las opciones del dropdown salen de los trims realmente presentes en BD (cascada).
- **Búsqueda por texto:** Busca en título, descripción, marca, modelo, **trim**, características y extras.  
  - **Normalización de acentos:** Se usa `normalize('NFD')` y se quitan diacríticos, así “Raptor” encuentra “Ráptor” y “Guayaquil” encuentra “Guayaquil”.
- **Tracción:** Se infiere del texto (título + descripción + características) con regex (4x4, AWD, 4WD, FWD, RWD) y se filtra en cliente.

### 3.2 Qué se muestra en cada fila

- **Variante:** `vehicle.trim ?? extractTrim(title + description + characteristics)`.  
  Si n8n guardó trim (IA), se usa ese; si no, se deriva en frontend. Tooltip indica “desde BD” o “detectado del texto”.
- **Región:** `vehicle.region ?? getDerivedRegion(vehicle.location)`.  
  Prioridad a la columna `region`; si no hay, se deriva por ciudad (listas costa/sierra). Tooltip “desde BD” o “derivada de la ciudad”.
- **Calidad del dato:** “Completo” / “Falta motor” / “Falta km” / “Incompleto” según motor, kilometraje, descripción e imágenes.
- **Ubicación:** Ciudad (location) y badge Costa/Sierra.

### 3.3 Mejores oportunidades

- **Origen de datos:** `getVehiclesForOpportunities()` devuelve vehículos con año, excluyendo por **nombre de ciudad** de costa (para quedarse con sierra). Cuando todos los registros tengan `region`, se puede pasar a filtrar por `region = 'sierra'`.
- **Scoring:** Se usa **trim de BD si existe**, si no `extractTrim(title + description + …)` para etiquetas como “Trim Premium” y para agrupar.
- **Comparación con mediana:** La mediana de precio es por (marca, modelo, año). Todavía no por trim; cuando las estadísticas incluyan trim, las “ofertas” serán aún más justas (F-150 vs F-150 Raptor separados).

### 3.4 Tipo de vendedor (patio / taller / cliente)

- **getVehiclesByLocation('patio' | 'taller' | 'cliente')** filtra por **seller.location** (tabla `scraper_sellers`), no por la ciudad del vehículo. Así “Solo patios” o “Solo clientes” funciona correctamente.

---

## 4. Cómo se abordan las falencias anteriores

| Antes | Ahora |
|-------|--------|
| No había variante/trim; F-150 y F-150 Raptor se mezclaban en estadísticas. | IA extrae **trim**; se guarda en BD; filtro y vista usan trim (BD o derivado). Comparación más justa. |
| Región (costa/sierra) no se guardaba ni filtraba bien. | Se **deriva en n8n** por ciudad y se guarda en **region**; filtro Costa/Sierra usa la columna; en tabla se muestra región (BD o derivada). |
| location del vehículo podía romperse si faltaba `location_text`. | Se usa **seller_location** con fallback: `mapped_data?.seller_location ?? location_text?.text ?? ''`. |
| Trim/variante solo se podía “adivinar” en frontend. | **Trim en BD** + fallback por texto en toda la app (tabla, modal, comparador, scorer). |
| Búsqueda por variante solo por texto exacto. | Búsqueda en **trim**, título, descripción, etc., con **normalización de acentos**. |
| No se veía calidad del dato (falta motor/km). | **Indicador de calidad** (Completo / Falta motor / Falta km / Incompleto) en tabla. |

---

## 5. Facebook Marketplace: datos aleatorios y cómo se toleran

- **Escriben mal / tildes:**  
  La búsqueda en frontend **normaliza acentos** (NFD + quitar diacríticos). “Raptor” y “Ráptor” dan el mismo resultado. La IA en n8n también suele entender variaciones.

- **Datos solo en la descripción:**  
  La IA recibe **título + descripción** (y lo que el workflow agregue). Motor, km, trim, etc. se extraen de todo ese texto. En frontend, trim/tracción/calidad usan título, descripción y características.

- **Se olvidan de poner cosas:**  
  - Si no hay motor o km, el listado **sigue entrando**; no se descarta.  
  - Se muestra **“Falta motor”** o **“Falta km”** en calidad del dato para priorizar listados completos.  
  - En scoring de oportunidades, sin km o año el score de kilometraje se neutraliza (50); no se excluye el vehículo.

- **Kilometraje en formatos raros:**  
  En n8n, `parseMileage()` acepta número o string con puntos/espacios y extrae dígitos. “120.000”, “120 000”, “120000 km” se normalizan.

- **Ubicación faltante o rara:**  
  - `location_text` puede no venir: se usa `seller_location` con fallbacks y no se rompe el flujo.  
  - Si no hay ciudad, `region` queda `null`; en frontend `getDerivedRegion(null)` devuelve `null` y no se muestra badge de región.

- **Características/extras vacíos o sucios:**  
  En “Map & tag listings” se **limpian** arrays/objetos; si al final están vacíos se guardan como `null`. En frontend se usa `characteristics?.join(' ')` y similares para no romper.

- **Patio/taller/cliente:**  
  Se infiere por **palabras en la descripción** (crédito, reparar, etc.). Si no coincide con nada, se deja “cliente”. No se exige que Facebook envíe un campo específico.

---

## 6. Verificación: qué está cubierto y qué es siguiente paso

### Hecho y estable

- Trim extraído por IA, guardado en BD, mostrado y filtrado en frontend (con fallback por texto).
- Región derivada en n8n, guardada en BD, filtro Costa/Sierra por columna, mostrada en tabla (con fallback por ciudad).
- Robustez en n8n: `seller_location`/location con fallbacks; parseMileage; optional chaining.
- Frontend: filtros por trim y región; búsqueda con normalización de acentos; calidad del dato; getVehiclesByLocation por seller.
- Scorer de oportunidades usa trim de BD cuando existe.

### Mejoras opcionales (no bloquean el flujo)

- **Estadísticas por trim:** Que `scraper_vehicle_price_statistics` (o una vista) incluya trim para mediana por (marca, modelo, año, trim). Así “Mejores oportunidades” no mezcla variantes en la mediana.
- **Estadísticas por región:** Mediana por (marca, modelo, año, región) para comparar costa vs sierra.
- **getVehiclesForOpportunities:** Cuando todos (o la mayoría) tengan `region`, filtrar por `region = 'sierra'` en lugar de solo excluir por nombre de ciudad.
- **Multi-ciudad en n8n:** Parametrizar ciudad en las URLs y scrapear varias (Guayaquil, Quito, Cuenca, etc.) para llenar costa y sierra.
- **Límites de precio:** Que min/max vengan de variables o del body del webhook.

### Casos límite asumidos

- **Sin marca/modelo válidos:** El workflow puede marcar el ítem como excluido; no llega a BD. Es comportamiento esperado.
- **Precio fuera de rango:** Se filtra en “Filter cars by price”; no se guarda. Ajustando los límites se puede incluir más.
- **Listados muy incompletos:** Entran a BD; se muestran con “Incompleto” o “Falta motor”/“Falta km” para que el usuario decida.

---

## 7. Resumen en una frase

**Flujo actual:** Facebook → n8n (IA con trim, región por ciudad, kilometraje y location robustos) → Supabase (trim y region guardados) → frontend (filtros por variante y región, búsqueda con acentos normalizados, calidad del dato, mejores oportunidades usando trim cuando exista).  
Así se reducen las falencias anteriores y se toleran mejor los datos aleatorios de Marketplace; las comparaciones son más justas (variante y región) y la experiencia está lista para cuando se agreguen estadísticas por trim/región y más ciudades de scraping.
