import { Video } from '@remotion/media'
import React from 'react'
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ReelProps, TimelineCut } from '../plan/types'
import { zoomProgress, zoomTransform } from './zoom'

export const resolveSrc = (src: string) => (/^https?:\/\//.test(src) ? src : staticFile(src))

/** Encuadre más cerrado en los saltos impares: disimula el corte seco al quitar un silencio. */
const JUMP_SCALE = 1.1
/**
 * Camionetas: ningún plano queda quieto más de ~2 s; el encuadre alterna (abierto / cerrado) como si
 * fuera un corte nuevo, con un golpe corto entre uno y otro.
 */
const REFRAME_SEC = 2.2
const REFRAME_SCALE = 1.12
const REFRAME_EASE_FRAMES = 3
/** Look cálido y contrastado de la referencia de camionetas. */
const OFFROAD_GRADE = 'contrast(1.12) saturate(1.15) sepia(0.12) brightness(0.98)'
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
export const ClipLayer: React.FC<{ cut: TimelineCut; engine: ReelProps['videoEngine']; muted?: boolean; theme?: ReelProps['theme'] }> = ({
  cut,
  engine,
  muted,
  theme = 'ksi',
}) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()

  // Zoom activo hacia una característica (tiene prioridad sobre el movimiento suave).
  const zoom = cut.zooms.find((z) => frame >= z.fromFrame && frame < z.fromFrame + z.durationInFrames)
  let transform: string
  if (zoom) {
    const local = frame - zoom.fromFrame
    const t = zoomTransform(zoom, zoomProgress(local, zoom.durationInFrames, fps), local / zoom.durationInFrames)
    transform = `translate(${t.translateX}px, ${t.translateY}px) scale(${t.scale})`
  } else {
    // Movimiento de cámara suave para que ninguna toma se sienta estática.
    const drift = interpolate(frame, [0, cut.durationInFrames], [1.0, 1.05])
    // Transiciones cortas: el cambio se siente inmediato.
    const zoomIn =
      cut.transitionIn === 'zoom'
        ? interpolate(frame, [0, 8], [1.18, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
        : 1
    const whipX =
      cut.transitionIn === 'whip'
        ? interpolate(frame, [0, 6], [width * 0.18, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
        : 0
    const jump = cut.jump % 2 === 1 ? JUMP_SCALE : 1
    let reframe = 1
    if (theme === 'offroad') {
      const every = Math.round(REFRAME_SEC * fps)
      const idx = Math.floor(frame / every)
      const scaleFor = (k: number) => ((cut.jump + k) % 2 === 1 ? REFRAME_SCALE : 1)
      const t = frame - idx * every
      reframe = idx > 0 && t < REFRAME_EASE_FRAMES ? interpolate(t, [0, REFRAME_EASE_FRAMES], [scaleFor(idx - 1), scaleFor(idx)]) : scaleFor(idx)
      // El salto ya alterna el encuadre: no se aplica dos veces.
      if (cut.jump % 2 === 1) reframe /= JUMP_SCALE
    }
    transform = `translateX(${whipX}px) scale(${drift * zoomIn * jump * reframe * punchAt(frame, cut.punches ?? [])})`
  }
  const whipBlur = cut.transitionIn === 'whip' ? interpolate(frame, [0, 6], [10, 0], { extrapolateRight: 'clamp' }) : 0
  const glitch = cut.transitionIn === 'glitch' && frame < 4

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform,
          transformOrigin: zoom ? '0 0' : '50% 50%',
          filter:
            `${theme === 'offroad' ? OFFROAD_GRADE : ''} ${whipBlur ? `blur(${whipBlur}px)` : ''} ${glitch ? 'hue-rotate(80deg) saturate(2.2) contrast(1.3)' : ''}`.trim() ||
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
      {/* Viñeta para que los textos se lean sobre cualquier fondo (más marcada en camionetas, como la referencia). */}
      <AbsoluteFill
        style={{
          background:
            theme === 'offroad'
              ? 'radial-gradient(ellipse 85% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%), linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.45) 100%)'
              : 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.45) 100%)',
        }}
      />
      {cut.transitionIn === 'flash' ? (
        <AbsoluteFill
          style={{ backgroundColor: '#fff', opacity: interpolate(frame, [0, 6], [0.6, 0], { extrapolateRight: 'clamp' }) }}
        />
      ) : null}
    </AbsoluteFill>
  )
}
