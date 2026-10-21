import React from 'react'
import { Composition } from 'remotion'
import demoProps from '../examples/trailblazer/props.json'
import type { ReelProps } from './plan/types'
import { Reel } from './reel/Reel'

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    defaultProps={demoProps as unknown as ReelProps}
    // Duración y tamaño salen del plan: cada Reel dura lo que Gemini decidió.
    calculateMetadata={({ props }) => ({
      durationInFrames: props.durationInFrames,
      fps: props.fps,
      width: props.width,
      height: props.height,
    })}
  />
)
