import { Video } from '@remotion/media'
import React from 'react'
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Energy, ReelProps, TimelineCut } from '../plan/types'
import { usePalette } from './palette'
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
/** Cine: golpes más finos y acercamiento continuo según la energía del tramo (1 calmado … 3 impacto). */
const CINE_PUNCH: Record<Energy, number> = { 1: 0, 2: 0.035, 3: 0.06 }
const CINE_DRIFT: Record<Energy, number> = { 1: 1.04, 2: 1.07, 3: 1.11 }
/** Teaser: acercamiento rápido, como un adelanto de tráiler. */
const TEASER_DRIFT = 1.16
/** Transiciones que cada diseño permite (el resto entra con corte seco). */
const CINE_TRANSITIONS = new Set(['corte', 'zoom', 'whip', 'flash', 'barrido'])
const OFFROAD_TRANSITIONS = new Set(['corte', 'zoom', 'whip'])
/** Barrido de marca: lo que tarda la franja en cruzar (la toma anterior se ve detrás, ver Reel.tsx). */
export const BARRIDO_FRAMES = 10

function punchAt(frame: number, punches: number[], amount = PUNCH_SCALE): number {
  let bump = 0
  for (const p of punches) {
    const t = frame - p
    if (t < 0 || t > PUNCH_IN + PUNCH_OUT) continue
    bump = Math.max(bump, t <= PUNCH_IN ? t / PUNCH_IN : 1 - (t - PUNCH_IN) / PUNCH_OUT)
  }
  return 1 + amount * Easing.out(Easing.quad)(bump)
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
  const { accent } = usePalette()
  const offroad = theme === 'offroad'
  const cine = look === 'cine'
  const sober = cine || offroad
  const energy: Energy = cut.energy ?? 2
  // Cine: transiciones de comercial (las que eligió el director); camionetas solo las más secas.
  const allowed = offroad ? OFFROAD_TRANSITIONS : cine ? CINE_TRANSITIONS : null
  const transitionIn = !allowed || allowed.has(cut.transitionIn) ? cut.transitionIn : 'corte'
  const grade = cine ? (offroad ? CINE_GRADE_OFFROAD : CINE_GRADE) : offroad ? OFFROAD_GRADE : ''

  // Zoom activo hacia una característica (tiene prioridad sobre el movimiento suave).
  const zoom = cut.zooms.find((z) => frame >= z.fromFrame && frame < z.fromFrame + z.durationInFrames)
  let transform: string
  if (zoom) {
    const local = frame - zoom.fromFrame
    const t = zoomTransform(zoom, zoomProgress(local, zoom.durationInFrames, fps), local / zoom.durationInFrames)
    transform = `translate(${t.translateX}px, ${t.translateY}px) scale(${t.scale})`
  } else {
    // Movimiento de cámara continuo para que ninguna toma se sienta estática (más rápido en tramos de impacto).
    const driftEnd = cut.teaser ? TEASER_DRIFT : cine ? (offroad ? Math.min(OFFROAD_DRIFT, CINE_DRIFT[energy]) : CINE_DRIFT[energy]) : sober ? OFFROAD_DRIFT : 1.05
    const drift = interpolate(frame, [0, cut.durationInFrames], [1.0, driftEnd])
    // Transiciones cortas: el cambio se siente inmediato.
    const zoomIn =
      transitionIn === 'zoom'
        ? interpolate(frame, [0, cine ? 9 : 8], [cine ? 1.24 : 1.18, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
        : 1
    const whipX =
      transitionIn === 'whip'
        ? interpolate(frame, [0, cine ? 7 : 6], [width * (cine ? 0.24 : 0.18), 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
        : 0
    const jump = cut.jump % 2 === 1 ? (sober ? OFFROAD_JUMP_SCALE : JUMP_SCALE) : 1
    const punch = cine ? punchAt(frame, cut.punches ?? [], CINE_PUNCH[energy] * (offroad ? 0.6 : 1)) : sober ? 1 : punchAt(frame, cut.punches ?? [])
    transform = `translateX(${whipX}px) scale(${drift * zoomIn * jump * punch})`
  }
  const whipBlur = transitionIn === 'whip' ? interpolate(frame, [0, cine ? 7 : 6], [cine ? 16 : 10, 0], { extrapolateRight: 'clamp' }) : 0
  // Zoom de impacto en cine: entra un poco desenfocado, como un cambio de foco rápido.
  const zoomBlur = cine && transitionIn === 'zoom' ? interpolate(frame, [0, 7], [8, 0], { extrapolateRight: 'clamp' }) : 0
  const glitch = transitionIn === 'glitch' && frame < 4
  // Barrido de marca: la toma nueva aparece detrás de una franja diagonal del color de acento.
  const wipe = transitionIn === 'barrido' ? interpolate(frame, [0, BARRIDO_FRAMES], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }) : 1
  const wipeEdge = -0.25 + wipe * 1.5 // borde de la franja, en fracciones del ancho (la diagonal lo inclina)
  const wipeClip = wipe < 1 ? `polygon(0 0, ${(wipeEdge + 0.25) * 100}% 0, ${wipeEdge * 100}% 100%, 0 100%)` : undefined

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden', clipPath: wipeClip }}>
      <AbsoluteFill
        style={{
          transform,
          transformOrigin: zoom ? '0 0' : '50% 50%',
          filter:
            `${grade} ${whipBlur + zoomBlur ? `blur(${whipBlur + zoomBlur}px)` : ''} ${glitch ? 'hue-rotate(80deg) saturate(2.2) contrast(1.3)' : ''}`.trim() ||
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
      {transitionIn === 'flash' && !cine ? (
        <AbsoluteFill
          style={{ backgroundColor: '#fff', opacity: interpolate(frame, [0, 6], [0.6, 0], { extrapolateRight: 'clamp' }) }}
        />
      ) : null}
      {/* Cine: destello de luz cálida que cruza la pantalla (light leak), no un flash blanco plano. */}
      {transitionIn === 'flash' && cine && frame < 12 ? <LightLeak frame={frame} width={width} /> : null}
    </AbsoluteFill>
      {wipeClip ? <WipeStripe edge={wipeEdge} color={accent} /> : null}
    </AbsoluteFill>
  )
}

/** Fuga de luz: un resplandor naranja/blanco que entra por un lado y se desvanece. */
const LightLeak: React.FC<{ frame: number; width: number }> = ({ frame, width }) => {
  const t = frame / 12
  const x = interpolate(t, [0, 1], [-0.2, 0.9]) * width
  const opacity = interpolate(frame, [0, 2, 12], [0.95, 0.85, 0], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 75% at ${x}px 45%, rgba(255,250,240,0.95) 0%, rgba(255,170,80,0.65) 35%, rgba(255,90,30,0.25) 60%, rgba(0,0,0,0) 80%)` }} />
    </AbsoluteFill>
  )
}

/**
 * Franja diagonal del barrido, centrada en el borde que va descubriendo la toma nueva (el borde baja de
 * edge+0.25 arriba a edge abajo: ~8° de inclinación en el lienzo vertical).
 */
const WipeStripe: React.FC<{ edge: number; color: string }> = ({ edge, color }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        top: 0,
        height: '100%',
        left: `${(edge + 0.125) * 100 - 4.5}%`,
        width: '9%',
        background: color,
        transform: 'skewX(-8deg)',
        boxShadow: `0 0 50px ${color}`,
      }}
    />
  </AbsoluteFill>
)
