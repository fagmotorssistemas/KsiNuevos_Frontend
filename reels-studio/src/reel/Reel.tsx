import React from 'react'
import { AbsoluteFill, Audio, Freeze, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { CtaEnd } from '../graphics/CtaEnd'
import { FeatureCallout } from '../graphics/FeatureCallout'
import { FeatureList } from '../graphics/FeatureList'
import { HookText } from '../graphics/HookText'
import { PriceTag } from '../graphics/PriceTag'
import { SpecChips } from '../graphics/SpecChips'
import { SpecCounter } from '../graphics/SpecCounter'
import { Sticker } from '../graphics/Sticker'
import { OffroadCallout, OffroadCounter, OffroadCta, OffroadHook, OffroadList, OffroadMud, OffroadTitle } from '../graphics/offroad/OffroadGraphics'
import { CineCallout, CineCounter, CineCta, CineHook, CineList, CinePrice, CineSticker, CineTitle } from '../graphics/cine/CineGraphics'
import { CineFrame, TypefaceProvider } from '../graphics/cine/kit'
import { Title3D } from '../graphics/Title3D'
import { Brillo } from '../graphics/Brillo'
import type { HookStyle } from '../plan/schema'
import type { Brand, ReelLook, ReelProps, ReelTheme, TimelineGraphic } from '../plan/types'
import { FONT_UI, PALETTES } from '../theme'
import { Captions } from './Captions'
import { BARRIDO_FRAMES, ClipLayer, DISOLVER_FRAMES, resolveSrc } from './ClipLayer'
import { PaletteProvider } from './palette'

/** Efectos discretos: acompañan, no tapan la voz del asesor. */
const SFX_VOLUME = { whoosh: 0.28, pop: 0.3, hit: 0.32, riser: 0.2 } as const

const Graphic: React.FC<{ g: TimelineGraphic; brand: Brand; theme: ReelTheme; look: ReelLook; hookStyle: HookStyle }> = ({
  g,
  brand,
  theme,
  look,
  hookStyle,
}) => {
  // El brillo es solo luz sobre el auto: igual en todos los diseños. El barro es solo de camionetas.
  if (g.type === 'brillo') return <Brillo g={g} theme={theme} />
  if (g.type === 'barro') return theme === 'offroad' ? <OffroadMud /> : null
  if (look === 'cine') {
    switch (g.type) {
      case 'hook_text':
        return <CineHook g={g} theme={theme} style={hookStyle} />
      case 'title_3d':
        return <CineTitle g={g} theme={theme} />
      case 'feature_callout':
        return <CineCallout g={g} theme={theme} />
      case 'spec_counter':
        return <CineCounter g={g} theme={theme} />
      case 'spec_chips':
      case 'feature_list':
        return <CineList g={g} theme={theme} />
      case 'price_tag':
        return <CinePrice g={g} theme={theme} />
      case 'cta_end':
        return <CineCta g={g} theme={theme} brand={brand} />
      case 'sticker':
        return <CineSticker g={g} theme={theme} />
    }
  }
  if (theme === 'offroad') {
    switch (g.type) {
      case 'hook_text':
        return <OffroadHook g={g} />
      case 'title_3d':
        return <OffroadTitle g={g} />
      case 'feature_callout':
        return <OffroadCallout g={g} />
      case 'spec_counter':
        return <OffroadCounter g={g} />
      case 'spec_chips':
      case 'feature_list':
        return <OffroadList g={g} />
      case 'cta_end':
        return <OffroadCta g={g} brand={brand} />
      case 'sticker':
        // La encuesta y la cápsula sobrias (si el director pone alguna); las de redes no van con este diseño.
        return <CineSticker g={g} theme={theme} />
      default:
        break
    }
  }
  switch (g.type) {
    case 'hook_text':
      return <HookText g={g} />
    case 'title_3d':
      return <Title3D g={g} />
    case 'feature_callout':
      return <FeatureCallout g={g} />
    case 'spec_counter':
      return <SpecCounter g={g} />
    case 'spec_chips':
      return <SpecChips g={g} />
    case 'feature_list':
      return <FeatureList g={g} />
    case 'price_tag':
      return <PriceTag g={g} />
    case 'cta_end':
      return <CtaEnd g={g} brand={brand} />
    case 'sticker':
      return <Sticker g={g} />
  }
  return null
}

/** Fundido de los planos del teaser: el primero ya está en el cuadro 0; el último se funde de vuelta a la toma. */
const INSERT_FADE = 6

const InsertLayer: React.FC<{
  insert: NonNullable<ReelProps['inserts']>[number]
  first: boolean
  last: boolean
  engine: ReelProps['videoEngine']
  theme: ReelTheme
  look: ReelLook
}> = ({ insert, first, last, engine, theme, look }) => {
  const frame = useCurrentFrame()
  const d = insert.durationInFrames
  // El último se funde de vuelta a la toma; los demás quedan enteros debajo del siguiente mientras entra.
  const opacity = Math.min(
    first ? 1 : interpolate(frame, [0, INSERT_FADE], [0, 1], { extrapolateRight: 'clamp' }),
    last ? interpolate(frame, [d - INSERT_FADE, d], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1
  )
  const cut = {
    ...insert,
    trimEndSec: insert.trimStartSec + d / 30,
    role: 'gancho' as const,
    transitionIn: 'corte' as const,
    captionPlacement: 'abajo' as const,
    zooms: [],
    take: -1,
    jump: 0,
    punches: [],
    energy: 3 as const,
  }
  return (
    <AbsoluteFill style={{ opacity }}>
      <ClipLayer cut={cut} engine={engine} muted insert theme={theme} look={look} />
    </AbsoluteFill>
  )
}

export const Reel: React.FC<ReelProps> = (props) => {
  const frame = useCurrentFrame()
  const theme = props.theme ?? 'ksi'
  const look = props.look ?? 'social'
  const cine = look === 'cine'
  const palette = PALETTES[theme] ?? PALETTES.ksi
  const last = props.cuts[props.cuts.length - 1]
  const ctaActive = props.graphics.some(
    (g) => g.type === 'cta_end' && frame >= g.fromFrame && frame < g.fromFrame + g.durationInFrames
  )

  return (
    <PaletteProvider theme={theme}>
    <TypefaceProvider typeface={props.typeface}>
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {props.cuts.map((cut, i) => {
        const prev = props.cuts[i - 1]
        // Barrido y fundido: debajo de la toma nueva se queda la última imagen de la anterior mientras dura la transición.
        const underFrames =
          !prev || cut.jump > 0
            ? 0
            : cut.transitionIn === 'barrido' && theme !== 'offroad'
              ? BARRIDO_FRAMES
              : cut.transitionIn === 'disolver' && (cine || theme === 'offroad')
                ? DISOLVER_FRAMES
                : 0
        return (
          <React.Fragment key={`cut-${i}`}>
            {underFrames > 0 ? (
              <Sequence from={cut.fromFrame} durationInFrames={Math.min(underFrames, cut.durationInFrames)} name={`${cut.transitionIn}: toma anterior`}>
                <Freeze frame={prev.durationInFrames - 1}>
                  <ClipLayer cut={{ ...prev, transitionIn: 'corte', zooms: [], punches: [] }} engine={props.videoEngine} muted theme={theme} look={look} />
                </Freeze>
              </Sequence>
            ) : null}
            <Sequence from={cut.fromFrame} durationInFrames={cut.durationInFrames} name={`${cut.role} · ${cut.clipId}`}>
              <ClipLayer cut={cut} engine={props.videoEngine} theme={theme} look={look} />
            </Sequence>
          </React.Fragment>
        )
      })}
      {/* Teaser: planos del auto encima de la voz del arranque (sin su audio); se funden entre sí y con la toma. */}
      {/* Cada plano (menos el último) dura un poco más, para que el siguiente se funda encima de él y no del asesor. */}
      {(props.inserts ?? []).map((ins, i, all) => (
        <Sequence
          key={`insert-${i}`}
          from={ins.fromFrame}
          durationInFrames={ins.durationInFrames + (i === all.length - 1 ? 0 : INSERT_FADE)}
          name={`teaser · ${ins.clipId}`}
        >
          <InsertLayer insert={ins} first={i === 0} last={i === all.length - 1} engine={props.videoEngine} theme={theme} look={look} />
        </Sequence>
      ))}
      {props.tailFrames > 0 ? (
        <Sequence from={last.fromFrame + last.durationInFrames} durationInFrames={props.tailFrames} name="cola congelada">
          <Freeze frame={last.durationInFrames - 1}>
            <ClipLayer cut={{ ...last, transitionIn: 'corte', zooms: [] }} engine={props.videoEngine} muted theme={theme} look={look} />
          </Freeze>
        </Sequence>
      ) : null}

      {props.graphics.map((g) => (
        <Sequence key={g.id} from={g.fromFrame} durationInFrames={g.durationInFrames} name={`${g.type}: ${g.text}`}>
          <Graphic g={g} brand={props.brand} theme={theme} look={look} hookStyle={props.hookStyle ?? 'enfoque'} />
        </Sequence>
      ))}

      <Captions lines={props.captions} style={props.captionStyle} theme={theme} look={look} />

      {/* Arranque con golpe: destello en los primeros cuadros, junto con el zoom del primer corte (no en camionetas). */}
      {frame < 7 && theme !== 'offroad' && !cine ? (
        <AbsoluteFill style={{ backgroundColor: '#fff', opacity: interpolate(frame, [0, 6], [0.65, 0], { extrapolateRight: 'clamp' }) }} />
      ) : null}

      {cine ? (
        <CineFrame logoSrc={props.brand.logoSrc} showLogo={!ctaActive} watermark={props.watermark} />
      ) : (
        <>
        {/* Logo fijo arriba y barra de progreso (retención). Camionetas: pantalla limpia, como la referencia; la marca
            va en la firma final. */}
        {!ctaActive && theme !== 'offroad' ? (
          <div style={{ position: 'absolute', top: 70, right: 56, background: 'rgba(255,255,255,0.92)', borderRadius: 16, padding: '10px 16px' }}>
            <Img src={staticFile(props.brand.logoSrc)} style={{ width: 190, display: 'block' }} />
          </div>
        ) : null}
        <div
          style={{
            display: theme === 'offroad' ? 'none' : undefined,
            position: 'absolute',
            top: 0,
            left: 0,
            height: 10,
            width: `${interpolate(frame, [0, props.durationInFrames - 1], [0, 100])}%`,
            background: palette.accent,
            boxShadow: `0 0 14px ${palette.accent}`,
          }}
        />
        {props.watermark ? (
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 50,
              fontFamily: FONT_UI,
              fontWeight: 900,
              fontSize: 30,
              color: 'rgba(255,255,255,0.75)',
              background: 'rgba(0,0,0,0.45)',
              padding: '6px 14px',
              borderRadius: 10,
              letterSpacing: 2,
            }}
          >
            {props.watermark}
          </div>
        ) : null}
        </>
      )}

      {props.sfx.map((s, i) => (
        <Sequence key={`sfx-${i}`} from={s.frame} durationInFrames={45} layout="none">
          <Audio src={staticFile(`sfx/${s.kind}.wav`)} volume={SFX_VOLUME[s.kind]} />
        </Sequence>
      ))}
      {props.music ? (
        <Audio
          src={resolveSrc(props.music.src)}
          trimBefore={Math.round((props.music.startSec ?? 0) * props.fps)}
          // Entra suave y se apaga en el último segundo.
          volume={(f) =>
            props.music!.volume *
            interpolate(f, [0, 12, props.durationInFrames - 36, props.durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}
    </AbsoluteFill>
    </TypefaceProvider>
    </PaletteProvider>
  )
}
