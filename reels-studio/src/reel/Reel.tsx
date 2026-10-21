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
import { OffroadCallout, OffroadCounter, OffroadCta, OffroadHook, OffroadList, OffroadTitle } from '../graphics/offroad/OffroadGraphics'
import { Title3D } from '../graphics/Title3D'
import type { Brand, ReelProps, ReelTheme, TimelineGraphic } from '../plan/types'
import { FONT_UI, PALETTES } from '../theme'
import { Captions } from './Captions'
import { ClipLayer, resolveSrc } from './ClipLayer'
import { PaletteProvider } from './palette'

/** Efectos discretos: acompañan, no tapan la voz del asesor. */
const SFX_VOLUME = { whoosh: 0.28, pop: 0.3, hit: 0.32, riser: 0.2 } as const

const Graphic: React.FC<{ g: TimelineGraphic; brand: Brand; theme: ReelTheme }> = ({ g, brand, theme }) => {
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
}

export const Reel: React.FC<ReelProps> = (props) => {
  const frame = useCurrentFrame()
  const theme = props.theme ?? 'ksi'
  const palette = PALETTES[theme] ?? PALETTES.ksi
  const last = props.cuts[props.cuts.length - 1]
  const ctaActive = props.graphics.some(
    (g) => g.type === 'cta_end' && frame >= g.fromFrame && frame < g.fromFrame + g.durationInFrames
  )

  return (
    <PaletteProvider theme={theme}>
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {props.cuts.map((cut, i) => (
        <Sequence key={`cut-${i}`} from={cut.fromFrame} durationInFrames={cut.durationInFrames} name={`${cut.role} · ${cut.clipId}`}>
          <ClipLayer cut={cut} engine={props.videoEngine} theme={theme} />
        </Sequence>
      ))}
      {props.tailFrames > 0 ? (
        <Sequence from={last.fromFrame + last.durationInFrames} durationInFrames={props.tailFrames} name="cola congelada">
          <Freeze frame={last.durationInFrames - 1}>
            <ClipLayer cut={{ ...last, transitionIn: 'corte', zooms: [] }} engine={props.videoEngine} muted theme={theme} />
          </Freeze>
        </Sequence>
      ) : null}

      {props.graphics.map((g) => (
        <Sequence key={g.id} from={g.fromFrame} durationInFrames={g.durationInFrames} name={`${g.type}: ${g.text}`}>
          <Graphic g={g} brand={props.brand} theme={theme} />
        </Sequence>
      ))}

      <Captions lines={props.captions} style={props.captionStyle} theme={theme} />

      {/* Arranque con golpe: destello en los primeros cuadros, junto con el zoom del primer corte (no en camionetas). */}
      {frame < 7 && theme !== 'offroad' ? (
        <AbsoluteFill style={{ backgroundColor: '#fff', opacity: interpolate(frame, [0, 6], [0.65, 0], { extrapolateRight: 'clamp' }) }} />
      ) : null}

      {/* Logo fijo arriba y barra de progreso (retención) */}
      {!ctaActive ? (
        <div style={{ position: 'absolute', top: 70, right: 56, background: 'rgba(255,255,255,0.92)', borderRadius: 16, padding: '10px 16px' }}>
          <Img src={staticFile(props.brand.logoSrc)} style={{ width: 190, display: 'block' }} />
        </div>
      ) : null}
      <div
        style={{
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
    </PaletteProvider>
  )
}
