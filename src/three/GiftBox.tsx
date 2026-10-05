import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mat, PALETTE } from './materials'
import { easeOutBack, easeOutCubic, seg, easeInOutCubic } from '../lib/rng'

export const BOX = 2.6
const T = 0.12

/** Timeline (seconds after tap) shared with the island reveal. */
export const UNWRAP = {
  bow: [0, 0.55],
  lid: [0.3, 1.0],
  walls: [0.85, 0.75],
  shrink: [1.75, 0.9],
  island: [1.15, 1.9],
  props: 2.6,
  letter: 4.4,
} as const

const panel = new RoundedBoxGeometry(1, 1, 1, 2, 0.04)
const dot = new THREE.CircleGeometry(1, 20)

function Dots({ size, color = '#fff1e8' }: { size: number; color?: string }) {
  const pts = useMemo(() => {
    const out: [number, number][] = []
    const n = 4
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2 === 0) out.push([(i - (n - 1) / 2) * (size / n), (j - (n - 1) / 2) * (size / n)])
    return out
  }, [size])
  return (
    <group>
      {pts.map(([x, y], i) => (
        <mesh key={i} geometry={dot} material={mat(color, { rough: 0.7 })} position={[x, y, 0]} scale={size * 0.05} />
      ))}
    </group>
  )
}

type Props = { openAt: React.MutableRefObject<number | null>; onTap?: () => void; position?: [number, number, number] }

export function GiftBox({ openAt, onTap, position = [0, 0, 0] }: Props) {
  const root = useRef<THREE.Group>(null!)
  const lid = useRef<THREE.Group>(null!)
  const bow = useRef<THREE.Group>(null!)
  const walls = useRef<THREE.Group[]>([])
  const hover = useRef(0)
  const boxM = mat(PALETTE.box, { rough: 0.55 })
  const insideM = mat(PALETTE.boxInside, { rough: 0.9 })
  const ribbonM = mat(PALETTE.ribbon, { rough: 0.35, emissive: '#7a5a00', ei: 0.08 })

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    const t = openAt.current === null ? -1 : now - openAt.current
    // idle: breathe + wiggle, inviting a tap
    if (t < 0) {
      const w = Math.sin(now * 2.2)
      root.current.rotation.z = Math.sin(now * 7) * 0.02 * Math.max(0, Math.sin(now * 0.9))
      root.current.position.y = position[1] + Math.abs(w) * 0.06
      root.current.scale.setScalar(1 + hover.current * 0.03)
      return
    }
    root.current.rotation.z = 0
    root.current.position.y = position[1]
    // bow & ribbons
    const kb = easeOutCubic(seg(t, UNWRAP.bow[0], UNWRAP.bow[1]))
    bow.current.scale.setScalar(Math.max(0.0001, 1 - kb))
    bow.current.rotation.y = kb * 4
    // lid flies off
    const kl = easeOutCubic(seg(t, UNWRAP.lid[0], UNWRAP.lid[1]))
    lid.current.position.set(kl * 1.6, BOX + T / 2 + kl * 4.2, -kl * 1.2)
    lid.current.rotation.set(-kl * 1.1, kl * 0.8, kl * 0.5)
    lid.current.visible = kl < 0.999
    // walls fall open like petals
    const kw = easeOutBack(seg(t, UNWRAP.walls[0], UNWRAP.walls[1]), 2.2)
    const a = (Math.PI / 2) * kw
    // every wall is built as a "front" wall inside a rotated frame, so +x opens outward
    walls.current.forEach((w) => w && (w.rotation.x = a))
    // whole box shrinks away under the growing island
    const ks = easeInOutCubic(seg(t, UNWRAP.shrink[0], UNWRAP.shrink[1]))
    const s = Math.max(0.0001, 1 - ks)
    root.current.scale.set(1 + ks * 0.6, s, 1 + ks * 0.6)
    root.current.visible = ks < 0.999
  })

  const half = BOX / 2
  const wall = (key: string, pos: [number, number, number], rot: [number, number, number], i: number) => (
    <group key={key} ref={(g) => void (walls.current[i] = g!)} position={pos} rotation={rot}>
      {/* wall is built facing +z, pivot on its bottom edge */}
      <group position={[0, BOX / 2, -T / 2]}>
        <mesh geometry={panel} material={boxM} scale={[BOX, BOX, T]} castShadow receiveShadow />
        <mesh geometry={panel} material={insideM} position={[0, 0, -T / 2 - 0.002]} scale={[BOX - 0.1, BOX - 0.1, 0.004]} />
        <group position={[0, 0, T / 2 + 0.004]}>
          <Dots size={BOX} />
        </group>
        {/* ribbon band */}
        <mesh geometry={panel} material={ribbonM} position={[0, 0, T / 2 + 0.01]} scale={[0.32, BOX + 0.02, 0.02]} />
      </group>
    </group>
  )

  return (
    <group
      ref={root}
      position={position}
      onPointerDown={(e) => {
        if (openAt.current !== null) return
        e.stopPropagation()
        onTap?.()
      }}
      onPointerOver={() => {
        hover.current = 1
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hover.current = 0
        document.body.style.cursor = ''
      }}
    >
      {/* bottom */}
      <mesh geometry={panel} material={boxM} position={[0, T / 2, 0]} scale={[BOX, T, BOX]} receiveShadow castShadow />
      <mesh geometry={panel} material={insideM} position={[0, T + 0.002, 0]} scale={[BOX - 0.1, 0.004, BOX - 0.1]} />
      {/* walls: front, back, right, left (rotate the +z-facing wall into place) */}
      {wall('f', [0, T, half], [0, 0, 0], 0)}
      <group rotation={[0, Math.PI, 0]}>{wall('b', [0, T, half], [0, 0, 0], 1)}</group>
      <group rotation={[0, Math.PI / 2, 0]}>{wall('r', [0, T, half], [0, 0, 0], 2)}</group>
      <group rotation={[0, -Math.PI / 2, 0]}>{wall('l', [0, T, half], [0, 0, 0], 3)}</group>
      {/* lid with ribbon + bow */}
      <group ref={lid} position={[0, BOX + T / 2, 0]}>
        <mesh geometry={panel} material={boxM} position={[0, 0.12, 0]} scale={[BOX + 0.2, 0.34, BOX + 0.2]} castShadow />
        <mesh geometry={panel} material={ribbonM} position={[0, 0.13, 0]} scale={[0.34, 0.36, BOX + 0.24]} />
        <mesh geometry={panel} material={ribbonM} position={[0, 0.13, 0]} scale={[BOX + 0.24, 0.36, 0.34]} />
        <group ref={bow} position={[0, 0.32, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} material={ribbonM} position={[s * 0.32, 0.2, 0]} rotation={[0, 0, s * 0.5]} scale={[1, 0.75, 0.6]} castShadow>
              <torusGeometry args={[0.3, 0.1, 12, 28]} />
            </mesh>
          ))}
          <mesh material={ribbonM} position={[0, 0.14, 0]} scale={[0.2, 0.18, 0.2]} castShadow>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={panel} material={ribbonM} position={[s * 0.22, -0.02, 0.36]} rotation={[0.2, s * 0.4, s * 0.35]} scale={[0.16, 0.04, 0.6]} />
          ))}
        </group>
      </group>
    </group>
  )
}
