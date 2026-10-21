import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

export const COLORS = {
  red: '#E81C2A',
  redDeep: '#8E0B14',
  ink: '#0B0B0F',
  white: '#FFFFFF',
  yellow: '#FFE94A',
  glass: 'rgba(12, 12, 16, 0.72)',
}

export const FONT_DISPLAY = 'Anton'
export const FONT_UI = 'Montserrat'

void loadFont({ family: FONT_DISPLAY, url: staticFile('fonts/Anton-Regular.woff2'), weight: '400' })
void loadFont({ family: FONT_UI, url: staticFile('fonts/Montserrat-ExtraBold.woff2'), weight: '800' })
void loadFont({ family: FONT_UI, url: staticFile('fonts/Montserrat-Black.woff2'), weight: '900' })

/** Extrusión "3D" por capas de sombra: da volumen a texto HTML sin WebGL. */
export function extrudedShadow(depth: number, color: string, angleDeg = 135): string {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const layers: string[] = []
  for (let i = 1; i <= depth; i++) layers.push(`${(-dx * i).toFixed(2)}px ${(dy * i).toFixed(2)}px 0 ${color}`)
  layers.push(`${(-dx * depth * 1.6).toFixed(1)}px ${(dy * depth * 1.6 + 10).toFixed(1)}px 28px rgba(0,0,0,0.55)`)
  return layers.join(', ')
}

/** Formato numérico en español de Ecuador: 128000 → "128.000"; 2.8 → "2.8" (cilindraje). */
export function formatSpecNumber(value: number, decimals: number): string {
  if (decimals > 0) return value.toFixed(decimals)
  return Math.round(value).toLocaleString('es-EC').replace(/,/g, '.')
}
