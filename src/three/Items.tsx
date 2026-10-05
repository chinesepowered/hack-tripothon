import { useRef, useMemo, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mat, PALETTE } from './materials'
import { GLBModel } from './GLBModel'
import { useAsset } from '../lib/assets'
import type { GiftItem } from '../lib/gift'
import { Steam } from './Onsen'

type G = ThreeElements['group']
const sphere = new THREE.SphereGeometry(1, 22, 16)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 24)
const rbox = new RoundedBoxGeometry(1, 1, 1, 4, 0.15)
const cone = new THREE.ConeGeometry(1, 1, 20)

function Coffee(p: G) {
  return (
    <group {...p}>
      <mesh geometry={cyl} material={mat('#fff1e0', { rough: 0.5 })} position={[0, 0.35, 0]} scale={[0.32, 0.7, 0.32]} castShadow />
      <mesh geometry={cyl} material={mat('#f6a8b8', { rough: 0.5 })} position={[0, 0.3, 0]} scale={[0.325, 0.1, 0.325]} />
      <mesh material={mat('#fff1e0', { rough: 0.5 })} position={[0.33, 0.38, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.13, 0.04, 10, 20]} />
      </mesh>
      <mesh geometry={cyl} material={mat('#8a5a3a', { rough: 0.4 })} position={[0, 0.69, 0]} scale={[0.28, 0.02, 0.28]} />
      <mesh geometry={sphere} material={mat('#fff6ea')} position={[-0.04, 0.705, 0.02]} scale={[0.07, 0.01, 0.07]} />
      <mesh geometry={sphere} material={mat('#fff6ea')} position={[0.04, 0.705, 0.02]} scale={[0.07, 0.01, 0.07]} />
      <mesh geometry={cone} material={mat('#fff6ea')} position={[0, 0.705, -0.06]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.09, 0.1, 0.01]} />
      <group position={[0, 0.7, 0]}>
        <Steam count={6} radius={0.15} height={0.7} opacity={0.35} />
      </group>
    </group>
  )
}

function Trophy(p: G) {
  const gold = mat('#ffcb45', { rough: 0.25, metal: 0.6, emissive: '#7a5200', ei: 0.15 })
  const pts = useMemo(() => [0, 0.05, 0.24, 0.3, 0.31, 0.28].map((r, i) => new THREE.Vector2(r, i * 0.09)), [])
  return (
    <group {...p}>
      <mesh geometry={rbox} material={mat('#8d5f3b')} position={[0, 0.08, 0]} scale={[0.42, 0.16, 0.42]} castShadow />
      <mesh geometry={cyl} material={gold} position={[0, 0.25, 0]} scale={[0.05, 0.22, 0.05]} castShadow />
      <mesh material={gold} position={[0, 0.34, 0]} castShadow>
        <latheGeometry args={[pts, 24]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={gold} position={[s * 0.3, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.09, 0.025, 8, 16]} />
        </mesh>
      ))}
      <mesh geometry={sphere} material={gold} position={[0, 0.86, 0]} scale={0.07} />
    </group>
  )
}

function Pillow(p: G) {
  return (
    <group {...p}>
      <mesh geometry={rbox} material={mat('#f9b8c8', { rough: 0.95 })} position={[0, 0.2, 0]} scale={[0.8, 0.36, 0.6]} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={sphere} material={mat(PALETTE.eye)} position={[s * 0.14, 0.26, 0.3]} scale={[0.05, 0.012, 0.01]} />
      ))}
      <mesh material={mat(PALETTE.eye)} position={[0, 0.17, 0.3]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />
      </mesh>
    </group>
  )
}

function Cake(p: G) {
  return (
    <group {...p}>
      <mesh geometry={cyl} material={mat('#f7d9a8')} position={[0, 0.17, 0]} scale={[0.45, 0.34, 0.45]} castShadow />
      <mesh geometry={cyl} material={mat('#f9a8c4', { rough: 0.5 })} position={[0, 0.36, 0]} scale={[0.47, 0.08, 0.47]} castShadow />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return <mesh key={i} geometry={sphere} material={mat('#e8384f', { rough: 0.4 })} position={[Math.cos(a) * 0.33, 0.43, Math.sin(a) * 0.33]} scale={0.06} castShadow />
      })}
      {[-0.12, 0, 0.12].map((x, i) => (
        <group key={i} position={[x, 0.5, (i - 1) * 0.06]}>
          <mesh geometry={cyl} material={mat(['#7cc6f2', '#ffd45c', '#a6e3a1'][i])} scale={[0.02, 0.16, 0.02]} />
          <mesh geometry={sphere} material={mat('#ffb347', { emissive: '#ff9a1f', ei: 3 })} position={[0, 0.11, 0]} scale={[0.025, 0.04, 0.025]} />
        </group>
      ))}
    </group>
  )
}

function Books(p: G) {
  const c = ['#6bb6ff', '#ff8a7a', '#ffd45c']
  return (
    <group {...p}>
      {c.map((col, i) => (
        <mesh key={i} geometry={rbox} material={mat(col, { rough: 0.7 })} position={[0, 0.07 + i * 0.13, 0]} rotation={[0, i * 0.3, 0]} scale={[0.6, 0.12, 0.44]} castShadow />
      ))}
      <mesh geometry={sphere} material={mat('#e8384f', { rough: 0.35 })} position={[0, 0.5, 0]} scale={0.13} castShadow />
      <mesh geometry={cyl} material={mat('#6b4423')} position={[0, 0.65, 0]} scale={[0.01, 0.06, 0.01]} />
    </group>
  )
}

function Plant(p: G) {
  return (
    <group {...p}>
      <mesh material={mat('#d9825b')} position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.36, 18]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return <mesh key={i} geometry={sphere} material={mat(PALETTE.leaf, { flat: true })} position={[Math.cos(a) * 0.14, 0.5 + (i % 2) * 0.1, Math.sin(a) * 0.14]} scale={[0.12, 0.22, 0.08]} rotation={[0.3, a, 0]} castShadow />
      })}
    </group>
  )
}

function Telescope(p: G) {
  const brass = mat('#e0b25a', { rough: 0.3, metal: 0.5 })
  return (
    <group {...p}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return <mesh key={i} geometry={cyl} material={mat(PALETTE.woodDark)} position={[Math.cos(a) * 0.15, 0.3, Math.sin(a) * 0.15]} rotation={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]} scale={[0.025, 0.62, 0.025]} castShadow />
      })}
      <group position={[0, 0.65, 0]} rotation={[0, 0, 0.6]}>
        <mesh geometry={cyl} material={brass} rotation={[0, 0, Math.PI / 2]} scale={[0.09, 0.8, 0.09]} castShadow />
        <mesh geometry={cyl} material={brass} position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.12, 0.12, 0.12]} castShadow />
      </group>
    </group>
  )
}

function Rocket(p: G) {
  return (
    <group {...p}>
      <mesh geometry={cyl} material={mat('#fdf6ee', { rough: 0.4 })} position={[0, 0.55, 0]} scale={[0.22, 0.7, 0.22]} castShadow />
      <mesh geometry={cone} material={mat('#ef5b4b', { rough: 0.4 })} position={[0, 1.08, 0]} scale={[0.22, 0.36, 0.22]} castShadow />
      <mesh geometry={sphere} material={mat('#7cc6f2', { rough: 0.1, emissive: '#2a7fb8', ei: 0.4 })} position={[0, 0.66, 0.2]} scale={[0.09, 0.09, 0.04]} />
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return <mesh key={i} geometry={rbox} material={mat('#ef5b4b')} position={[Math.cos(a) * 0.22, 0.25, Math.sin(a) * 0.22]} rotation={[0, -a, 0]} scale={[0.18, 0.3, 0.04]} castShadow />
      })}
    </group>
  )
}

function Teddy(p: G) {
  const fur = mat('#b98352', { rough: 0.95 })
  const light = mat('#e6c39a', { rough: 0.95 })
  return (
    <group {...p}>
      <mesh geometry={sphere} material={fur} position={[0, 0.28, 0]} scale={[0.27, 0.28, 0.24]} castShadow />
      <mesh geometry={sphere} material={light} position={[0, 0.27, 0.15]} scale={[0.16, 0.18, 0.1]} />
      <mesh geometry={sphere} material={fur} position={[0, 0.68, 0]} scale={0.22} castShadow />
      <mesh geometry={sphere} material={light} position={[0, 0.63, 0.17]} scale={[0.09, 0.07, 0.06]} />
      <mesh geometry={sphere} material={mat(PALETTE.eye)} position={[0, 0.66, 0.23]} scale={0.025} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={sphere} material={fur} position={[s * 0.16, 0.86, 0]} scale={0.08} castShadow />
          <mesh geometry={sphere} material={mat(PALETTE.eye)} position={[s * 0.08, 0.72, 0.19]} scale={0.022} />
          <mesh geometry={sphere} material={fur} position={[s * 0.26, 0.32, 0.06]} scale={[0.08, 0.13, 0.08]} castShadow />
          <mesh geometry={sphere} material={fur} position={[s * 0.14, 0.06, 0.12]} scale={[0.09, 0.07, 0.12]} castShadow />
        </group>
      ))}
      <mesh geometry={sphere} material={mat('#e8384f')} position={[0, 0.5, 0.19]} scale={[0.09, 0.04, 0.03]} />
    </group>
  )
}

function Critter({ color = '#f2a65a', ears = 'cat', ...p }: G & { color?: string; ears?: 'cat' | 'dog' }) {
  const fur = mat(color, { rough: 0.9 })
  const legs = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    if (legs.current) legs.current.children.forEach((l, i) => (l.rotation.x = Math.sin(clock.elapsedTime * 7 + (i % 2) * Math.PI) * 0.5))
  })
  return (
    <group {...p}>
      <mesh geometry={sphere} material={fur} position={[0, 0.3, 0]} scale={[0.2, 0.18, 0.32]} castShadow />
      <mesh geometry={sphere} material={fur} position={[0, 0.48, 0.28]} scale={0.17} castShadow />
      {[-1, 1].map((s) =>
        ears === 'cat' ? (
          <mesh key={s} geometry={cone} material={fur} position={[s * 0.09, 0.64, 0.26]} scale={[0.06, 0.1, 0.05]} />
        ) : (
          <mesh key={s} geometry={sphere} material={mat('#8a5a3a')} position={[s * 0.15, 0.5, 0.24]} scale={[0.04, 0.1, 0.06]} />
        ),
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={sphere} material={mat(PALETTE.eye)} position={[s * 0.065, 0.51, 0.43]} scale={0.022} />
      ))}
      <group ref={legs}>
        {[
          [-0.1, 0.18],
          [0.1, -0.18],
          [0.1, 0.18],
          [-0.1, -0.18],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0.18, z]}>
            <mesh geometry={cyl} material={fur} position={[0, -0.09, 0]} scale={[0.045, 0.18, 0.045]} />
          </group>
        ))}
      </group>
      <mesh geometry={cyl} material={fur} position={[0, 0.42, -0.36]} rotation={[-0.7, 0, 0]} scale={[0.03, 0.3, 0.03]} />
    </group>
  )
}

function Duck(p: G) {
  return (
    <group {...p}>
      <mesh geometry={sphere} material={mat('#ffd23f', { rough: 0.35 })} position={[0, 0.2, 0]} scale={[0.28, 0.2, 0.34]} castShadow />
      <mesh geometry={sphere} material={mat('#ffd23f', { rough: 0.35 })} position={[0, 0.45, 0.16]} scale={0.16} castShadow />
      <mesh geometry={sphere} material={mat('#ff8a3d')} position={[0, 0.42, 0.32]} scale={[0.08, 0.04, 0.08]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={sphere} material={mat(PALETTE.eye)} position={[s * 0.07, 0.5, 0.29]} scale={0.022} />
      ))}
    </group>
  )
}

export function Mystery(p: G) {
  const g = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 1.5) * 0.15
  })
  return (
    <group {...p}>
      <group ref={g}>
        <mesh geometry={rbox} material={mat('#c9a3ff', { rough: 0.6 })} position={[0, 0.3, 0]} scale={0.56} castShadow />
        <mesh geometry={rbox} material={mat(PALETTE.ribbon)} position={[0, 0.3, 0]} scale={[0.58, 0.58, 0.1]} />
        <mesh geometry={rbox} material={mat(PALETTE.ribbon)} position={[0, 0.3, 0]} scale={[0.1, 0.58, 0.58]} />
        {[-1, 1].map((s) => (
          <mesh key={s} material={mat(PALETTE.ribbon)} position={[s * 0.1, 0.64, 0]} rotation={[Math.PI / 2, s * 0.5, 0]}>
            <torusGeometry args={[0.09, 0.03, 8, 18]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

const PROCEDURAL: Record<string, (p: G) => ReactNode> = {
  coffee: Coffee,
  trophy: Trophy,
  pillow: Pillow,
  cake: Cake,
  books: Books,
  plant: Plant,
  telescope: Telescope,
  rocket: Rocket,
  teddy: Teddy,
  cat: (p) => <Critter {...p} color="#f2a65a" ears="cat" />,
  dog: (p) => <Critter {...p} color="#d9a066" ears="dog" />,
  duck: Duck,
  mystery: Mystery,
}

export function hasProcedural(id: string) {
  return id in PROCEDURAL
}

/** Shows a gift item: live Tripo GLB, library GLB, procedural stand-in, or a mystery box. */
export function ItemModel({ item, height, ...p }: G & { item: GiftItem; height?: number }) {
  const lib = useAsset(item.lib)
  const Fallback = PROCEDURAL[item.lib || 'mystery'] || Mystery
  const fallback = <Fallback />
  const liveUrl = item.url || (item.task ? `/api/model?task=${encodeURIComponent(item.task)}` : undefined)
  if (liveUrl) {
    return (
      <group {...p}>
        <GLBModel url={liveUrl} height={height ?? 0.95} yaw={-Math.PI / 2} fallback={fallback} />
      </group>
    )
  }
  if (lib) {
    return (
      <group {...p}>
        <GLBModel url={lib.url} height={height ?? lib.height ?? 0.9} yaw={lib.yaw ?? 0} clip={lib.clip} fallback={fallback} />
      </group>
    )
  }
  return <group {...p}>{fallback}</group>
}
