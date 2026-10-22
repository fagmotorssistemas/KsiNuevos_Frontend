/**
 * La skill del equipo para Reels (`.claude/skills/ai-reel-generator`): arquetipo por tipo de vehículo, el triple gancho
 * de los primeros 3 s, ritmo y audio. La siguen el director del montaje y el de motion graphics (y, en la web, el
 * análisis editorial del flujo Shotstack).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.claude/skills/ai-reel-generator/SKILL.md')

/** El texto de la skill, sin el encabezado YAML. */
export function reelSkill(): string {
  if (!fs.existsSync(FILE)) throw new Error(`No encontré la skill de Reels en ${FILE}`)
  return fs.readFileSync(FILE, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').trim()
}

export const ARCHETYPES = ['suv', 'camioneta', 'sedan', 'deportivo'] as const
export type Archetype = (typeof ARCHETYPES)[number]

/** Nombre del arquetipo tal como aparece en la skill. */
export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  suv: 'SUV',
  camioneta: 'Camioneta / Pickup',
  sedan: 'Sedan',
  deportivo: 'Deportivos / Sports Cars',
}

/** Arquetipo de la skill según el tipo de vehículo (van va con SUV y hatchback con sedán). */
export function archetypeFor(tipo: string | undefined): Archetype {
  if (tipo === 'camioneta' || tipo === 'deportivo' || tipo === 'suv') return tipo
  if (tipo === 'van') return 'suv'
  return 'sedan'
}
