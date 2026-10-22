# K-SI Reels Studio

Reels verticales de autos con Claude como director:

```
clips crudos del asesor
   ├─ AssemblyAI ──► transcripción palabra por palabra (marcas y modelos como palabras clave)
   ├─ Claude (director) ──► identifica el vehículo (tipo y gama reales, no la carrocería del inventario)
   │                        y arma el montaje: cortes, teaser, momentos de gráficos, subtítulos, ritmo
   ├─ Claude (director de motion graphics) ──► escribe la composición HyperFrames del Reel
   │       (HTML + CSS + GSAP + three.js) con el diseño de su categoría y una dirección creativa distinta cada vez
   ├─ HyperFrames check ──► Claude corrige lo que no cumple
   ├─ capturas del resultado ──► Claude las revisa y pule
   └─ HyperFrames render ──► MP4 vertical 1080×1920
```

## Qué decide cada uno

**El sistema** (`pipeline/vehicle-catalog.ts`) da la primera respuesta sobre qué es el vehículo, por marca y modelo.
La carrocería del inventario viene mezclada ("jeep", "blindado", "particular", "station wagon", "hibrido-j") y
no sirve para decidir.

| Ejemplo | Resultado |
|---|---|
| Hilux blindada | camioneta |
| Trailblazer o Expedition blindadas | SUV |
| CX-30 híbrida | SUV |
| Porsche Cayenne | súper premium |
| Mercedes-Benz, Audi, MINI | premium |

Claude lo confirma mirando los clips y escuchando al asesor (campo `vehiculo` del plan).

**Claude, como director**, recibe la transcripción y cuadros de los clips y devuelve el plan (`src/plan/schema.ts`):
- Qué tramos usar y en qué orden, siempre con frases completas.
- El teaser de apertura.
- Los momentos de cada gráfico: gancho, presentación, cifras, características señaladas con su caja, listas y cierre.
- La energía de cada corte y las transiciones sugeridas.
- Las correcciones de la transcripción.

`src/plan/timeline.ts` lo convierte en el montaje (`props.json`): tiempos en cuadros, subtítulos agrupados, el zoom a
cada objeto señalado y la cola final.

**Claude, como director de motion graphics** (`pipeline/motion/`), escribe la capa visual con HyperFrames sobre ese
montaje, siguiendo:
- las reglas oficiales de HyperFrames, que lee de la skill del paquete instalado;
- el kit de K-SI (`motion/kit`, ver `motion/KIT.md`);
- las reglas de la casa (`motion/BRAND.md`);
- el diseño de la categoría (`motion/designs/`).

| Diseño | Para | Direcciones creativas |
|---|---|---|
| camioneta | pickups y de trabajo | óxido Ranger · expedición nocturna · taller industrial · mapa topográfico |
| suv | todo lo alto con portón | champán de lujo · ruta en familia · urbano nocturno · portada de revista |
| deportivo | cupés y deportivos | día de pista · neón nocturno · telemetría |
| premium | Mercedes-Benz, BMW, Audi, MINI, Volvo… | cristal tecnológico · monocromo · galería de diseño |
| superpremium | Porsche, Land Rover, tope de gama | negro y oro · platino glaciar · atelier |
| general | sedanes, hatchbacks, vans | cine K-SI · pop dinámico · plano técnico · lifestyle cálido |

**Variedad:** el sistema solo ofrece direcciones que no se usaron hace poco con ese auto ni en los últimos Reels, y
Claude elige una. Además recibe cómo se hicieron los Reels anteriores del mismo auto (gancho, dirección), así los
mismos clips publicados otro día salen distintos.

**El kit 3D** (`motion/kit/ksi3d.js`, three.js):
- letras de metal que se arman letra por letra (óxido, cromo, champán, oro, carbono, rojo);
- cifras 3D que cuentan;
- llanta offroad;
- llanta gigante que tapa un corte;
- escáner holográfico.

Todo se dibuja en función del tiempo, así cualquier cuadro se renderiza igual.

## Uso

```bash
cd reels-studio
npm install
npm run hf:browser        # una vez: descarga el Chrome que usa HyperFrames para renderizar

# Claves en reels-studio/.env (ver .env.example): ANTHROPIC_API_KEY y ASSEMBLYAI_API_KEY

# Reel completo desde una carpeta de clips (en orden de nombre)
npx tsx pipeline/run.ts --name trailblazer-2019 --vehicle vehiculo.json --clips ./clips/trailblazer

# Repetir reutilizando transcripción y plan (si retocaste plan.json a mano), o pedir uno nuevo
npx tsx pipeline/run.ts ... --replan

# Solo el motion graphics sobre un montaje ya hecho (otra dirección, otro diseño, sin revisión, borrador)
npx tsx pipeline/motion/run.ts --props out/<name>/props.json --vehicle out/<name>/vehicle.json --name prueba \
  [--design camioneta] [--no-review] [--quality draft]
```

Todo queda en `out/<name>/`:
- `transcripts.json`, `plan.json` y `props.json` (el montaje);
- `vehicle.json` (lo que se identificó del vehículo);
- `motion/`, el proyecto HyperFrames editable (`npx hyperframes preview` dentro de esa carpeta para verlo y editarlo);
- `motion.json`, con el diseño y la dirección creativa;
- `reel.mp4`.

`vehiculo.json` sale del inventario:

```json
{
  "marca": "Chevrolet",
  "modelo": "Trailblazer",
  "carroceria": "jeep",
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

### Claude

- **Modelo:** `claude-opus-5-5`, configurable con `CLAUDE_DIRECTOR_MODEL` (montaje) y `CLAUDE_MOTION_MODEL` (motion graphics).
- **Esfuerzo:** alto.
- **Lo que recibe:** Claude no ve video, así que se le mandan cuadros con su segundo.
- **Caché:** los prompts largos y las reglas de HyperFrames quedan en caché una hora (las revisiones las reutilizan).
- **Rechazos:** si un filtro de seguridad rechaza el pedido, el servidor reintenta con otro modelo (`fallbacks: "default"`).
- **Costo:** unos US$ 3–3,5 por Reel en motion graphics, con la revisión visual, más el montaje.

## Desde la web (local)

Con la web corriendo en una computadora (`npm run dev`), *Marketing → Videos → Crear Reel* muestra la casilla
**Director IA (beta) · solo local**. El servidor local (`src/lib/videos/director-ia-local.ts`):
1. Descarga los clips.
2. Toma los datos del auto del inventario y los Reels anteriores de ese auto.
3. Corre `pipeline/run.ts`.
4. Muestra el progreso en la lista de videos.
5. Sube el MP4 al bucket `reels-v2`.

El diseño y la dirección quedan guardados en `gemini_analysis.motion` para no repetirlos.

Requisitos en esa computadora:
- `npm install` y `npm run hf:browser` dentro de `reels-studio`;
- ffmpeg instalado;
- `ASSEMBLYAI_API_KEY` y `ANTHROPIC_API_KEY` en el `.env.local` de la web.

## Muestra incluida

`examples/trailblazer/` usa el video de Felipe (Chevrolet Trailblazer 2019) cortado en 7 clips. El video original ya
tenía subtítulos quemados (Claude lo nota y apaga los suyos para no duplicarlos).

```bash
./examples/trailblazer/make-clips.sh     # deja los clips en public/demo

# Solo el motion graphics, con el plan y la transcripción ya hechos (sin AssemblyAI ni director)
npx tsx pipeline/render-plan.ts --plan examples/trailblazer/plan.demo.json \
  --transcripts examples/trailblazer/transcripts.local.json --vehicle examples/trailblazer/vehiculo.json \
  --name trailblazer-muestra

# Reel completo desde los clips (AssemblyAI → director → motion graphics → render)
npx tsx pipeline/run.ts --name trailblazer-completo --vehicle examples/trailblazer/vehiculo.json --clips public/demo
```

## Render en producción

El render necesita Chrome sin interfaz y ffmpeg, y tarda más que el límite de una función de Vercel, así que corre
aparte. HyperFrames trae dos caminos:
- **AWS Lambda:** `npx hyperframes lambda`.
- **Docker:** `render --docker`, en un servidor o worker con este proyecto.

En un servidor sin tarjeta gráfica el 3D usa WebGL por software: un Reel de 30 s tarda unos 6 minutos. HyperFrames es
de código abierto (Apache 2.0), sin costo por render.
