import { Video } from '@remotion/media'
import React from 'react'
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ReelProps, TimelineCut } from '../plan/types'
import { zoomProgress, zoomTransform } from './zoom'

export const resolveSrc = (src: string) => (/^https?:\/\//.test(src) ? src : staticFile(src))

/** Encuadre más cerrado en los saltos impares: disimula el corte seco al quitar un silencio. */
const JUMP_SCALE = 1.1
/**
 * Camionetas: cámara sobria, como la referencia. Cortes secos (sin zoom, barrido ni destello), sin
 * golpes en las palabras y un acercamiento lento y continuo en cada toma para que nada quede quieto.
 */
const OFFROAD_DRIFT = 1.08
const OFFROAD_JUMP_SCALE = 1.06
/** Look cálido y contrastado de la referencia de camionetas. */
const OFFROAD_GRADE = 'contrast(1.12) saturate(1.15) sepia(0.12) brightness(0.98)'
/** Modo cine: contraste de película, color algo apagado; camionetas un poco más cálidas y duras. */
const CINE_GRADE = 'contrast(1.1) saturate(0.88) brightness(0.97)'
const CINE_GRADE_OFFROAD = 'contrast(1.16) saturate(0.92) sepia(0.08) brightness(0.95)'
/** Golpe de cámara en palabras clave: sube rápido y vuelve en ~0.3 s. */
const PUNCH_SCALE = 0.07
const PUNCH_IN = 3
const PUNCH_OUT = 9

function punchAt(frame: number, punches: number[]): number {
  let bump = 0
  for (const p of punches) {
    const t = frame - p
    if (t < 0 || t > PUNCH_IN + PUNCH_OUT) continue
    bump = Math.max(bump, t <= PUNCH_IN ? t / PUNCH_IN : 1 - (t - PUNCH_IN) / PUNCH_OUT)
  }
  return 1 + PUNCH_SCALE * Easing.out(Easing.quad)(bump)
}

/** Una toma: recorte del clip + movimiento de cámara + transición de entrada + zoom a lo señalado. */
export const ClipLayer: React.FC<{
  cut: TimelineCut
  engine: ReelProps['videoEngine']
  muted?: boolean
  theme?: ReelProps['theme']
  look?: ReelProps['look']
}> = ({ cut, engine, muted, theme = 'ksi', look = 'social' }) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const offroad = theme === 'offroad'
  const cine = look === 'cine'
  // Cine y camionetas: cortes secos, sin golpes de cámara.
  const sober = cine || offroad
  const transitionIn = sober ? 'corte' : cut.transitionIn
  const grade = cine ? (offroad ? CINE_GRADE_OFFROAD : CINE_GRADE) : offroad ? OFFROAD_GRADE : ''

  // Zoom activo hacia una característica (tiene prioridad sobre el movimiento suave).
  const zoom = cut.zooms.find((z) => frame >= z.fromFrame && frame < z.fromFrame + z.durationInFrames)
  let transform: string
  if (zoom) {
    const local = frame - zoom.fromFrame
    const t = zoomTransform(zoom, zoomProgress(local, zoom.durationInFrames, fps), local / zoom.durationInFrames)
    transform = `translate(${t.translateX}px, ${t.translateY}px) scale(${t.scale})`
  } else {
    // Movimiento de cámara suave para que ninguna toma se sienta estática.
    const drift = interpolate(frame, [0, cut.durationInFrames], [1.0, sober ? OFFROAD_DRIFT : 1.05])
    // Transiciones cortas: el cambio se siente inmediato.
    const zoomIn =
      transitionIn === 'zoom'
        ? interpolate(frame, [0, 8], [1.18, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
        : 1
    const whipX =
      transitionIn === 'whip'
        ? interpolate(frame, [0, 6], [width * 0.18, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
        : 0
    const jump = cut.jump % 2 === 1 ? (sober ? OFFROAD_JUMP_SCALE : JUMP_SCALE) : 1
    const punch = sober ? 1 : punchAt(frame, cut.punches ?? [])
    transform = `translateX(${whipX}px) scale(${drift * zoomIn * jump * punch})`
  }
  const whipBlur = transitionIn === 'whip' ? interpolate(frame, [0, 6], [10, 0], { extrapolateRight: 'clamp' }) : 0
  const glitch = transitionIn === 'glitch' && frame < 4

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform,
          transformOrigin: zoom ? '0 0' : '50% 50%',
          filter:
            `${grade} ${whipBlur ? `blur(${whipBlur}px)` : ''} ${glitch ? 'hue-rotate(80deg) saturate(2.2) contrast(1.3)' : ''}`.trim() ||
            undefined,
        }}
      >
        {engine === 'media' ? (
          <Video
            src={resolveSrc(cut.src)}
            trimBefore={Math.round(cut.trimStartSec * fps)}
            durationInFrames={cut.durationInFrames}
            muted={muted}
            objectFit="cover"
            // Es el plan B: si volviera al extractor de Remotion, fallaría igual.
            disallowFallbackToOffthreadVideo
            style={{ width, height }}
          />
        ) : (
          <OffthreadVideo
            src={resolveSrc(cut.src)}
            trimBefore={Math.round(cut.trimStartSec * fps)}
            durationInFrames={cut.durationInFrames}
            muted={muted}
            // Los clips ya vienen convertidos a SDR (run.ts): no hace falta la conversión de color HDR.
            toneMapped={false}
            style={{ width, height, objectFit: 'cover' }}
          />
        )}
      </AbsoluteFill>
      {glitch ? (
        <AbsoluteFill
          style={{
            transform: `translateX(${frame % 2 === 0 ? 6 : -6}px)`,
            mixBlendMode: 'screen',
            background: 'linear-gradient(90deg, rgba(255,0,60,0.25), rgba(0,200,255,0.25))',
          }}
        />
      ) : null}
      {/* Cine: sombras frías y luces cálidas, como en un comercial. */}
      {cine ? (
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,80,100,0.16), rgba(255,140,60,0.08))', mixBlendMode: 'soft-light' }} />
      ) : null}
      {/* Viñeta para que los textos se lean sobre cualquier fondo (más marcada en camionetas, como la referencia). */}
      <AbsoluteFill
        style={{
          background:
            theme === 'offroad'
              ? 'radial-gradient(ellipse 85% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%), linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.45) 100%)'
              : 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.45) 100%)',
        }}
      />
      {transitionIn === 'flash' ? (
        <AbsoluteFill
          style={{ backgroundColor: '#fff', opacity: interpolate(frame, [0, 6], [0.6, 0], { extrapolateRight: 'clamp' }) }}
        />
      ) : null}
    </AbsoluteFill>
  )
}
