# Análisis: Workflow Scraper + Módulo Frontend

Enfoque: empresario que quiere **mejores ofertas**, **base de datos precisa** (marcas/modelos/variantes) para **medias de precios fiables** y **comparaciones justas** (sin mezclar, por ejemplo, Ford F-150 con F-150 Raptor). Contexto Ecuador: **costa vs sierra** afecta el precio del mismo vehículo.

---

## 0. Aclaraciones importantes

- **No tienes backend propio:** Solo Frontend (Next.js) + Supabase. El “backend” de datos del Scraper es Supabase (tablas `scraper_vehicles`, `scraper_sellers`, `scraper_vehicle_price_statistics`) y el workflow de n8n que escribe ahí.
- **`src/services/scraper.service.ts`** no se “creó” en este análisis; **ya existía** en el proyecto. Es la **capa de servicio del frontend**: un único archivo que concentra todas las llamadas a Supabase relacionadas con el módulo Scraper (listar vehículos, filtros, estadísticas, sellers, ejecutar webhook de n8n, etc.). No es un servidor; es código que corre en el navegador y usa el cliente de Supabase. Solo se **modificó** el método `getVehiclesByLocation` para que filtre correctamente (ver más abajo).
- **Cambios en Supabase:** Los cambios hechos en el frontend **no requieren** modificar tablas ni esquema en Supabase. La variante/trim se calcula en el cliente a partir de título/descripción. Si más adelante quieres guardar trim o región en base de datos, ahí sí harían falta nuevas columnas (ver sección 3).

---

## 1. Workflow n8n – Falencias y mejoras

### 1.1 Comparación injusta: mismo “modelo” pero distinta variante (ej. F-150 vs Raptor)

**Problema:**  
- La IA extrae `brand` y `model` pero **no** variante/trim (Raptor, Platinum, XLT, etc.).  
- El catálogo `ECUADOR_CAR_DATA` tiene solo `"F-150"` para Ford.  
- En “Match canonical” se hace `nModel.includes(nm) || nm.includes(nModel)`, así que “F-150 Raptor” se matchea a “F-150” y se guarda como **modelo = "F-150"**.  
- Las estadísticas de precio (mediana, promedio) mezclan **F-150 base** con **F-150 Raptor**, que vale mucho más. Las “ofertas” y medias dejan de ser comparables.

**Recomendaciones:**  
1. **IA:** Añadir campo `trim` o `variant` en el prompt (ej. “Raptor”, “Platinum”, “XLT”, “Base”).  
2. **Persistencia:** Guardar `trim` en DB (nuevo campo en `scraper_vehicles` o concatenar en `model` tipo “F-150 Raptor”).  
3. **Catálogo:** Incluir variantes conocidas en `ECUADOR_CAR_DATA` (ej. “F-150”, “F-150 Raptor”) o usar modelo base + trim por separado.  
4. **Estadísticas:** Calcular medias/medianas por `(brand, model, year)` y, si existe, por `(brand, model, trim, year)` para no mezclar variantes.

---

### 1.2 Región (costa vs sierra) no usada para precios

**Problema:**  
- Las URLs de búsqueda están **fijas a Cuenca**:  
  `marketplace/cuenca/search/?...`  
- Solo se scrapea **una ciudad (sierra)**. No hay datos de costa.  
- En el flujo se guarda `seller_location` / `location_text` (ej. “Cuenca, Ecuador”), pero **no** se deriva ni guarda un campo **región** (costa/sierra).  
- Las estadísticas de precio son **globales**; no hay medias por región. Para un empresario, “mismo carro en costa vs sierra” es clave para decidir dónde comprar.

**Recomendaciones:**  
1. **Scraping multi-ciudad:** Parametrizar ciudad en las URLs (o varias ramas) y scrapear, por ejemplo, Guayaquil, Manta, Quito, Cuenca, etc.  
2. **Campo región:** A partir de `location_text` o ciudad, clasificar en `costa` / `sierra` (y opcionalmente `oriente`) y guardarlo en `scraper_vehicles` y/o `scraper_sellers`.  
3. **Estadísticas por región:** Incluir región en `scraper_vehicle_price_statistics` o en una vista/consulta para mediana por (brand, model, year, region).  
4. **Frontend:** Ya existe filtro “Costa / Sierra”; cuando haya datos, las medias en “Mejores oportunidades” deberían poder mostrarse por región.

---

### 1.3 Filtro de precio fijo (3.000 – 200.000)

**Problema:**  
- “Filter cars by price” usa **límites fijos** (min 3000, max 200000).  
- Vehículos muy baratos (reparar, chatarra) o muy caros (nuevos/lujo) se descartan siempre. Para un negocio que también compra alto valor o proyectos, 200k puede quedar corto.

**Recomendación:**  
- Hacer los límites **configurables** (variables del workflow o input del webhook) o ampliar el rango y marcar con tags (ej. “PRECIO_ALTO”) en lugar de descartar.

---

### 1.4 Respuesta de error y tipado

**Problema:**  
- En “Vehicles Listings Data”, el campo **location** del vehículo se asigna con `$json.location_text.text`. Si el listing no trae `location_text`, puede romperse o guardar `undefined`.  
- Algunos nodos asumen estructuras fijas de Facebook; conviene defensas (optional chaining, valores por defecto).

**Recomendación:**  
- Usar `$json.mapped_data?.seller_location ?? $json.location_text?.text ?? null` (o similar) y validar que los campos obligatorios existan antes de guardar.

---

### 1.5 Resumen de mejoras sugeridas en el workflow

| Área              | Acción concreta |
|-------------------|------------------|
| Variantes         | IA: extraer `trim`/`variant`; DB: guardar trim; catálogo: incluir variantes; estadísticas: por trim cuando exista. |
| Región            | Scrapear varias ciudades; clasificar costa/sierra; guardar región; estadísticas por región. |
| Precio            | Límites configurables o por input; evitar descarte duro si se quieren ofertas “premium”. |
| Robustez          | Validar y usar fallbacks en `location` y otros campos antes de insert/update. |

---

## 2. Frontend (módulo Scraper) – Falencias y mejoras

### 2.1 Flujo de usuario actual

- **`/scraper`** → redirige a **`/scraper/todo`**.  
- **Todo:** Listado con filtros (marca, modelo, año, ciudad, fecha, región, tracción, orden). Barra de búsqueda manual que llama al webhook. Paginación.  
- **Búsqueda manual:** Solo input de término + catálogo (marca/modelo) para armar la búsqueda.  
- **Mejores oportunidades:** Panel que compara vehículos con mediana de precio (brand+model+year) y muestra “ofertas”.

El flujo es claro; el problema principal es que **los datos de fondo** (workflow) no tienen trim ni región, por lo que las “mejores oportunidades” y las medias pueden ser engañosas.

---

### 2.2 Filtro “ciudad” y “región”

- **Ciudad:** Se rellena con `scraper_vehicles.location` (texto libre de Facebook, ej. “Cuenca, Ecuador”).  
- **Región (Costa / Sierra):** Se filtra por listas `SIERRA_CITIES` / `COAST_CITIES` sobre `scraper_vehicles.location`.  
- **Limitación:** Hoy solo se scrapea Cuenca, así que **todas** las ciudades en el filtro son sierra. El filtro “Costa” no mostrará resultados hasta que el workflow scrapee costa.

**Recomendación:** Mostrar una nota corta en la UI: “Los datos actuales provienen de búsquedas en Cuenca; el filtro por región se enriquecerá cuando se agreguen más ciudades.”

---

### 2.3 Diferencia entre filtrar por `seller.location` y por `vehicle.location` (y por qué importa)

En el esquema (`supabase-schema.md`):

| Tabla | Columna | Tipo | Significado |
|-------|---------|------|-------------|
| **scraper_vehicles** | `location` | `text` | **Ubicación geográfica del anuncio** (ej. "Cuenca, Ecuador"). La rellena el workflow con el texto que viene de Facebook. |
| **scraper_sellers** | `location` | `USER-DEFINED` (enum) | **Tipo de vendedor**: `patio`, `taller`, `cliente`. Lo infiere el workflow por palabras en la descripción. |

- **Antes (mal):** `getVehiclesByLocation('patio')` filtraba por **`scraper_vehicles.location`**. Ahí solo hay ciudad ("Cuenca", "Guayaquil"), nunca "patio". La consulta **nunca devolvía resultados**; el método estaba roto.
- **Ahora (bien):** Se filtra por **`scraper_sellers.location`** (join `scraper_sellers!inner` y `eq('seller.location', location)`). Así obtienes “vehículos cuyo **vendedor** es patio/taller/cliente”.

Para listar por **tipo de vendedor** se usa **seller.location**. Para **ciudad o región** (Cuenca, costa, sierra) se usa **vehicle.location** (ya lo hace el filtro de ciudad/región en el frontend).

---

### 2.4 Trim / variante en listado y oportunidades

- En el frontend ya se extrae **trim** en `opportunitiesScorer` (`extractTrim`) para scoring.  
- No se muestra en la tabla “Todo” ni como filtro, y las estadísticas de precio no distinguen variante.

**Recomendaciones:**  
1. Mostrar **trim** (o “Variante”) en la tabla de vehículos y en el modal de detalle (usando `extractTrim` del título/descripción).  
2. Opcional: filtro por trim cuando haya muchos resultados de la misma marca/modelo.  
3. Cuando el backend guarde trim, usar **model + trim** (o solo trim) en la clave de estadísticas para “Mejores oportunidades”.

---

### 2.5 Mejores oportunidades y región

- **getVehiclesForOpportunities** excluye ciudades de la costa (`COAST_CITIES`) para quedarse con “sierra”.  
- Tiene sentido para “ofertas en sierra” cuando haya datos de ambas regiones. Hoy, al solo tener Cuenca, el filtro no cambia nada.  
- Cuando existan datos de costa y sierra, conviene que el usuario pueda elegir “Ofertas en costa” / “Ofertas en sierra” / “Todas” y que las medianas se calculen por región.

---

### 2.6 Resumen de mejoras en frontend

| Área           | Acción |
|----------------|--------|
| getVehiclesByLocation | Filtrar por `seller.location` (patio/taller/cliente), no por `vehicle.location`. |
| Trim / variante | Mostrar trim en tabla y detalle; opcional filtro; cuando el backend lo soporte, usarlo en estadísticas. |
| Región/ciudad  | Nota en UI: “Datos actuales desde Cuenca; más ciudades próximamente.” |
| Oportunidades  | Cuando haya región en DB, permitir filtrar ofertas por costa/sierra y calcular medias por región. |

---

## 3. Resumen: qué se hizo en código y cómo mejora el flujo

Todo lo siguiente son cambios **solo en el frontend** (y en este doc). El workflow de n8n y las tablas de Supabase no se tocaron.

| Cambio | Dónde | Cómo mejora el Scraper / la app |
|--------|--------|----------------------------------|
| **getVehiclesByLocation** | `scraper.service.ts` | Antes no devolvía nada al filtrar por "patio"/"taller"/"cliente" porque filtraba por la columna equivocada. Ahora filtra por el **tipo de vendedor** (seller.location), así que si en algún momento usas esa función (ej. vista “Solo patios” o “Solo clientes”), sí obtendrás resultados. |
| **Mostrar variante/trim** | Tabla “Todo” + modal de detalle | No cambia lo que se scrapea; hace que **veas** en la app si un anuncio parece ser Raptor, Platinum, etc. (se infiere del título/descripción). Ayuda a no comparar a ciegas un F-150 base con un Raptor. Cuando el workflow guarde trim en DB, se puede pasar a usar ese dato. |
| **Nota “datos desde Cuenca”** | Páginas Todo y Búsqueda manual | Deja claro que hoy todo viene de Cuenca y que el filtro región se aprovechará cuando se agreguen más ciudades en n8n. Evita confusión. |
| **Documento de análisis** | `docs/ANALISIS_SCRAPER_WORKFLOW_Y_FRONTEND.md` | Centraliza falencias del workflow y del frontend, y recomendaciones (trim, región, precios, robustez) para que puedas priorizar cambios en n8n y, si quieres, en Supabase. |

El **scraper en sí** (n8n) no se modificó; lo que mejora es que la **app que consume esos datos** filtra bien, muestra más información (trim) y comunica mejor las limitaciones (solo Cuenca).

---

## 4. ¿Hay que hacer cambios en Supabase?

**Con lo implementado hasta ahora: no.** No hace falta tocar tablas ni esquema.

- **Trim/variante:** Se calcula en el frontend con `extractTrim()` sobre título y descripción. No se guarda en ninguna tabla.
- **getVehiclesByLocation:** Usa columnas que ya existen (`scraper_sellers.location`).
- **Filtros ciudad/región:** Usan `scraper_vehicles.location` (texto) y las listas de ciudades en el servicio; no requieren nuevas columnas.

**Si más adelante quieres** que trim o región queden guardados y que las estadísticas se calculen por trim/región, entonces sí haría falta en Supabase (y en el workflow):

- En **scraper_vehicles**: por ejemplo una columna `trim` (text) y/o `region` (text o enum: 'costa', 'sierra').
- En **scraper_vehicle_price_statistics** (o una vista/nueva tabla): incluir trim y/o region en la agrupación para medianas por (brand, model, year, trim) o por región.

Eso sería una siguiente fase; no es obligatorio para lo que ya está hecho.

---

## 5. Próximos pasos sugeridos

1. **Workflow (n8n):** Ajustar prompt de IA (trim), catálogo y guardado de trim; parametrizar ciudades y guardar región; revisar límites de precio y validaciones.  
2. **Supabase (solo si quieres persistir trim/región):** Añadir columna `trim` y/o `region` en `scraper_vehicles`; extender o crear estadísticas por trim/región.  
3. **Frontend:** Cuando existan datos de trim/región en DB, usar esos campos en filtros y en “Mejores oportunidades”.

Este documento se puede usar como checklist para priorizar cambios en el workflow y en el módulo Scraper.

**Roadmap detallado por fases:** ver **`docs/PROXIMOS_PASOS_SCRAPER.md`** (qué hacer en frontend ya, qué en n8n + Supabase, y en qué orden).
