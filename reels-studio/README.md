# K-Si Reels Studio

Reels con **Claude como director de marketing digital** (ver [Director: Claude](#director-claude)):

```
clips crudos del asesor
   │
   ├─ AssemblyAI ──► palabras con tiempo exacto (+ keyterms del carro: marca, modelo, versión)
   │
   ├─ Director (ve los clips + lee la transcripción) ──► PLAN CREATIVO (JSON)
   │     · qué tramos usar y en qué orden (gancho → presentación → datos → confianza → CTA)
   │     · qué gráfico va en cada momento y con qué texto
   │     · dónde está en el cuadro lo que se señala (volante, pantalla, rines…) → zoom + mira
   │     · correcciones de la transcripción ("Cebrol eTriBlaser" → "Chevrolet Trailblazer")
   │
   ├─ Director (2ª pasada sobre cuadros fijos) ──► caja exacta de cada objeto señalado
   │
   └─ Remotion ──► MP4 vertical 1080×1920 con gráficos 3D, subtítulos karaoke y efectos de sonido
```

**Modo cine** (por defecto, `look: cine`): franjas negras que se abren como un telón en el primer
instante, grano de película, viñeta, color de cine, logo en blanco dentro de la franja, títulos grandes
con textos pequeños muy espaciados y líneas finas de acento. Piezas en `src/graphics/cine/`. El lenguaje
anterior (rebotes, cajas de color) sigue disponible con `render-plan.ts --look social`.

**Animación dirigida por Claude** (campos del plan; ver DIRECCIÓN DE ANIMACIÓN en `pipeline/director-prompt.ts`):

| Campo | Qué decide Claude | Cómo se ve |
| --- | --- | --- |
| `teaser` | 2–4 instantes muy visuales del material | Adelanto de 0.4 s cada uno antes de que hable el asesor (sin voz, con el gancho encima) |
| `hookStyle` | `golpe`, `revelado`, `cruce` o `enfoque` | Cómo entra el texto del gancho: palabra por palabra con sacudón, desde detrás de una línea, desde los dos lados, o de borroso a nítido |
| `cuts[].transitionIn` | `corte`, `whip`, `zoom`, `flash`, `barrido` | Seco, barrido con desenfoque, zoom de impacto, destello de luz cálida, franja de color de marca (camionetas: solo corte, zoom, whip) |
| `cuts[].energy` | 1 calmado · 2 normal · 3 impacto | Velocidad del acercamiento continuo y golpes de cámara en las palabras clave |
| `brillo` (gráfico) | Tomas donde el auto llena el cuadro | Reflejo de luz que cruza la carrocería, con un destello |
| `spec_counter.variant` | `medidor` o `numero` | Medidor con aguja (potencia, torque, velocidad, cilindrada) o número que cuenta |

El director **no dibuja**: elige piezas de un catálogo y las llena con datos. Así el resultado es
consistente, se ve con la marca de K-Si y se puede corregir a mano (el plan es un JSON legible).

## Catálogo de gráficos

| Tipo | Cuándo | Qué hace |
|---|---|---|
| `hook_text` | primeros 0–2 s | Palabras que golpean una a una; las `*marcadas*` en bloque rojo |
| `title_3d` | al presentar el carro | Modelo en texto 3D metálico (three.js), marca arriba, año en bloque rojo 3D |
| `feature_callout` | se ve una característica | Zoom al objeto (lo sigue si la cámara se mueve) + mira + tarjeta 3D con ícono |
| `spec_counter` | un dato numérico | Número que cuenta hacia arriba ("128.000 KM"), o medidor con aguja (`variant: medidor`) |
| `spec_chips` | datos rápidos | Fichas que entran en cascada ("2.8 DIÉSEL · AUTOMÁTICO · 4x4") |
| `feature_list` | el asesor enumera | Lista que se marca con checks |
| `price_tag` | se dice precio/cuota | Etiqueta que cae y se balancea |
| `cta_end` | cierre | "COMENTA <PALABRA>" en 3D + promesa + logo |
| `sticker` | 1–2 a mitad del Reel | Burbuja de interacción ("Guárdalo", "Comenta", "Compártelo") que late como botón |
| `brillo` | el auto llena el cuadro | Reflejo de luz que cruza la carrocería (puede coincidir con otro gráfico) |

Claude adapta el tono al **tipo de vehículo** (SUV, sedán, camioneta, deportivo, hatchback, van;
la web lo saca de `type_body` del inventario) y elige uno de 6 **estilos de subtítulos**
(`captionStyle`), sin repetir los de los últimos Reels. Todos usan rojo, amarillo y blanco:

| Estilo | Tipografía | Animación | Para |
|---|---|---|---|
| `impacto` | Montserrat Black | Karaoke; palabra clave en bloque rojo | SUV, comodín |
| `velocidad` | Russo One inclinada | Barrido con desenfoque y estela roja | Deportivos |
| `elegante` | Bebas Neue espaciada | Sube suave; línea roja que crece | Sedanes |
| `robusto` | Archivo Black | Sello rojo que cae | Camionetas |
| `caja` | Poppins | Caja amarilla que salta de palabra en palabra | Hatchbacks, público joven |
| `palabra` | Teko gigante | Una palabra a la vez, con rebote | Mucha energía |

**Camionetas** (`categoria: camioneta`) usan su propio diseño (`theme: offroad`, calcado de un Reel
de referencia de la Ranger): títulos naranjas rústicos con volumen y desgaste, etiquetas tipo escáner
con esquinas, barro en el gancho, números héroe (con personitas si son ocupantes), caja de comentario
que se escribe sola y firma final con huella de llanta; color cálido, viñeta y reencuadre cada ~2 s.
Claude sigue un arco fijo de 7 bloques (gancho → nombre → motor → interior → espacio/carga → marca →
CTA). Piezas en `src/graphics/offroad/`; para probarlo con un plan: `render-plan.ts --theme offroad`.

Además, siempre: gancho animado desde el cuadro 0 (con destello y zoom), golpes de cámara en las
palabras clave, transiciones cortas (flash, whip, zoom, glitch), movimiento de cámara suave, barra
de progreso, logo y SFX.

Reglas que **no** se le dejan a Claude (`src/plan/timeline.ts`): cortes ajustados a frases
completas, **silencios de más de 0,4 s dentro de una toma se quitan** (corte seco con el encuadre
alternado para disimularlo), un solo gráfico grande a la vez, stickers solo en los huecos,
subtítulos ocultos cuando el gráfico ya dice lo mismo, subtítulos al lado contrario de la tarjeta,
zoom sin bordes vacíos.

## Uso

```bash
cd reels-studio
npm install

# Variables (o en reels-studio/.env, ver .env.example)
export ANTHROPIC_API_KEY=...         # Claude como director
export ASSEMBLYAI_API_KEY=...        # el mismo de la app

# Reel completo desde una carpeta de clips (en orden de nombre)
npx tsx pipeline/run.ts --name trailblazer-2019 --vehicle vehiculo.json --clips ./clips/trailblazer

# Retocar el plan a mano y volver a renderizar (reutiliza transcripción y plan)
npx tsx pipeline/run.ts --name trailblazer-2019 --vehicle vehiculo.json --clips ./clips/trailblazer

# Pedirle a Claude un plan nuevo
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

Todo queda en `out/<name>/`: `transcripts.json`, `plan.claude-raw.json`, `plan.json`, `props.json`,
`reel.mp4`.

### Director: Claude

`pipeline/claude-director.ts`, modelo `CLAUDE_DIRECTOR_MODEL` (por defecto `claude-opus-5-5`, esfuerzo
`high`). Claude no recibe video, así que se le mandan hasta 90 cuadros de los clips (2 por segundo, menos
si los clips son largos), cada uno con su segundo, más la transcripción. La respuesta sale con el esquema
del plan (salida estructurada) y los reintentos reutilizan la caché. Si un filtro de seguridad rechaza el
pedido, el servidor reintenta con otro modelo (`fallbacks: "default"`). La caja exacta de lo que se señala
(zoom) la saca Claude en una 2ª pasada sobre cuadros fijos.

## Desde la web (local)

Con la web corriendo en una computadora (`npm run dev`), *Marketing → Videos → Crear Reel* muestra
en el paso **Música** la casilla **Director IA (beta) · solo local**. Al generar:

1. Los clips se suben a Supabase como siempre.
2. El servidor local (`src/lib/videos/director-ia-local.ts`) los descarga, toma los datos del carro
   del inventario (o del nombre del trabajo) y corre `pipeline/run.ts` de este proyecto.
3. El progreso se ve en la lista de videos (AssemblyAI → Claude → Render 3D) y el MP4 se sube al
   bucket `reels-v2`, igual que los reels de Shotstack.

Requisitos en esa computadora: `npm install` dentro de `reels-studio`, ffmpeg instalado y
`ASSEMBLYAI_API_KEY` + `ANTHROPIC_API_KEY` en el `.env.local` de la web. En Vercel la casilla no
aparece y el servidor rechaza la opción (todavía no hay servidor de render).

El plan de cada trabajo queda en `reels-studio/out/<jobId>/plan.json`.

## Muestra incluida

`examples/trailblazer/` usa el video de Felipe (Chevrolet Trailblazer 2019) cortado en 7 clips.
El `plan.demo.json` está **escrito a mano** con el mismo formato que devuelve Claude, y la
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
