# Próximos pasos para refinar el Scraper al máximo

Plan por fases. Lo que puedes hacer **ya** (frontend), lo que requiere **n8n + Supabase** (fase 2), y cómo encaja todo.

---

## Fase 1 — Frontend (sin tocar n8n ni esquema Supabase)

Objetivo: exprimir al máximo los datos que ya tienes y mejorar la experiencia.

| # | Acción | Estado | Beneficio |
|---|--------|--------|-----------|
| 1.1 | **Badge región (costa/sierra)** derivada de `vehicle.location` | ✅ Hecho | Ves de un vistazo si el anuncio es costa o sierra sin abrir el detalle. |
| 1.2 | **Indicador de calidad del dato** (Completo / Falta motor / Falta km) | ✅ Hecho | Priorizas listados con datos completos para comprar o contactar. |
| 1.3 | **Buscar por variante** usando el campo de búsqueda | Ya existe | El filtro "Buscar" ya busca en título, descripción, características. Escribe "Raptor" o "Platinum" y filtra. Solo conviene dejar claro en la UI que sirve también para variante. |
| 1.4 | Mejorar placeholder del buscador: "Buscar por marca, modelo o variante (ej. Raptor)" | Opcional | Refuerza que la búsqueda sirve para variantes. |

**No hace falta cambiar Supabase ni n8n.** Todo se calcula en el cliente (región desde texto de ciudad, calidad desde campos existentes).

---

## Fase 2 — Workflow n8n + (opcional) Supabase

Objetivo: que los datos que se guardan sean más ricos y comparables.

### 2.1 En el workflow de n8n

| # | Cambio | Dónde / Cómo | Prioridad |
|---|--------|----------------|-----------|
| 2.1.1 | **Extraer y guardar variante/trim** | En el nodo de IA (OpenAI): añadir en el JSON de salida un campo `trim` (ej. "Raptor", "Platinum", "XLT", "Base"). En "Match canonical" no colapsar "F-150 Raptor" a solo "F-150"; guardar trim por separado o en modelo. Si añades columna `trim` en Supabase, mapear ese campo al insertar en `scraper_vehicles`. | Alta |
| 2.1.2 | **Derivar y guardar región (costa/sierra)** | Después de tener `location_text` o ciudad: nodo Code que clasifique en "costa" o "sierra" con listas de ciudades (como en el frontend). Guardar en `scraper_vehicles.region` si añades la columna. | Alta |
| 2.1.3 | **Scrapear varias ciudades** | Parametrizar las URLs de Marketplace (no solo Cuenca): por ejemplo Guayaquil, Manta, Quito, etc. Ejecutar una búsqueda por ciudad o recibir la ciudad por body del webhook. | Alta |
| 2.1.4 | **Límites de precio configurables** | En "Filter cars by price": que el mínimo y máximo (ej. 3000 y 200000) vengan de variables del workflow o del body del webhook, no fijos. | Media |
| 2.1.5 | **Robustez en location** | En el nodo que arma el payload para guardar: usar `$json.mapped_data?.seller_location ?? $json.location_text?.text ?? null` para evitar errores si falta `location_text`. | Media |

### 2.2 En Supabase (solo si quieres persistir trim y región)

Ejecutar solo cuando vayas a guardar trim/región desde n8n.

```sql
-- Añadir columna opcional para variante/trim
ALTER TABLE public.scraper_vehicles
ADD COLUMN IF NOT EXISTS trim text;

-- Añadir columna opcional para región (costa/sierra)
ALTER TABLE public.scraper_vehicles
ADD COLUMN IF NOT EXISTS region text;

-- Opcional: índice para filtrar por región
CREATE INDEX IF NOT EXISTS idx_scraper_vehicles_region ON public.scraper_vehicles(region) WHERE region IS NOT NULL;
```

Después, en n8n, en el nodo que hace el insert/update a `scraper_vehicles`, mapear:
- `trim` ← salida de la IA (o modelo concatenado cuando sea variante conocida).
- `region` ← resultado del nodo Code que clasifica por ciudad.

No es obligatorio hacerlo todo de una vez: puedes primero solo trim, o solo región y multi-ciudad.

---

## Fase 3 — Frontend cuando existan trim y región en DB

Cuando `scraper_vehicles` tenga columnas `trim` y/o `region` y n8n las rellene:

| # | Acción | Beneficio |
|---|--------|-----------|
| 3.1 | **Filtro por variante** desde BD | Dropdown de variantes reales (Raptor, Platinum, etc.) en lugar de solo búsqueda por texto. |
| 3.2 | **Filtro por región** ya usa `vehicle.location`; si añades `region`, cambiar el filtro costa/sierra a `region = 'costa'` o `'sierra'` (más fiable que inferir por ciudad). | Comparaciones y estadísticas por región correctas. |
| 3.3 | **Estadísticas por trim** | En "Mejores oportunidades", mediana por (marca, modelo, año, trim) para no mezclar F-150 con F-150 Raptor. Requiere que las estadísticas (o la vista que las alimenta) incluyan trim. |
| 3.4 | **Estadísticas por región** | Mediana por (marca, modelo, año, región) para comparar precios costa vs sierra. |

---

## Orden sugerido para “refinar al máximo”

1. **Ya hecho (Fase 1):** badge región, indicador de calidad, notas Cuenca, doc de análisis, fix `getVehiclesByLocation`.
2. **Siguiente (Fase 2):**  
   - En n8n: extraer trim en la IA y, si puedes, guardarlo (aunque sea en un campo de texto libre al inicio).  
   - En n8n: derivar región (costa/sierra) y, si añades columna en Supabase, guardarla.  
   - Parametrizar ciudad en las URLs y scrapear al menos 2–3 ciudades (ej. Cuenca + Guayaquil + Quito).
3. **Después (Supabase):** Añadir columnas `trim` y `region` con el SQL de arriba y conectar n8n a esas columnas.
4. **Por último (Fase 3):** En el frontend, usar `trim` y `region` en filtros y en “Mejores oportunidades” como se indica arriba.

Así el scraper queda refinado al máximo: datos más ricos (trim, región, varias ciudades), comparaciones justas (sin mezclar variantes ni regiones) y mejor UX (calidad del dato, región visible, búsqueda por variante).
