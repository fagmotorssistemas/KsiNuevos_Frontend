# Kit K-SI para HyperFrames

Lo que ya está cargado en cada composición y cómo usarlo.

## Cómo está armado el index.html

El sistema escribe la base y tú escribes cuatro bloques que se insertan en ella.

**Fijo (no lo tocas):**
- Lienzo `#root` de 1080×1920 a 30 cps, con la duración del Reel.
- Las tomas, cada una como `<div id="shot-N" class="shot"><div id="cam-N" class="cam"><video id="v-N" class="clip" …></video></div></div>`. La toma N está encima de la N-1 (z-index N). El video ya tiene sus tiempos y su recorte, y suena con su propio audio (la voz del asesor).
- Teaser: `#ins-N` / `#cam-ins-N` / `#vi-N`, planos sin sonido encima de la voz del arranque (z-index 20+N).
- Cola: `#tail` es una foto del último cuadro que sostiene la imagen al final.
- `<canvas id="stage3d">` es la capa 3D (z-index 50).
- `#gfx` es el contenedor de tus gráficos (z-index 60).
- `#captions` trae los grupos de subtítulos ya escritos (z-index 80):
  `<div id="cap-N" class="clip cap" data-start data-duration data-place="arriba|centro|abajo">`
  con `<span class="w" data-word-start="inicio" data-word-end="fin">palabra</span>`. Las palabras clave llevan además la clase `em`.
- Fuentes con `@font-face`, GSAP, `window.KSI` (2D) y el módulo `K3` (3D).

**Lo que escribes tú:**
1. `<css>`: estilos de tus gráficos, de los subtítulos (`.cap`, `.w`, `.em`, por `data-place`) y de las capas. Puedes cambiar el z-index de `#stage3d`, `#gfx` o `#captions` si una pieza 3D debe ir encima de un texto 2D.
2. `<markup>`: tus elementos dentro de `#gfx`. Cada uno que aparece y desaparece es un `.clip` con `id`, `data-start`, `data-duration` y `data-track-index` (de 10 en adelante, una pista por tipo de gráfico).
3. `<timeline>`: el cuerpo de una función que ya recibe `tl`, un `gsap.timeline({ paused: true })`. Se registra solo al final, cuando las fuentes están listas. Aquí van los tweens 2D, la animación de los subtítulos y el movimiento de cámara (`#cam-N`).
4. `<three>`: el cuerpo de un módulo que ya tiene `THREE`, `K3` (este kit 3D) y `stage`, el escenario sobre `#stage3d`. Aquí agregas las piezas 3D. `bindSeek` se llama solo al final. Si no usas 3D, déjalo vacío.

## 2D: `window.KSI`

| Función | Para qué |
|---|---|
| `KSI.captions()` | Lista de grupos `{ el, id, start, end, place, text, words: [{ el, text, start, end, emphasis }] }` con tiempos en segundos del Reel. Recórrela para animar cada palabra cuando se dice. |
| `KSI.splitChars(el)` / `KSI.splitWords(el)` | Envuelven letras o palabras en spans `inline-block` y los devuelven, para animarlos con escalonado. Llámalas antes de crear sus tweens. |
| `KSI.count(tl, el, { from, to, at, dur, decimals, prefix, suffix, ease })` | Cifra que cuenta dentro de `el` (formato 128.000 / 2,8). |
| `KSI.fmt(n, decimals)` | Número con miles a la ecuatoriana. |
| `KSI.prng(seed)` | Aleatorio con semilla. Nunca uses `Math.random()`. |

**Subtítulos:** el grupo ya se muestra solo dentro de su ventana. Anima sus palabras (opacidad, desenfoque, color, escala). Nunca hagas tween de `display`, `visibility` ni `autoAlpha` del grupo, y no repitas un `from` que no sea `fromTo`.

**Cámara:** mueve `#cam-N` (scale, x, y, rotation) dentro de la ventana de la toma N, para acercamientos a lo que se señala, golpes de cámara y deriva lenta. Nunca muevas el `<video>`.

## 3D: módulo `K3` (three.js)

Posiciones y tamaños en px del video; tiempos en segundos del Reel. Cada pieza se ve solo en `[start, end)`.

```js
// Texto de metal que se arma letra por letra
K3.letters3D(stage, {
  text: 'RANGER', font: 'russo', finish: 'rust',
  x: 540, y: 420, capPx: 170, align: 'center', maxWidthPx: 960,
  start: 4.9, end: 7.4, entrance: 'drop', stagger: 0.06, dur: 0.45,
  exit: 'up', sway: 0.05,
})

// Cifra que cuenta (el tamaño queda fijo con la cifra final)
K3.counter3D(stage, {
  to: 128000, decimals: 0, suffix: ' KM', font: 'bebas', finish: 'chrome',
  x: 80, y: 360, align: 'left', capPx: 190,
  start: 19.9, end: 22.8, entrance: 'depth', countDur: 0.7,
})

// Llanta offroad que entra rodando y se queda girando como en un exhibidor
const tire = K3.tire3D(stage, {
  radiusPx: 150, from: { x: 1240, y: 520 }, to: { x: 860, y: 520 },
  start: 20.0, end: 22.8, rollDur: 0.6, yaw: -0.4,
})
// tire.centerAt(t) devuelve { x, y } en px: sirve para que otras piezas reaccionen a su paso

// Llanta gigante que tapa un corte (solo camionetas): la pantalla queda cubierta justo en `at`
K3.tireWipe(stage, { at: 10.33, dur: 0.8 })

// Escáner holográfico sobre un objeto chico
K3.scanRing3D(stage, { x: 610, y: 900, rPx: 150, start: 27.5, end: 29.8, color: '#FF8A1F' })

// Luz que cruza el metal (letters3D ya trae la suya con sweep: true)
K3.sweep3D(stage, { start: 5, end: 7, y: 420 })
```

### Opciones de las piezas

- **Fuentes 3D (`font`):** `russo`, `anton`, `bebas`, `teko`, `archivo`, `montserrat`, `cinzel`, `playfair`, `michroma`, `josefin`. Usa la misma familia que en 2D.
- **Acabados (`finish`):**
  - `rust`: naranja oxidado.
  - `chrome`: cromo blanco con cantos oscuros.
  - `champagne`: cromo con cantos dorados.
  - `gold`: oro pulido.
  - `carbon`: negro piano con cantos de color; el color se pasa en `edge`.
  - `red`: rojo caramelo K-SI.
- **Entradas (`entrance`):**
  - `drop`: cae girando y se asienta.
  - `flip`: estaba acostada y se levanta, ideal al paso de una llanta.
  - `rise`: sube despacio y se endereza (elegante).
  - `slam`: llega de golpe desde la cámara (deportivo).
  - `spin`: gira sobre su eje.
  - `depth`: llega desde el fondo.
- **Salidas (`exit`):** `up`, `down`, `back` o `none`.
- **`letterStart(i, xPx)`:** devuelve el segundo en que arranca cada letra. Así las letras se levantan cuando una llanta las cruza, por ejemplo con `(i, x) => tiempo en que tire.centerAt(t).x pasa por x`.
- **Lo que quieras armar tú:** `stage.scene`, `stage.toScene(x, y)`, `stage.px(n)` y `stage.onUpdate((t) => { … })`, que se llama en cada cuadro con el tiempo. Todo debe ser función de `t`.

### Costo del 3D

El render es por software. Una o dos piezas 3D a la vez van bien. La llanta gigante es pesada: úsala como mucho dos veces por Reel.

## Archivos disponibles

- **Logo:** `assets/kit/logo/ksi-logo.png`, en rojo y negro sobre transparente. Sobre fondo oscuro, ponlo sobre una placa clara o en blanco con `filter: brightness(0) invert(1)`.
- **Sonidos:** `assets/kit/sfx/whoosh.wav` (barrido), `hit.wav` (golpe), `pop.wav` (aparición corta) y `riser.wav` (subida antes de un remate). Cada `<audio>` lleva `id`, `class="clip"`, `data-start`, `data-duration` (1–2 s) y `data-volume` (0.3–0.7), y va dentro de `#gfx`. Que suenen en los cortes y golpes que se ven, no en todo.
- **Fuentes 2D (`font-family`):** `Anton`, `Montserrat` (800/900), `Russo One`, `Bebas Neue`, `Archivo Black`, `Poppins` (800), `Teko` (700), `Cinzel` (700), `Playfair Display` (700 e itálica 700), `Michroma` y `Josefin Sans` (700).
