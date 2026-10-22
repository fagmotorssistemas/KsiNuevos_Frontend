---
name: ai-reel-generator
description: Advanced AI reel and short generation orchestrator from web clips using Claude, Hyperframe (HTML/CSS/Three.js visuals), AssemblyAI (word-level sync), and Shotstack (video rendering). Features advanced automotive classification (SUV, Pickup/Camioneta, Sedan, Sports/Deportivo), 3-second retention hooks, dynamic captioning, and multi-track timeline composition.
---

# AI Reel & Short Pipeline Orchestration (Advanced Engine)

An elite orchestration skill designed to transform raw vehicle clips into high-retention, viral short-form videos (Reels, TikToks, Shorts). It leverages **Claude** for narrative intelligence, **Hyperframe** for high-end 3D/HTML visual overlays, **AssemblyAI** for precise speech alignment, and **Shotstack** for cloud rendering.

## Core Directives & Quality Standards
- **Vertical First:** Always target 9:16 aspect ratio (1080x1920).
- **Zero Dead Air:** Every second must have visual or auditory stimulus. Cuts occur every 2 to 3 seconds max.
- **Hook Dominance:** The first 3 seconds dictate video performance. Visual, text, and audio hooks must fire simultaneously at $t = 0.0s$.

---

## Automotive Archetype Matrix & Motion Design

Claude must evaluate the vehicle type and apply its corresponding aesthetic framework:

### 1. SUV (Adventure, Family, Comfort, Capability)
* **Visual Theme:** Cinematic, sweeping, expansive. Warm or earthy color grading.
* **Hyperframe Asset:** Terrain particle effects, compass/elevation HUD overlays, or spacious interior wireframes.
* **Visual Hook:** Wide landscape panning or sudden off-road suspension flex.
* **Text Hook Focus:** "El rey de la ruta", "Espacio y poder sin límites", "Tu próxima aventura empieza aquí".
* **Pacing & Audio:** Smooth, fluid cuts. Cinematic or rhythmic indie-electronic background beats.

### 2. Camioneta / Pickup (Power, Utility, Toughness, Dominance)
* **Visual Theme:** High-contrast, gritty, industrial, powerful. Bold typography.
* **Hyperframe Asset:** Torque meters, rugged metallic frames, or heavy-duty grid lines.
* **Visual Hook:** Low-angle wheel spin, mud splash close-up, or massive towing display.
* **Text Hook Focus:** "Indestructible", "Hecha para el trabajo pesado", "El torque que lo puede todo".
* **Pacing & Audio:** Hard-hitting cuts synchronized with heavy bass drops and engine rumble.

### 3. Sedan (Elegance, Executive, Smart Efficiency)
* **Visual Theme:** Clean, minimal, futuristic, sophisticated. Sleek typography with soft glows.
* **Hyperframe Asset:** Tech dashboard UI, clean digital speedometers, minimalist neon accents.
* **Visual Hook:** Smooth highway sliding shot or crisp reflection panning across the bodywork.
* **Text Hook Focus:** "Elegancia en movimiento", "Tecnología de nivel ejecutivo", "Eficiencia inteligente".
* **Pacing & Audio:** Rhythmic, pulsing corporate tech beats, smooth fades, and clean transitions.

### 4. Deportivos / Sports Cars (Adrenaline, Speed, Sound, Raw Power)
* **Visual Theme:** Hyper-dynamic, neon/cyberpunk or track-focused, lightning-fast transitions.
* **Hyperframe Asset:** G-force meters, blazing speed lines, dynamic tachometer rev needles.
* **Visual Hook:** Aggressive exhaust pop/flame close-up or hyper-acceleration blur.
* **Text Hook Focus:** "0 a 100 en un parpadeo", "Pura adrenalina", "¿Te atreves a manejarlo?".
* **Pacing & Audio:** Ultra-fast cuts (every 1.5 - 2s), high-rev engine screams, glitch effects, and heavy beat drops.

---

## Retention & Hook Framework ($t = 0$ to $t = 3s$)

1. **Visual Hook:** Immediate high-motion frame or Hyperframe 3D intro element. No logo screens or slow fades at the start.
2. **Text Hook:** High-contrast color (Yellow/White on dark backgrounds or outlined bold text), placed in the upper-middle third (safe zone away from UI overlays).
3. **Audio Hook:** Instant sound effect (Whoosh, engine rev, or heavy bass hit) combined with the first spoken word.

---

## Orchestration Pipeline Workflow

### Step 1: Ingestion & Archetype Classification (Claude)
- Receive raw web clips and metadata.
- Classify into **SUV**, **Camioneta**, **Sedan**, or **Deportivo**.
- Generate script and assign the precise hook triad (Visual, Text, Audio).

### Step 2: Visual Asset Generation (Hyperframe)
- Instruct Hyperframe to render HTML/CSS/Three.js overlays (HUDs, tachometers, particle effects) matching the vehicle archetype. Ensure transparent or chroma-key-friendly backgrounds for layering.

### Step 3: Transcription & Word-Level Timing (AssemblyAI)
- Process audio tracks to extract word-level timestamps (`start`, `end`, `confidence`).
- Generate subtitle cue points designed for dynamic, word-by-word highlighting captions.

### Step 4: Timeline Composition & Cloud Rendering (Shotstack)
- Build the Shotstack JSON payload with multi-track layering:
  - **Track 1:** Base vehicle clips with rapid cuts.
  - **Track 2:** Hyperframe HTML visual overlays.
  - **Track 3:** Dynamic word-by-word animated captions.
  - **Track 4:** Audio mix (Voiceover + SFX hook + background music with ducking).
- Submit to Shotstack API and monitor render webhook.

## Best Practices & Gotchas
- **Audio Ducking:** Ensure background music automatically drops in volume (ducking) whenever the voiceover or engine sound effect peaks.
- **Safe Zones:** Keep all text overlays inside the central vertical safe zone to prevent obstruction by platform UI (TikTok/Reels buttons).

---

## Aplicación en K-SI Nuevos (manda sobre lo anterior cuando choca)

Esta skill la leen los dos flujos de Reels de K-SI:
- **Director IA (HyperFrames):** un Claude identifica el vehículo y arma el montaje; otro Claude escribe la composición
  HyperFrames y HyperFrames renderiza el Reel entero. Los pasos 2 y 4 pasan dentro de esa composición, no en Shotstack:
  las cuatro pistas son capas del mismo HTML (tomas, gráficos y 3D, subtítulos, audio).
- **Flujo Shotstack:** Claude elige y ordena los tramos, y Shotstack renderiza en la nube con sus plantillas.

**Arquetipo según el tipo de vehículo identificado:**

| Tipo | Arquetipo |
|---|---|
| camioneta | Camioneta / Pickup |
| suv, van | SUV |
| sedan, hatchback | Sedan |
| deportivo | Deportivo |

En premium y súper premium, el diseño de la gama manda en lo visual (tipografía, color, materiales). El arquetipo de su
tipo manda en el gancho, el ritmo y el audio.

**Cómo se cumple cada regla en K-SI:**
- **Cortes cada 2–3 s (1,5–2 s en deportivos):** la imagen cambia en ese ritmo: otra toma, un plano del teaser, un
  acercamiento marcado de cámara o un gráfico que entra. Ningún plano se ve igual más de 3 s. La voz del asesor nunca se
  corta a media frase: si una toma tiene varias frases, se divide en un corte por frase y cada uno con otro encuadre.
- **Gancho visual:** sale de las tomas que grabó el asesor (la más espectacular va en el teaser) más el 3D de apertura. No
  se piden tomas que no existen.
- **Gancho de texto:** frase nueva en cada Reel, con el tono del arquetipo. Las frases de arriba son ejemplos de tono, no
  textos fijos. Va en el tercio medio-alto (entre 380 y 900 px de alto) y sin cifras que nadie dijo.
- **Gancho de audio:** la voz suena desde el cuadro 0. En el Director IA, el sistema pone un golpe o whoosh en el cuadro 0 y
  baja la música bajo la voz (ducking).
- **Piezas del arquetipo:** cada Reel lleva al menos una (HUD, medidor, líneas de velocidad, cuadrícula, partículas),
  dibujada con el estilo de la dirección creativa elegida.

**Reglas del equipo que mandan sobre la skill:**
- Nada de barro ni salpicaduras. El gancho de camioneta usa la llanta en contrapicado, la parrilla, el motor o el auto en
  movimiento.
- Ningún texto lleva contorno, borde negro ni sombra paralela. El contraste sale de oscurecer la imagen detrás o de una
  placa, con texto blanco o del acento del diseño.
- Solo se muestra lo que dice el asesor o viene en los datos del vehículo.
- Cada Reel es distinto: la dirección creativa y el gancho cambian aunque los clips sean los mismos.
