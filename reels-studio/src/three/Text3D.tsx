/**
 * Texto 3D extruido de verdad (three.js), con reflejos de estudio. Lo usan el título
 * del vehículo y el CTA final.
 */
import { useThree } from '@react-three/fiber'
import React, { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { Font, type FontData } from 'three/addons/loaders/FontLoader.js'
import antonData from './anton.typeface.json'
import montserratData from './montserrat-black.typeface.json'

const FONTS = {
  anton: new Font(antonData as unknown as FontData),
  montserrat: new Font(montserratData as unknown as FontData),
}
export type FontKey = keyof typeof FONTS

/** Iluminación tipo estudio para que el metal refleje algo (sin descargar HDRs). */
export const StudioEnvironment: React.FC = () => {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

type Props = {
  text: string
  font?: FontKey
  size?: number
  depth?: number
  /** Ancho máximo en unidades de escena: si el texto es más largo, se achica. */
  maxWidth?: number
  faceColor: string
  sideColor: string
  metalness?: number
  roughness?: number
} & Omit<React.ComponentProps<'group'>, 'children'>

export const Text3D: React.FC<Props> = ({
  text,
  font = 'anton',
  size = 1,
  depth = 0.35,
  maxWidth = 4.4,
  faceColor,
  sideColor,
  metalness = 0.55,
  roughness = 0.25,
  ...groupProps
}) => {
  const { geometry, fit } = useMemo(() => {
    const g = new TextGeometry(text, {
      font: FONTS[font],
      size,
      depth,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: depth * 0.18,
      bevelSize: size * 0.025,
      bevelSegments: 3,
    })
    g.computeBoundingBox()
    g.center()
    const bb = g.boundingBox!
    const w = bb.max.x - bb.min.x
    return { geometry: g, fit: w > maxWidth ? maxWidth / w : 1 }
  }, [text, font, size, depth, maxWidth])

  useEffect(() => () => geometry.dispose(), [geometry])

  const materials = useMemo(
    () => [
      new THREE.MeshPhysicalMaterial({ color: faceColor, metalness, roughness, clearcoat: 1, clearcoatRoughness: 0.12 }),
      new THREE.MeshStandardMaterial({ color: sideColor, metalness: 0.35, roughness: 0.4 }),
    ],
    [faceColor, sideColor, metalness, roughness]
  )

  return (
    <group {...groupProps}>
      <mesh geometry={geometry} material={materials} scale={fit} />
    </group>
  )
}
