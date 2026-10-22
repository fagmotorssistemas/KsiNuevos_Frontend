/**
 * Llanta offroad en 3D (three.js): cubierta con tacos todo terreno en dos filas cruzadas y tacos de hombro, rin oscuro
 * de seis rayos, aro naranja tipo beadlock con pernos y tapa central del color de acento. Se arma con radio 1 y se
 * escala con `radius`; el eje mira a la cámara y `angle` la hace girar (rodar = avanzar radius × ángulo).
 */
import React, { useMemo } from 'react'
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import * as THREE from 'three'
import { usePalette } from '../reel/palette'
import { Stage3D, UNITS_PER_PX } from './Stage3D'

const LUGS = 30
const HALF_WIDTH = 0.36

/** Perfil de la cubierta (radio, ancho): del talón delantero al trasero pasando por la banda de rodadura. */
const PROFILE: [number, number][] = [
  [0.63, 0.3],
  [0.7, 0.33],
  [0.8, 0.355],
  [0.87, HALF_WIDTH],
  [0.905, 0.345],
  [0.92, 0.31],
  [0.925, 0.25],
  [0.925, -0.25],
  [0.92, -0.31],
  [0.905, -0.345],
  [0.87, -HALF_WIDTH],
  [0.8, -0.355],
  [0.7, -0.33],
  [0.63, -0.3],
]

type Parts = {
  body: THREE.BufferGeometry
  lug: THREE.BufferGeometry
  shoulder: THREE.BufferGeometry
  barrel: THREE.BufferGeometry
  lip: THREE.BufferGeometry
  bead: THREE.BufferGeometry
  bolt: THREE.BufferGeometry
  disc: THREE.BufferGeometry
  spoke: THREE.BufferGeometry
  hub: THREE.BufferGeometry
  cap: THREE.BufferGeometry
  nut: THREE.BufferGeometry
}

let parts: Parts | null = null
function tireParts(): Parts {
  if (parts) return parts
  // Las piezas de revolución se arman sobre el eje Y y se giran para que el eje quede hacia la cámara (Z).
  const toZ = (g: THREE.BufferGeometry) => g.rotateX(Math.PI / 2)
  parts = {
    body: toZ(new THREE.LatheGeometry(PROFILE.map(([r, w]) => new THREE.Vector2(r, w)), 72)),
    lug: new THREE.BoxGeometry(0.09, 0.17, 0.25),
    shoulder: new THREE.BoxGeometry(0.11, 0.12, 0.06),
    barrel: toZ(new THREE.CylinderGeometry(0.63, 0.63, 0.58, 48, 1, true)),
    lip: new THREE.TorusGeometry(0.635, 0.028, 12, 72),
    bead: new THREE.TorusGeometry(0.585, 0.04, 10, 72),
    bolt: toZ(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8)),
    disc: new THREE.CircleGeometry(0.6, 48),
    spoke: new THREE.BoxGeometry(0.44, 0.12, 0.07),
    hub: toZ(new THREE.CylinderGeometry(0.17, 0.19, 0.12, 32)),
    cap: toZ(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 32)),
    nut: toZ(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 6)),
  }
  return parts
}

export const Tire3D: React.FC<{ radius: number; angle: number } & Omit<React.ComponentProps<'group'>, 'children'>> = ({ radius, angle, ...groupProps }) => {
  const p = tireParts()
  const { accent } = usePalette()
  const m = useMemo(
    () => ({
      rubber: new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.86, metalness: 0.04, side: THREE.DoubleSide }),
      tread: new THREE.MeshStandardMaterial({ color: '#1A1A1D', roughness: 0.8, metalness: 0.05 }),
      gunmetal: new THREE.MeshStandardMaterial({ color: '#2C2F34', roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide }),
      machined: new THREE.MeshStandardMaterial({ color: '#C9CDD3', roughness: 0.22, metalness: 1 }),
      spoke: new THREE.MeshStandardMaterial({ color: '#4E535B', roughness: 0.3, metalness: 0.95 }),
      shadow: new THREE.MeshStandardMaterial({ color: '#0E0E10', roughness: 0.6, metalness: 0.5 }),
      accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.32, metalness: 0.6 }),
    }),
    [accent]
  )

  return (
    <group {...groupProps} scale={radius}>
      <group rotation={[0, 0, -angle]}>
        <mesh geometry={p.body} material={m.rubber} />
        {/* Tacos de rodadura: dos filas desfasadas e inclinadas al revés (dibujo en V) y tacos de hombro hacia los costados. */}
        {Array.from({ length: LUGS }, (_, k) => {
          const a = (k / LUGS) * Math.PI * 2
          const b = a + Math.PI / LUGS
          return (
            <React.Fragment key={k}>
              <group rotation={[0, 0, a]}>
                <mesh geometry={p.lug} material={m.tread} position={[0.955, 0, 0.15]} rotation={[0.32, 0, 0]} />
                <mesh geometry={p.shoulder} material={m.tread} position={[0.885, 0, 0.36]} />
              </group>
              <group rotation={[0, 0, b]}>
                <mesh geometry={p.lug} material={m.tread} position={[0.955, 0, -0.15]} rotation={[-0.32, 0, 0]} />
                <mesh geometry={p.shoulder} material={m.tread} position={[0.885, 0, -0.36]} />
              </group>
            </React.Fragment>
          )
        })}
        {/* Rin: barril oscuro, fondo en sombra, seis rayos, maza con tuercas y tapa de acento. */}
        <mesh geometry={p.barrel} material={m.gunmetal} />
        <mesh geometry={p.disc} material={m.shadow} position={[0, 0, 0.04]} />
        {Array.from({ length: 6 }, (_, k) => (
          <group key={k} rotation={[0, 0, (k / 6) * Math.PI * 2]}>
            <mesh geometry={p.spoke} material={m.spoke} position={[0.38, 0, 0.2]} rotation={[0, -0.18, 0]} />
          </group>
        ))}
        <mesh geometry={p.hub} material={m.machined} position={[0, 0, 0.22]} />
        {Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6
          return <mesh key={k} geometry={p.nut} material={m.machined} position={[Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.29]} />
        })}
        <mesh geometry={p.cap} material={m.accent} position={[0, 0, 0.3]} />
        {/* Aro beadlock naranja con pernos, al frente del rin. */}
        <mesh geometry={p.lip} material={m.machined} position={[0, 0, 0.29]} />
        <mesh geometry={p.bead} material={m.accent} position={[0, 0, 0.32]} scale={[1, 1, 0.45]} />
        {Array.from({ length: 16 }, (_, k) => {
          const a = (k / 16) * Math.PI * 2
          return <mesh key={k} geometry={p.bolt} material={m.machined} position={[Math.cos(a) * 0.585, Math.sin(a) * 0.585, 0.345]} />
        })}
      </group>
    </group>
  )
}

/** Duración de la transición de la llanta (cuadros a 30 cps). */
export const TIRE_WIPE_FRAMES = 22

/** Radio de la llanta gigante de la transición, en px: más alta que la pantalla para tapar el borde del corte. */
const wipeRadiusPx = (height: number) => height * 0.56

/** Centro (x, en px) de la llanta gigante en el cuadro `frame` de la transición: entra por la izquierda y sale por la derecha. */
export function tireWipeX(frame: number, width: number, height: number): number {
  const r = wipeRadiusPx(height)
  return interpolate(frame, [0, TIRE_WIPE_FRAMES], [-r - 80, width + r + 80], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  })
}

/**
 * Transición de camioneta: una llanta gigante pasa rodando frente a la cámara, como si la camioneta cruzara a
 * centímetros del lente, y detrás de ella aparece la toma nueva (ClipLayer recorta la toma con tireWipeX).
 */
export const TireWipe: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const r = wipeRadiusPx(height)
  const x = tireWipeX(frame, width, height)
  const startX = tireWipeX(0, width, height)
  const sceneX = (x - width / 2) * UNITS_PER_PX
  return (
    <Stage3D sweep={[sceneX + 2, 3]} accentLight={false}>
      <Tire3D radius={r * UNITS_PER_PX} angle={(x - startX) / r} position={[sceneX, -0.25, 0]} rotation={[0.05, -0.32, 0]} />
    </Stage3D>
  )
}
