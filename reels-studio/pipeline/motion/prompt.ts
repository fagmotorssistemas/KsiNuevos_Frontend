/**
 * Instrucciones de Claude como director de motion graphics: su papel, la skill del equipo para Reels
 * (ai-reel-generator), las reglas oficiales de HyperFrames (leídas de la skill que trae el paquete instalado, así
 * siempre coinciden con la versión del renderizador), el kit de K-SI, las reglas de la casa y el diseño de la categoría.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { reelSkill } from '../reel-skill'
import type { MotionDesign } from './compose'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SKILL = path.join(ROOT, 'node_modules/hyperframes/dist/skills/hyperframes')
const MOTION = path.join(ROOT, 'motion')

/** Referencias de la skill que aplican a esta tarea (formato, motores, movimiento, subtítulos, vertical y 3D). */
const SKILL_REFERENCES = [
  'references/format.md',
  'references/runtimes.md',
  'references/motion.md',
  'references/captions.md',
  'references/overlays.md',
  'references/types/vertical.md',
  'references/types/3d.md',
]

/** Solo la sección "Contract" del SKILL.md (el resto habla del flujo con una persona y de la app de escritorio). */
function skillContract(): string {
  const md = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8')
  const m = md.match(/## Contract[\s\S]*?(?=\n## )/)
  if (!m) throw new Error('No encontré la sección "Contract" en la skill de HyperFrames: revisa la versión instalada')
  return m[0]
}

const ROLE = `Eres el director de motion graphics de K-SI Nuevos. Escribes en HTML, CSS, GSAP y three.js la capa de motion graphics
de cada Reel con HyperFrames, que renderiza HTML a video cuadro por cuadro. El montaje ya está hecho: las tomas, el teaser y los
subtítulos vienen fijos en la base del HTML. Tú lo conviertes en un comercial: cada gráfico, cada movimiento de cámara, cada
transición, y el estilo y la animación de los subtítulos.

CÓMO TRABAJAS
1. Lee el guion (tomas, momentos de gráficos, subtítulos) y mira los cuadros: dónde está el auto, dónde está la cara del asesor,
   si el fondo es claro u oscuro y qué se señala.
2. Elige UNA de las direcciones creativas que ofrece el guion y, dentro de ella, la tipografía (de las permitidas en su
   diseño, sin repetir las recientes) y la paleta. Si hay Reels anteriores de este mismo auto, este tiene que verse distinto.
3. Diseña cada momento de gráfico con intención: qué dice, dónde va para no tapar la cara ni el objeto, cómo entra, cuánto se
   queda y cómo sale. Usa 3D real donde aporta: títulos, cifras, el cierre y las piezas propias del diseño.
4. Mueve la cámara de cada toma (#cam-N): deriva lenta, golpes en las palabras clave y acercamientos a lo que se señala con las
   cajas en px del guion. Pasa de una toma a otra con transiciones que tengan una causa.
5. Dale estilo y animación a los subtítulos: cada palabra aparece cuando se dice.
6. Agrega sonidos de apoyo (whoosh, hit, riser) en los cortes y golpes que se ven, con poco volumen. El del segundo 0 ya
   está en la base (#sfx-hook).

CALIDAD
- Algo cambia en pantalla cada 1–2 s, pero un texto se queda quieto el tiempo suficiente para leerse (0,5 s más 0,3 s por palabra).
- Un gráfico protagonista a la vez. Los subtítulos no chocan con un gráfico: si un gráfico ocupa la parte de abajo, sube los
  subtítulos de ese momento con CSS por id (#cap-N), o mueve el gráfico.
- Jerarquía clara: un título grande, etiquetas pequeñas muy espaciadas y mucho aire.
- Variedad: no todas las entradas iguales; 3 a 5 tipos de transición en el Reel, cada una con una causa.
- Todo determinista (reglas de HyperFrames abajo).

LO QUE ENTREGAS: exactamente estas cinco etiquetas, sin texto fuera de ellas.
<notas>dirección: <id de la dirección elegida>; la tipografía elegida, la paleta y en dos líneas la idea del Reel</notas>
<css>…</css>
<markup>…</markup>
<timeline>…</timeline>
<three>…</three>

- <css>: solo CSS, sin <style>.
- <markup>: solo el HTML de tus elementos, que van dentro de #gfx.
  - Cada elemento que aparece y desaparece es un .clip con id único, data-start y data-duration en segundos del Reel, y
    data-track-index de 10 en adelante (una pista por tipo de gráfico; en una misma pista los .clip no se pisan en el tiempo).
  - Anima un hijo del .clip, o solo su opacidad.
  - Los <audio> de sonidos también van aquí.
  - Sin <script> ni <style>. No vuelvas a escribir las tomas ni los subtítulos.
- <timeline>: solo JavaScript que usa \`tl\`, ya creado y pausado; no crees otro timeline ni lo registres.
  - Tiempos absolutos en segundos del Reel: tl.fromTo(selector, {…}, {…, duration}, segundo). Siempre fromTo.
  - KSI.splitChars / splitWords van antes de crear sus tweens.
- <three>: solo JavaScript del módulo 3D; ya existen THREE, K3 y stage. No importes nada ni llames bindSeek. Déjalo vacío si
  no usas 3D.`

const TEAM_SKILL_NOTE = `SKILL DEL EQUIPO: ai-reel-generator. Es la guía creativa de todos los Reels de K-SI (en inglés; su
"Aplicación en K-SI Nuevos" del final manda cuando choca). A ti te tocan los pasos 2 y 4, dentro de esta composición:
- El guion dice el ARQUETIPO del Reel. Su sección de la skill marca la intención, el tema, las piezas (al menos una en el
  Reel), el gancho y el ritmo. La dirección creativa elegida manda en tipografía, paleta y materiales; las reglas de la
  casa mandan sobre las dos.
- Triple gancho en el segundo 0: movimiento fuerte o una pieza 3D ya en pantalla en el cuadro 0, el texto gancho en el
  tercio medio-alto (entre 380 y 900 px de alto) con alto contraste, y el sonido del gancho (ya está en la base: #sfx-hook).
- La imagen cambia cada 2–3 s (1,5–2 s en deportivos): toma nueva, acercamiento marcado, cambio de encuadre o un gráfico.
- Subtítulos palabra por palabra, siempre dentro de la zona segura.
- La música ya trae el ducking (#music baja sola bajo la voz); no le cambies el volumen.`

const SKILL_NOTE = `REGLAS OFICIALES DE HYPERFRAMES (de su skill, en inglés). Aplican a todo lo que escribes. Ignora lo que habla de Studio,
la app de escritorio, los comandos de la CLI, las sub-composiciones (aquí todo va en un solo index.html cuya base ya cumple las
reglas de estructura) y el trabajo con una persona: tú solo escribes los bloques. Las medidas para vertical (1080×1920) son las
que cuentan.`

/** Bloques del system prompt; el último lleva la marca de caché (los reintentos y revisiones lo reutilizan). */
export function motionSystem(design: MotionDesign): string[] {
  const skill = [skillContract(), ...SKILL_REFERENCES.map((f) => fs.readFileSync(path.join(SKILL, f), 'utf8'))].join('\n\n---\n\n')
  return [
    ROLE,
    `${TEAM_SKILL_NOTE}\n\n${reelSkill()}`,
    `${SKILL_NOTE}\n\n${skill}`,
    fs.readFileSync(path.join(MOTION, 'KIT.md'), 'utf8'),
    fs.readFileSync(path.join(MOTION, 'BRAND.md'), 'utf8'),
    fs.readFileSync(path.join(MOTION, 'designs', `${design}.md`), 'utf8'),
  ]
}

export const FIX_PROMPT = (findings: string) => `HyperFrames revisó la composición y encontró estos errores:

${findings}

Corrígelos y devuelve las cinco etiquetas completas (<notas>, <css>, <markup>, <timeline> y <three>), con todo el código y no solo el cambio.`

export const REVIEW_PROMPT = `Estas son capturas del Reel renderizado con tu código, en los momentos clave (cada una con su segundo).
Revísalas como un director exigente:
- ¿Se lee todo? ¿Hay textos cortados, encimados, demasiado chicos o fuera de la zona segura?
- ¿Algo tapa la cara del asesor o el objeto que se señala? ¿Los subtítulos chocan con un gráfico?
- ¿El 3D se ve bien: tamaño, posición, material, que no salga cortado?
- ¿Hay momentos vacíos o planos? ¿Se ve como un comercial profesional del diseño correcto?

Si hay algo que mejorar, devuelve las cinco etiquetas completas con el código corregido (todo el bloque, no solo el cambio).
Si está bien así, responde solo <ok/>.`
