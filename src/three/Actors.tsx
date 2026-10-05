import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { Capybara, type Accessory, type CapyPose } from './Capybara'
import { GLBModel } from './GLBModel'
import { useAsset } from '../lib/assets'
import { sfx } from '../lib/sfx'
import { easeOutBack, clamp01 } from '../lib/rng'

type G = ThreeElements['group']

/** Hop + hearts reaction wrapper: tap anything inside to make it bounce. */
export function Pokeable({ children, sound = 'squeak' as const, ...p }: G & { children: ReactNode; sound?: 'squeak' | 'pop' | 'splash' }) {
  const g = useRef<THREE.Group>(null!)
  const start = useRef(-10)
  const now = useRef(0)
  const [hearts, setHearts] = useState<{ id: number; t: number }[]>([])
  useFrame(({ clock }) => {
    now.current = clock.elapsedTime
    const t = clock.elapsedTime - start.current
    if (t >= 0 && t < 0.5) {
      const k = t / 0.5
      g.current.position.y = Math.sin(Math.PI * k) * 0.4
      const sq = k < 0.15 ? 1 - k : k > 0.85 ? 1 - (1 - k) : 1.05
      g.current.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq))
    } else {
      g.current.position.y = 0
      g.current.scale.set(1, 1, 1)
    }
  })
  return (
    <group {...p}>
      <group
        ref={g}
        onPointerDown={(e) => {
          e.stopPropagation()
          start.current = now.current
          sfx(sound)
          const id = Math.random()
          setHearts((h) => [...h.slice(-4), { id, t: now.current }])
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        {children}
      </group>
      {hearts.map((h) => (
        <Hearts key={h.id} born={h.t} />
      ))}
    </group>
  )
}

const heartShape = (() => {
  const s = new THREE.Shape()
  s.moveTo(0, -0.5)
  s.bezierCurveTo(-0.9, 0.1, -0.5, 0.9, 0, 0.45)
  s.bezierCurveTo(0.5, 0.9, 0.9, 0.1, 0, -0.5)
  return new THREE.ShapeGeometry(s, 10)
})()

function Hearts({ born }: { born: number }) {
  const g = useRef<THREE.Group>(null!)
  const seeds = useMemo(() => [0, 1, 2].map((i) => ({ x: (i - 1) * 0.25, d: 0.1 * i })), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff7a9a', transparent: true, side: THREE.DoubleSide, toneMapped: false }), [])
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime - born
    if (!g.current) return
    g.current.visible = t < 1.4
    material.opacity = clamp01(1.4 - t)
    g.current.children.forEach((c, i) => {
      const k = t - seeds[i].d
      c.position.set(seeds[i].x + Math.sin(k * 6 + i) * 0.06, 1.3 + k * 1.1, 0)
      c.scale.setScalar(0.18 * easeOutBack(clamp01(k * 3)))
      c.quaternion.copy(camera.quaternion)
    })
  })
  return (
    <group ref={g}>
      {seeds.map((_, i) => (
        <mesh key={i} geometry={heartShape} material={material} />
      ))}
    </group>
  )
}

/** A capybara that uses the Tripo model when available and the procedural one otherwise. */
export function Capy({
  pose = 'stand',
  accessory = 'none',
  seed = 1,
  assetId,
  height,
  clip,
  ...p
}: G & { pose?: CapyPose; accessory?: Accessory; seed?: number; assetId?: string; height?: number; clip?: string }) {
  const asset = useAsset(assetId)
  const proc = <Capybara pose={pose} accessory={accessory} seed={seed} pokeable={false} />
  if (!asset) return <group {...p}>{proc}</group>
  const sink = pose === 'soak' ? -0.42 * (height ?? asset.height ?? 1) : 0
  return (
    <group {...p}>
      <group position={[0, sink, 0]}>
        <GLBModel url={asset.url} height={height ?? asset.height ?? 1} yaw={asset.yaw ?? 0} clip={clip ?? asset.clip} animate={pose !== 'soak'} fallback={proc} />
      </group>
    </group>
  )
}

/** Walks a capybara around a closed loop, facing along the path. */
export function PathWalker({
  points,
  speed = 0.35,
  offset = 0,
  children,
}: {
  points: [number, number][]
  speed?: number
  offset?: number
  children: ReactNode
}) {
  const g = useRef<THREE.Group>(null!)
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal'), [points])
  const len = useMemo(() => curve.getLength(), [curve])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    const u = (((clock.elapsedTime * speed) / len + offset) % 1 + 1) % 1
    curve.getPointAt(u, g.current.position)
    curve.getTangentAt(u, tmp)
    g.current.rotation.y = Math.atan2(tmp.x, tmp.z)
  })
  return <group ref={g}>{children}</group>
}

/** Scale-in with a springy overshoot, timed from a shared reveal clock. */
export function PopIn({
  at,
  delay = 0,
  dur = 0.55,
  sound = false,
  children,
  ...p
}: G & { at: React.MutableRefObject<number | null>; delay?: number; dur?: number; sound?: boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  const fired = useRef(false)
  useFrame(({ clock }) => {
    if (at.current === null) {
      g.current.scale.setScalar(1)
      g.current.visible = true
      return
    }
    const t = clock.elapsedTime - at.current - delay
    const k = t <= 0 ? 0 : easeOutBack(clamp01(t / dur), 2.4)
    g.current.scale.setScalar(Math.max(0.0001, k))
    g.current.visible = k > 0.001
    if (sound && k > 0 && !fired.current && t < 0.2) {
      fired.current = true
      sfx('pop')
    }
    if (t < 0) fired.current = false
  })
  return (
    <group ref={g} {...p}>
      {children}
    </group>
  )
}
