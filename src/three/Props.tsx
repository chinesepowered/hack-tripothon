import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mat, PALETTE } from './materials'
import { mulberry32 } from '../lib/rng'

type G = ThreeElements['group']

const box = new RoundedBoxGeometry(1, 1, 1, 3, 0.1)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 18)
const sphere = new THREE.SphereGeometry(1, 20, 14)
const ico = new THREE.IcosahedronGeometry(1, 1)
const cone = new THREE.ConeGeometry(1, 1, 4)

export function StoneLantern({ lit = true, ...p }: G & { lit?: boolean }) {
  const stone = mat('#c9c0b8', { rough: 0.95, flat: true })
  const stoneD = mat('#a89f98', { rough: 0.95, flat: true })
  return (
    <group {...p}>
      <mesh geometry={cyl} material={stoneD} position={[0, 0.08, 0]} scale={[0.26, 0.16, 0.26]} castShadow receiveShadow />
      <mesh geometry={cyl} material={stone} position={[0, 0.4, 0]} scale={[0.09, 0.5, 0.09]} castShadow />
      <mesh geometry={box} material={stoneD} position={[0, 0.68, 0]} scale={[0.36, 0.08, 0.36]} castShadow />
      <mesh geometry={box} material={mat(PALETTE.lantern, { emissive: '#ffb347', ei: lit ? 2.2 : 0, rough: 0.6 })} position={[0, 0.84, 0]} scale={[0.24, 0.24, 0.24]} />
      <mesh geometry={cone} material={stone} position={[0, 1.08, 0]} rotation={[0, Math.PI / 4, 0]} scale={[0.34, 0.24, 0.34]} castShadow />
      <mesh geometry={sphere} material={stone} position={[0, 1.24, 0]} scale={0.05} />
      {lit && <pointLight position={[0, 0.85, 0]} color="#ffb862" intensity={1.6} distance={3.2} decay={2} />}
    </group>
  )
}

export function Torii(p: G) {
  const red = mat(PALETTE.torii, { rough: 0.7 })
  const dark = mat('#3b2b2b', { rough: 0.8 })
  return (
    <group {...p}>
      {[-0.62, 0.62].map((x) => (
        <group key={x}>
          <mesh geometry={cyl} material={red} position={[x, 0.85, 0]} scale={[0.08, 1.7, 0.08]} castShadow />
          <mesh geometry={cyl} material={dark} position={[x, 0.06, 0]} scale={[0.1, 0.12, 0.1]} castShadow />
        </group>
      ))}
      <mesh geometry={box} material={red} position={[0, 1.38, 0]} scale={[1.55, 0.1, 0.12]} castShadow />
      <mesh geometry={box} material={red} position={[0, 1.72, 0]} scale={[1.9, 0.13, 0.17]} castShadow />
      <mesh geometry={box} material={dark} position={[0, 1.81, 0]} scale={[2.05, 0.07, 0.2]} castShadow />
      <mesh geometry={box} material={red} position={[0, 1.55, 0]} scale={[0.1, 0.3, 0.1]} />
    </group>
  )
}

export function SakuraTree({ petals = true, color = PALETTE.sakura, deep = PALETTE.sakuraDeep, ...p }: G & { petals?: boolean; color?: string; deep?: string }) {
  const blobs = useMemo(() => {
    const r = mulberry32(13)
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2
      const d = i === 0 ? 0 : 0.55 + r() * 0.35
      return { x: Math.cos(a) * d, y: 2.0 + r() * 0.55 + (i === 0 ? 0.45 : 0), z: Math.sin(a) * d, s: 0.55 + r() * 0.35, c: r() > 0.5 }
    })
  }, [])
  const g = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.015
  })
  return (
    <group {...p}>
      <mesh material={mat(PALETTE.woodDark, { rough: 0.95 })} position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.2, 1.8, 8]} />
      </mesh>
      <mesh material={mat(PALETTE.woodDark, { rough: 0.95 })} position={[0.3, 1.6, 0.05]} rotation={[0, 0, -0.8]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.8, 6]} />
      </mesh>
      <group ref={g}>
        {blobs.map((b, i) => (
          <mesh key={i} geometry={ico} material={mat(b.c ? color : deep, { rough: 0.9, flat: true })} position={[b.x, b.y, b.z]} scale={b.s} castShadow />
        ))}
      </group>
      {petals && <Petals origin={[0, 2.2, 0]} color={color} />}
    </group>
  )
}

export function Petals({ origin = [0, 2, 0] as [number, number, number], count = 46, spread = 3.4, color = PALETTE.sakura as string }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const data = useMemo(() => {
    const r = mulberry32(31)
    return Array.from({ length: count }, () => ({
      x: (r() - 0.5) * 1.6,
      z: (r() - 0.5) * 1.6,
      dx: (r() - 0.2) * spread,
      dz: (r() - 0.5) * spread,
      off: r() * 10,
      life: 5 + r() * 4,
      spin: 1 + r() * 3,
    }))
  }, [count, spread])
  const geo = useMemo(() => new THREE.PlaneGeometry(0.09, 0.06), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }), [color])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const s = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    data.forEach((d, i) => {
      const k = ((t + d.off) % d.life) / d.life
      v.set(
        origin[0] + d.x + d.dx * k + Math.sin(t * 1.3 + i) * 0.15,
        origin[1] - k * (origin[1] + 0.1),
        origin[2] + d.z + d.dz * k,
      )
      e.set(t * d.spin, t * d.spin * 0.7, i)
      q.setFromEuler(e)
      const sc = k > 0.92 ? (1 - k) / 0.08 : 1
      s.setScalar(sc)
      m4.compose(v, q, s)
      ref.current.setMatrixAt(i, m4)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, material, count]} />
}

export function Bamboo(p: G) {
  const stalks = useMemo(() => {
    const r = mulberry32(17)
    return Array.from({ length: 7 }, (_, i) => ({ x: (i - 3) * 0.22 + (r() - 0.5) * 0.1, z: (r() - 0.5) * 0.35, h: 2.2 + r() * 1.3, lean: (r() - 0.5) * 0.12 }))
  }, [])
  const green = mat('#7cbf5a', { rough: 0.7 })
  const node = mat('#5f9e44', { rough: 0.7 })
  const leaf = mat('#8fd06a', { rough: 0.8, flat: true })
  return (
    <group {...p}>
      {stalks.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, 0, s.lean]}>
          <mesh geometry={cyl} material={green} position={[0, s.h / 2, 0]} scale={[0.055, s.h, 0.055]} castShadow />
          {Array.from({ length: Math.floor(s.h / 0.55) }).map((_, j) => (
            <mesh key={j} geometry={cyl} material={node} position={[0, 0.5 + j * 0.55, 0]} scale={[0.065, 0.03, 0.065]} />
          ))}
          <mesh geometry={ico} material={leaf} position={[0.12, s.h - 0.1, 0]} scale={[0.28, 0.08, 0.14]} rotation={[0, i, 0.4]} castShadow />
          <mesh geometry={ico} material={leaf} position={[-0.12, s.h - 0.35, 0]} scale={[0.26, 0.07, 0.12]} rotation={[0, -i, -0.4]} castShadow />
        </group>
      ))}
    </group>
  )
}

export function Mailbox({ flag = true, ...p }: G & { flag?: boolean }) {
  const red = mat(PALETTE.mailbox, { rough: 0.6 })
  return (
    <group {...p}>
      <mesh geometry={cyl} material={mat(PALETTE.woodDark)} position={[0, 0.45, 0]} scale={[0.06, 0.9, 0.06]} castShadow />
      <mesh geometry={box} material={red} position={[0, 0.98, 0]} scale={[0.34, 0.3, 0.52]} castShadow />
      <mesh material={red} position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.52, 0.17]} castShadow>
        <cylinderGeometry args={[1, 1, 1, 18, 1, false, 0, Math.PI]} />
      </mesh>
      <mesh geometry={box} material={mat('#ffffff')} position={[0, 1.0, 0.265]} scale={[0.2, 0.05, 0.01]} />
      {flag && (
        <group position={[0.19, 1.02, -0.05]}>
          <mesh geometry={box} material={mat(PALETTE.ribbon)} position={[0, 0.15, 0]} scale={[0.02, 0.3, 0.02]} />
          <mesh geometry={box} material={mat(PALETTE.ribbon)} position={[0, 0.26, 0.07]} scale={[0.02, 0.1, 0.14]} />
        </group>
      )}
    </group>
  )
}

export function BucketStack(p: G) {
  const y = mat(PALETTE.bucket, { rough: 0.45 })
  const geo = useMemo(() => new THREE.CylinderGeometry(0.17, 0.13, 0.17, 20, 1, true), [])
  const inner = mat('#e8b52a', { rough: 0.5 })
  return (
    <group {...p}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, 0.09 + i * 0.07, 0]}>
          <mesh geometry={geo} material={y} castShadow />
          <mesh geometry={cyl} material={inner} position={[0, -0.08, 0]} scale={[0.13, 0.01, 0.13]} />
        </group>
      ))}
      <group position={[0.42, 0.09, 0.1]} rotation={[0, 0, 0]}>
        <mesh geometry={geo} material={y} castShadow />
        <mesh geometry={cyl} material={inner} position={[0, -0.08, 0]} scale={[0.13, 0.01, 0.13]} />
      </group>
    </group>
  )
}

export function Pedestal({ glow = 0, ...p }: G & { glow?: number }) {
  const ring = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    if (ring.current) {
      const m = ring.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = glow * (0.9 + Math.sin(clock.elapsedTime * 2.2) * 0.4)
    }
  })
  return (
    <group {...p}>
      <mesh geometry={cyl} material={mat(PALETTE.wood, { rough: 0.85 })} position={[0, 0.08, 0]} scale={[0.6, 0.16, 0.6]} castShadow receiveShadow />
      <mesh geometry={cyl} material={mat('#d9a273', { rough: 0.85 })} position={[0, 0.17, 0]} scale={[0.52, 0.03, 0.52]} receiveShadow />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.19, 0]}>
        <torusGeometry args={[0.55, 0.025, 8, 40]} />
        <meshStandardMaterial color="#ffe08a" emissive="#ffc94a" emissiveIntensity={0} />
      </mesh>
    </group>
  )
}

export function Clouds({ count = 9, radius = 13, color = '#ffffff', y = 0 }: { count?: number; radius?: number; color?: string; y?: number }) {
  const g = useRef<THREE.Group>(null!)
  const clouds = useMemo(() => {
    const r = mulberry32(55)
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * 0.4
      const d = radius * (0.75 + r() * 0.5)
      return {
        a,
        d,
        y: y + (r() - 0.5) * 5,
        s: 1.5 + r() * 1.3,
        puffs: Array.from({ length: 5 + Math.floor(r() * 3) }, (_, j) => ({ x: (j - 2.5) * 0.75 + (r() - 0.5) * 0.4, y: r() * 0.45, z: (r() - 0.5) * 0.6, s: 0.55 + r() * 0.5 })),
      }
    })
  }, [count, radius, y])
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 1, emissive: new THREE.Color(color), emissiveIntensity: 0.35 }), [color])
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * 0.012
  })
  return (
    <group ref={g}>
      {clouds.map((c, i) => (
        <group key={i} position={[Math.cos(c.a) * c.d, c.y, Math.sin(c.a) * c.d]} rotation={[0, -c.a + Math.PI / 2, 0]} scale={c.s}>
          {c.puffs.map((p, j) => (
            <mesh key={j} geometry={sphere} material={m} position={[p.x, p.y, p.z]} scale={p.s} />
          ))}
        </group>
      ))}
    </group>
  )
}

// ---------- Moon theme ----------
export function Earth(p: G) {
  const g = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * 0.05
  })
  const land = useMemo(() => {
    const r = mulberry32(3)
    return Array.from({ length: 9 }, () => {
      const u = r() * Math.PI * 2
      const v = Math.acos(2 * r() - 1)
      return { pos: new THREE.Vector3().setFromSphericalCoords(1, v, u), s: 0.25 + r() * 0.3 }
    })
  }, [])
  return (
    <group {...p}>
      <group ref={g}>
        <mesh geometry={sphere}>
          <meshStandardMaterial color="#4f8fe8" roughness={0.6} emissive="#2a5fb8" emissiveIntensity={0.35} />
        </mesh>
        {land.map((l, i) => (
          <mesh key={i} geometry={ico} position={l.pos.clone().multiplyScalar(0.92)} scale={l.s} material={mat('#6fcf6a', { rough: 0.8, flat: true, emissive: '#2f7a2c', ei: 0.3 })} />
        ))}
      </group>
      <mesh geometry={sphere} scale={1.08}>
        <meshBasicMaterial color="#9fd3ff" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function Crystals(p: G) {
  const list = useMemo(() => {
    const r = mulberry32(21)
    return Array.from({ length: 6 }, () => ({ x: (r() - 0.5) * 0.9, z: (r() - 0.5) * 0.9, h: 0.5 + r() * 0.9, tx: (r() - 0.5) * 0.5, tz: (r() - 0.5) * 0.5 }))
  }, [])
  const crystal = useMemo(() => new THREE.OctahedronGeometry(1, 0), [])
  return (
    <group {...p}>
      {list.map((c, i) => (
        <mesh
          key={i}
          geometry={crystal}
          position={[c.x, c.h * 0.5, c.z]}
          rotation={[c.tx, i, c.tz]}
          scale={[0.16, c.h, 0.16]}
          material={mat(i % 2 ? '#b69cff' : '#8ff7ff', { rough: 0.2, emissive: i % 2 ? '#7a5cff' : '#3fd6e8', ei: 1.1, flat: true })}
          castShadow
        />
      ))}
    </group>
  )
}

export function Flag(p: G) {
  const cloth = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    if (cloth.current) cloth.current.rotation.y = Math.sin(clock.elapsedTime * 2) * 0.12
  })
  return (
    <group {...p}>
      <mesh geometry={cyl} material={mat('#e8e8f0', { metal: 0.6, rough: 0.3 })} position={[0, 0.8, 0]} scale={[0.025, 1.6, 0.025]} castShadow />
      <mesh ref={cloth} position={[0.28, 1.42, 0]} castShadow>
        <boxGeometry args={[0.55, 0.36, 0.015]} />
        <meshStandardMaterial color="#ffd45c" roughness={0.7} />
      </mesh>
      <mesh position={[0.28, 1.42, 0.012]}>
        <circleGeometry args={[0.1, 20]} />
        <meshStandardMaterial color="#b07a4a" roughness={0.8} />
      </mesh>
    </group>
  )
}

// ---------- Kid theme ----------
export function Blocks(p: G) {
  const colors = ['#ff6b6b', '#ffd93d', '#6bcbff', '#7ad67a', '#c38bff']
  const stack: [number, number, number, number][] = [
    [0, 0.2, 0, 0],
    [0.42, 0.2, 0.05, 1],
    [0.2, 0.6, 0.02, 2],
    [-0.38, 0.2, 0.3, 3],
    [0.1, 0.2, 0.48, 4],
  ]
  return (
    <group {...p}>
      {stack.map(([x, y, z, c], i) => (
        <mesh key={i} geometry={box} material={mat(colors[c], { rough: 0.5 })} position={[x, y, z]} rotation={[0, i * 0.4, 0]} scale={0.38} castShadow receiveShadow />
      ))}
    </group>
  )
}

export function Crayons(p: G) {
  const colors = ['#ff6b6b', '#6bcbff', '#ffd93d', '#7ad67a']
  return (
    <group {...p}>
      {colors.map((c, i) => (
        <group key={i} position={[i * 0.17 - 0.25, 0.07, (i % 2) * 0.12]} rotation={[0, 0.3 + i * 0.25, Math.PI / 2]}>
          <mesh geometry={cyl} material={mat(c, { rough: 0.6 })} scale={[0.06, 0.62, 0.06]} castShadow />
          <mesh material={mat(c, { rough: 0.6 })} position={[0, 0.39, 0]} scale={[0.06, 0.16, 0.06]} castShadow>
            <coneGeometry args={[1, 1, 18]} />
          </mesh>
          <mesh geometry={cyl} material={mat('#ffffff', { rough: 0.9 })} scale={[0.064, 0.3, 0.064]} />
        </group>
      ))}
    </group>
  )
}

export function Balloons(p: G) {
  const g = useRef<THREE.Group>(null!)
  const colors = ['#ff6b6b', '#ffd93d', '#6bcbff']
  useFrame(({ clock }) => {
    if (!g.current) return
    g.current.children.forEach((c, i) => {
      c.position.y = 2.2 + i * 0.25 + Math.sin(clock.elapsedTime * 1.2 + i) * 0.1
      c.rotation.z = Math.sin(clock.elapsedTime * 0.9 + i) * 0.08
    })
  })
  return (
    <group {...p}>
      <group ref={g}>
        {colors.map((c, i) => (
          <group key={i} position={[(i - 1) * 0.4, 2.2, (i % 2) * 0.2]}>
            <mesh geometry={sphere} material={mat(c, { rough: 0.25 })} scale={[0.3, 0.36, 0.3]} castShadow />
            <mesh geometry={cyl} material={mat('#ffffff')} position={[0 - (i - 1) * 0.2, -1.1, 0]} rotation={[0, 0, (i - 1) * 0.18]} scale={[0.006, 1.8, 0.006]} />
          </group>
        ))}
      </group>
    </group>
  )
}

export function RainbowArch(p: G) {
  const bands = ['#ff6b6b', '#ffa94d', '#ffd93d', '#7ad67a', '#6bcbff', '#c38bff']
  return (
    <group {...p}>
      {bands.map((c, i) => (
        <mesh key={i} position={[0, 0, 0]} castShadow>
          <torusGeometry args={[1.25 - i * 0.12, 0.06, 10, 48, Math.PI]} />
          <meshStandardMaterial color={c} roughness={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.0, 0, 0]}>
          {Array.from({ length: 4 }).map((_, j) => (
            <mesh key={j} geometry={sphere} material={mat('#ffffff', { rough: 1, emissive: '#ffffff', ei: 0.2 })} position={[(j - 1.5) * 0.18, 0.05 + (j % 2) * 0.08, 0]} scale={0.18} />
          ))}
        </group>
      ))}
    </group>
  )
}

export function LollipopTree({ color = '#ff8fb1', ...p }: G & { color?: string }) {
  return (
    <group {...p}>
      <mesh geometry={cyl} material={mat('#ffffff', { rough: 0.6 })} position={[0, 0.8, 0]} scale={[0.06, 1.6, 0.06]} castShadow />
      <mesh geometry={sphere} material={mat(color, { rough: 0.35 })} position={[0, 1.85, 0]} scale={0.55} castShadow />
      <mesh position={[0, 1.85, 0.36]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.32, 0.05, 8, 30]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Simple instanced sparkles that drift upward (moon dust / magic). */
export function Motes({ count = 40, radius = 4, color = '#fff6c8', height = 3 }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const data = useMemo(() => {
    const r = mulberry32(61)
    return Array.from({ length: count }, () => ({ a: r() * 6.28, d: Math.sqrt(r()) * radius, off: r() * 10, life: 4 + r() * 4, s: 0.02 + r() * 0.03 }))
  }, [count, radius])
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 4), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color, toneMapped: false }), [color])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  useLayoutEffect(() => {
    ref.current.frustumCulled = false
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    data.forEach((d, i) => {
      const k = ((t + d.off) % d.life) / d.life
      const s = d.s * Math.sin(Math.PI * k)
      m4.makeScale(s, s, s)
      m4.setPosition(Math.cos(d.a + t * 0.05) * d.d, 0.2 + k * height, Math.sin(d.a + t * 0.05) * d.d)
      ref.current.setMatrixAt(i, m4)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, material, count]} />
}
