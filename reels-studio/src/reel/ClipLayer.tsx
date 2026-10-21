import { Video } from '@remotion/media'
import React from 'react'
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ReelProps, TimelineCut } from '../plan/types'
import { zoomProgress, zoomTransform } from './zoom'

export const resolveSrc = (src: string) => (/^https?:\/\//.test(src) ? src : staticFile(src))

/** Una toma: recorte del clip + movimiento de cámara + transición de entrada + zoom a lo señalado. */
export const ClipLayer: React.FC<{ cut: TimelineCut; engine: ReelProps['videoEngine']; muted?: boolean }> = ({
  cut,
  engine,
  muted,
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
    const drift = interpolate(frame, [0, cut.durationInFrames], [1.0, 1.06])
    const punch =
      cut.transitionIn === 'zoom'
        ? interpolate(frame, [0, 9], [1.22, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
        : 1
    const whipX =
      cut.transitionIn === 'whip'
        ? interpolate(frame, [0, 7], [width * 0.35, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) })
        : 0
    transform = `translateX(${whipX}px) scale(${drift * punch})`
  }
  const whipBlur = cut.transitionIn === 'whip' ? interpolate(frame, [0, 7], [18, 0], { extrapolateRight: 'clamp' }) : 0
  const glitch = cut.transitionIn === 'glitch' && frame < 6

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform,
          transformOrigin: zoom ? '0 0' : '50% 50%',
          filter: `${whipBlur ? `blur(${whipBlur}px)` : ''} ${glitch ? 'hue-rotate(80deg) saturate(2.2) contrast(1.3)' : ''}`.trim() || undefined,
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
            transform: `translateX(${frame % 2 === 0 ? 14 : -14}px)`,
            mixBlendMode: 'screen',
            background: 'linear-gradient(90deg, rgba(255,0,60,0.25), rgba(0,200,255,0.25))',
          }}
        />
      ) : null}
      {/* Viñeta para que los textos se lean sobre cualquier fondo. */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.45) 100%)',
        }}
      />
      {cut.transitionIn === 'flash' ? (
        <AbsoluteFill
          style={{ backgroundColor: '#fff', opacity: interpolate(frame, [0, 6], [0.95, 0], { extrapolateRight: 'clamp' }) }}
        />
      ) : null}
    </AbsoluteFill>
  )
}
