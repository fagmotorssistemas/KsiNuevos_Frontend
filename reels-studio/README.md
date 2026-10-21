# K-Si Reels Studio

Reels con **Gemini como director de marketing digital**:

```
clips crudos del asesor
   │
   ├─ AssemblyAI ──► palabras con tiempo exacto (+ keyterms del carro: marca, modelo, versión)
   │
   ├─ Gemini (ve los clips + lee la transcripción) ──► PLAN CREATIVO (JSON)
   │     · qué tramos usar y en qué orden (gancho → presentación → datos → confianza → CTA)
   │     · qué gráfico va en cada momento y con qué texto
   │     · dónde está en el cuadro lo que se señala (volante, pantalla, rines…) → zoom + mira
   │     · correcciones de la transcripción ("Cebrol eTriBlaser" → "Chevrolet Trailblazer")
   │
   ├─ Gemini (2ª pasada sobre cuadros fijos) ──► caja exacta de cada objeto señalado
   │
   └─ Remotion ──► MP4 vertical 1080×1920 con gráficos 3D, subtítulos karaoke y efectos de sonido
```

Gemini **no dibuja**: elige piezas de un catálogo y las llena con datos. Así el resultado es
consistente, se ve con la marca de K-Si y se puede corregir a mano (el plan es un JSON legible).

## Catálogo de gráficos

| Tipo | Cuándo | Qué hace |
|---|---|---|
| `hook_text` | primeros 0–2 s | Palabras que golpean una a una; las `*marcadas*` en bloque rojo |
| `title_3d` | al presentar el carro | Modelo en texto 3D metálico (three.js), marca arriba, año en bloque rojo 3D |
| `feature_callout` | se ve una característica | Zoom al objeto (lo sigue si la cámara se mueve) + mira + tarjeta 3D con ícono |
| `spec_counter` | un dato numérico | Número que cuenta hacia arriba con extrusión 3D ("128.000 KM") |
| `spec_chips` | datos rápidos | Fichas que entran en cascada ("2.8 DIÉSEL · AUTOMÁTICO · 4x4") |
| `feature_list` | el asesor enumera | Lista que se marca con checks |
| `price_tag` | se dice precio/cuota | Etiqueta que cae y se balancea |
| `cta_end` | cierre | "COMENTA <PALABRA>" en 3D + promesa + logo |

Además, siempre: subtítulos karaoke (cifras y palabras clave en bloque rojo), transiciones
(flash, whip, zoom, glitch), movimiento de cámara suave, barra de progreso, logo y SFX.

Reglas que **no** se le dejan a Gemini (`src/plan/timeline.ts`): cortes ajustados a límites de
palabra, un solo gráfico grande a la vez, subtítulos ocultos cuando el gráfico ya dice lo mismo,
subtítulos al lado contrario de la tarjeta, zoom sin bordes vacíos.

## Uso

```bash
cd reels-studio
npm install

# Variables
export GEMINI_API_KEY=...            # el mismo de la app
export ASSEMBLYAI_API_KEY=...        # el mismo de la app
export GEMINI_DIRECTOR_MODEL=gemini-3.8-flash   # opcional (p. ej. gemini-3.1-pro-preview)

# Reel completo desde una carpeta de clips (en orden de nombre)
npx tsx pipeline/run.ts --name trailblazer-2019 --vehicle vehiculo.json --clips ./clips/trailblazer

# Retocar el plan a mano y volver a renderizar (reutiliza transcripción y plan)
npx tsx pipeline/run.ts --name trailblazer-2019 --vehicle vehiculo.json --clips ./clips/trailblazer

# Pedirle a Gemini un plan nuevo
npx tsx pipeline/run.ts ... --replan

# Solo cuadros sueltos para revisar diseño (rápido)
npx tsx pipeline/run.ts ... --stills 30,180,400 --scale 0.5

# Editor visual de Remotion
npm run studio
```

`vehiculo.json` (sale del inventario):

```json
{
  "marca": "Chevrolet",
  "modelo": "Trailblazer",
  "anio": 2019,
  "motor": "2.8 diésel",
  "transmision": "Automática",
  "traccion": "4x4",
  "kilometraje": 128000,
  "precio": "$24.990",
  "equipamiento": ["Volante multifunción", "Cámara de retro"],
  "palabraClave": "Trailblazer"
}
```

Todo queda en `out/<name>/`: `transcripts.json`, `plan.gemini-raw.json`, `plan.json`, `props.json`, `reel.mp4`.

## Muestra incluida

`examples/trailblazer/` usa el video de Felipe (Chevrolet Trailblazer 2019) cortado en 7 clips.
El `plan.demo.json` está **escrito a mano** con el mismo formato que devuelve Gemini, y la
transcripción (`transcripts.local.json`) salió de un Whisper local, no de AssemblyAI. Sirve
para ver el estilo; el video original ya tenía subtítulos quemados, por eso se ven debajo.

```bash
./examples/trailblazer/make-clips.sh
npx tsx pipeline/render-plan.ts --plan examples/trailblazer/plan.demo.json \
  --transcripts examples/trailblazer/transcripts.local.json --out out/trailblazer-muestra.mp4
```

## Render en producción

El render necesita Chromium + ffmpeg y tarda más que el límite de una función de Vercel, así que
corre aparte: Remotion Lambda (AWS) o un servidor/worker con este proyecto. El texto 3D usa
WebGL por software (`swangle`), así que no hace falta GPU. Remotion es gratis para equipos
pequeños; para empresas más grandes requiere licencia (remotion.dev/license).

Los clips pueden ser URLs firmadas de Supabase Storage (`src` acepta `https://…`).
