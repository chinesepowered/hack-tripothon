import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mat, PALETTE } from './materials'
import { mulberry32 } from '../lib/rng'
import type { ThemeId } from '../lib/gift'

export const ISLAND_R = 4.3
export const POOL = { x: -0.75, z: 0.25, r: 1.5 }
/** Where the gift items stand (front-right arc, clear of the pool). */
export const SPOTS: [number, number, number][] = [
  [1.95, 0, -0.85],
  [2.75, 0, 0.75],
  [1.45, 0, 2.15],
]

const TOP: Record<ThemeId, { top: string; topDark: string; side: string; under: string }> = {
  onsen: { top: PALETTE.grass, topDark: PALETTE.grassDark, side: PALETTE.soil, under: PALETTE.rock },
  moon: { top: '#cfcbe0', topDark: '#aaa5c4', side: '#8f89aa', under: '#6f6a8a' },
  kid: { top: '#9fd86b', topDark: '#7cc256', side: '#e0a96d', under: '#b58357' },
}

function noise2(x: number, z: number, s: number) {
  return (
    Math.sin(x * 1.7 + s) * 0.5 +
    Math.sin(z * 2.3 + s * 1.3) * 0.35 +
    Math.sin((x + z) * 3.1 + s * 0.7) * 0.15
  )
}

export function IslandBase({ theme = 'onsen' as ThemeId }) {
  const c = TOP[theme]
  const { topGeo, underGeo, rimGeo } = useMemo(() => {
    // Top slab with a wobbly outline
    const topGeo = new THREE.CylinderGeometry(ISLAND_R, ISLAND_R * 0.93, 0.7, 72, 2)
    const pos = topGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const r = Math.hypot(x, z)
      if (r > 0.01) {
        const a = Math.atan2(z, x)
        const k = 1 + 0.045 * Math.sin(a * 5 + 1) + 0.03 * Math.sin(a * 9 + 2)
        pos.setX(i, x * k)
        pos.setZ(i, z * k)
      }
    }
    topGeo.computeVertexNormals()
    topGeo.translate(0, -0.35, 0)

    // Rocky underside: an inverted, lumpy cone
    const underGeo = new THREE.ConeGeometry(ISLAND_R * 0.93, 3.4, 14, 6)
    underGeo.rotateX(Math.PI)
    const up = underGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < up.count; i++) {
      const x = up.getX(i)
      const y = up.getY(i)
      const z = up.getZ(i)
      const n = noise2(x * 1.3, z * 1.3 + y, 3.1) * 0.28
      const shrink = 1 + n
      up.setXYZ(i, x * shrink, y + noise2(z, x, 1.7) * 0.15, z * shrink)
    }
    underGeo.computeVertexNormals()
    underGeo.translate(0, -0.7 - 1.7, 0)

    // Soft rounded rim so the grass reads like a cushion
    const rimGeo = new THREE.TorusGeometry(ISLAND_R * 0.985, 0.13, 10, 96)
    rimGeo.rotateX(Math.PI / 2)
    const rp = rimGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i)
      const z = rp.getZ(i)
      const a = Math.atan2(z, x)
      const k = 1 + 0.045 * Math.sin(a * 5 + 1) + 0.03 * Math.sin(a * 9 + 2)
      rp.setX(i, x * k)
      rp.setZ(i, z * k)
    }
    rimGeo.computeVertexNormals()
    rimGeo.translate(0, -0.06, 0)
    return { topGeo, underGeo, rimGeo }
  }, [])

  const mats = useMemo(() => [mat(c.side, { rough: 0.95 }), mat(c.top, { rough: 0.95 }), mat(c.side)], [c])

  return (
    <group>
      <mesh geometry={topGeo} material={mats} receiveShadow castShadow />
      <mesh geometry={rimGeo} material={mat(c.top, { rough: 0.95 })} receiveShadow castShadow />
      <mesh geometry={underGeo} material={mat(c.under, { rough: 1, flat: true })} castShadow />
      <FloatingRocks color={c.under} />
    </group>
  )
}

function FloatingRocks({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null!)
  const rocks = useMemo(() => {
    const r = mulberry32(7)
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + r()
      const d = ISLAND_R * (0.75 + r() * 0.5)
      return { x: Math.cos(a) * d, y: -1.4 - r() * 2.2, z: Math.sin(a) * d, s: 0.18 + r() * 0.3, ph: r() * 6 }
    })
  }, [])
  const geo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    g.current.children.forEach((m, i) => {
      const k = rocks[i]
      m.position.y = k.y + Math.sin(t * 0.8 + k.ph) * 0.15
      m.rotation.y = t * 0.2 + k.ph
    })
  })
  return (
    <group ref={g}>
      {rocks.map((k, i) => (
        <mesh key={i} geometry={geo} material={mat(color, { rough: 1, flat: true })} position={[k.x, k.y, k.z]} scale={k.s} castShadow />
      ))}
    </group>
  )
}

/** Scatter helper: random points on the island top, avoiding the pool and other keep-out discs. */
export function scatter(count: number, seed: number, keepOut: [number, number, number][], rMax = ISLAND_R - 0.35) {
  const rnd = mulberry32(seed)
  const pts: [number, number][] = []
  let guard = 0
  while (pts.length < count && guard++ < count * 40) {
    const a = rnd() * Math.PI * 2
    const d = Math.sqrt(rnd()) * rMax
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    if (Math.hypot(x - POOL.x, z - POOL.z) < POOL.r + 0.35) continue
    if (keepOut.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue
    pts.push([x, z])
  }
  return pts
}

export function GrassTufts({ theme = 'onsen' as ThemeId, keepOut }: { theme?: ThemeId; keepOut: [number, number, number][] }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const pts = useMemo(() => scatter(theme === 'moon' ? 0 : 260, 11, keepOut), [theme, keepOut])
  const geo = useMemo(() => new THREE.ConeGeometry(0.06, 0.26, 5).translate(0, 0.12, 0), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9 }), [])
  useLayoutEffect(() => {
    if (!ref.current) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const col = new THREE.Color()
    const rnd = mulberry32(5)
    const base = theme === 'kid' ? ['#7cc256', '#a6dc6e', '#5fb34a'] : ['#6fae58', '#86c46a', '#5c9b4b']
    pts.forEach(([x, z], i) => {
      const s = 0.7 + rnd() * 0.9
      q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4))
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.8 + rnd() * 0.6), s))
      ref.current.setMatrixAt(i, m)
      ref.current.setColorAt(i, col.set(base[i % base.length]))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [pts, theme])
  if (!pts.length) return null
  return <instancedMesh ref={ref} args={[geo, material, pts.length]} castShadow receiveShadow />
}

export function Flowers({ theme = 'onsen' as ThemeId, keepOut }: { theme?: ThemeId; keepOut: [number, number, number][] }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const pts = useMemo(() => scatter(theme === 'moon' ? 40 : 70, 23, keepOut), [theme, keepOut])
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.07, 1).translate(0, 0.08, 0), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: new THREE.Color(theme === 'moon' ? '#6ff2ff' : '#000000'), emissiveIntensity: theme === 'moon' ? 0.9 : 0 }),
    [theme],
  )
  useLayoutEffect(() => {
    if (!ref.current) return
    const m = new THREE.Matrix4()
    const col = new THREE.Color()
    const rnd = mulberry32(9)
    const palette =
      theme === 'moon' ? ['#8ff7ff', '#c7a6ff', '#ffffff'] : theme === 'kid' ? ['#ff6b6b', '#ffd93d', '#6bcBff', '#ffffff'] : ['#ffffff', '#f8b9cc', '#ffd45c']
    pts.forEach(([x, z], i) => {
      const s = 0.7 + rnd() * 0.7
      m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s))
      ref.current.setMatrixAt(i, m)
      ref.current.setColorAt(i, col.set(palette[i % palette.length]))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [pts, theme])
  return <instancedMesh ref={ref} args={[geo, material, pts.length]} castShadow />
}

export function SteppingStones({ theme = 'onsen' as ThemeId }) {
  const stones = useMemo(() => {
    const path: [number, number][] = [
      [0.4, 3.6],
      [0.75, 2.95],
      [0.95, 2.25],
      [0.95, 1.55],
      [0.72, 0.9],
    ]
    return path
  }, [])
  const geo = useMemo(() => new THREE.CylinderGeometry(0.26, 0.3, 0.08, 9), [])
  const color = theme === 'moon' ? '#9993b8' : theme === 'kid' ? '#ffe7a8' : PALETTE.stone
  return (
    <group>
      {stones.map(([x, z], i) => (
        <mesh key={i} geometry={geo} material={mat(color, { rough: 0.95, flat: true })} position={[x, 0.02, z]} rotation={[0, i, 0]} scale={[1, 1, 0.8]} receiveShadow />
      ))}
    </group>
  )
}

export function Craters() {
  const list: [number, number, number][] = [
    [2.6, -1.8, 0.5],
    [-2.4, 2.2, 0.38],
    [3.1, 1.6, 0.3],
    [-3.0, -0.9, 0.42],
  ]
  return (
    <group>
      {list.map(([x, z, r], i) => (
        <group key={i} position={[x, 0.01, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[r, 24]} />
            <meshStandardMaterial color="#aaa5c4" roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
            <torusGeometry args={[r, 0.06, 6, 28]} />
            <meshStandardMaterial color="#dcd8ea" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
