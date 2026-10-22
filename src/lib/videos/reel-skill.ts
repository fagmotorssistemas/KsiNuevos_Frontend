/**
 * Skill del equipo para Reels (`.claude/skills/ai-reel-generator`): arquetipo por tipo de vehículo, gancho de los
 * primeros 3 s y ritmo. Claude la lee en el análisis editorial del flujo Shotstack (reels-studio la usa en el
 * Director IA). En Vercel el archivo viaja con las rutas de /api/videos (outputFileTracingIncludes en next.config.ts).
 */
import fs from 'node:fs'
import path from 'node:path'

const SKILL_FILE = path.join(process.cwd(), '.claude/skills/ai-reel-generator/SKILL.md')

/** Lo que le toca a Claude en este flujo (va antes del texto de la skill). */
const SHOTSTACK_NOTE = `SKILL DEL EQUIPO: ai-reel-generator. Es la guía creativa de todos los Reels de K-SI (en inglés; su "Aplicación en
K-SI Nuevos" del final manda cuando choca, y el formato JSON y las reglas del pedido mandan sobre la skill). En este flujo
tú haces el paso 1: identifica el arquetipo del vehículo y elige y ordena los tramos para cumplir su gancho de los primeros
3 s (respetando las reglas de apertura del pedido), su ritmo y cero tiempo muerto. Los gráficos, los subtítulos y el
render los hacen las plantillas de Shotstack.`

let cached: string | null | undefined

/** El bloque de system con la skill, o null si el archivo no está (se avisa una vez en el log). */
export function reelSkillSystem(): string | null {
  if (cached !== undefined) return cached
  try {
    const skill = fs.readFileSync(SKILL_FILE, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').trim()
    cached = `${SHOTSTACK_NOTE}\n\n${skill}`
  } catch {
    console.warn(`[reel-skill] No encontré ${SKILL_FILE}: el análisis sigue sin la skill del equipo`)
    cached = null
  }
  return cached
}
