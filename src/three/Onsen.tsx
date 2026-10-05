import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { mat, PALETTE } from './materials'
import { POOL } from './Island'
import { mulberry32 } from '../lib/rng'
import type { ThemeId } from '../lib/gift'

const WATER_Y = 0.16

const waterVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const waterFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform float uGlow;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float rings = sin(r * 22.0 - uTime * 1.8) * 0.5 + 0.5;
  float c1 = sin((p.x + p.y) * 34.0 + uTime * 1.3) * sin((p.x - p.y) * 29.0 - uTime * 1.05);
  float c2 = sin(p.x * 41.0 - uTime * 0.9) * sin(p.y * 37.0 + uTime * 1.2);
  vec3 col = mix(uDeep, uShallow, smoothstep(0.0, 1.0, r));
  col += vec3(0.07) * smoothstep(0.35, 1.0, c1 * 0.5 + 0.5) + vec3(0.05) * smoothstep(0.4, 1.0, c2);
  col += 0.03 * rings;
  float foam = smoothstep(0.84, 0.97, r);
  col = mix(col, uFoam, foam * 0.85);
  col += uGlow * vec3(0.15, 0.45, 0.5) * (1.0 - r);
  gl_FragColor = vec4(col, 0.94);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

function Water({ theme }: { theme: ThemeId }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(theme === 'moon' ? '#2fb7c4' : theme === 'kid' ? '#4cc3ff' : '#4fc2c4') },
      uShallow: { value: new THREE.Color(theme === 'moon' ? '#8ef4f0' : theme === 'kid' ? '#a8e6ff' : PALETTE.water) },
      uFoam: { value: new THREE.Color('#f3fffd') },
      uGlow: { value: theme === 'moon' ? 1 : 0 },
    }),
    [theme],
  )
  useFrame(({ clock }) => (uniforms.uTime.value = clock.elapsedTime))
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 0]} receiveShadow>
      <circleGeometry args={[POOL.r, 48]} />
      <shaderMaterial vertexShader={waterVert} fragmentShader={waterFrag} uniforms={uniforms} transparent />
    </mesh>
  )
}

function RockRing({ theme }: { theme: ThemeId }) {
  const rocks = useMemo(() => {
    const r = mulberry32(41)
    const n = 19
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + r() * 0.12
      const d = POOL.r + 0.08 + r() * 0.08
      const s = 0.26 + r() * 0.17
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, s, h: 0.55 + r() * 0.35, rot: r() * 6, tone: r() > 0.5 }
    })
  }, [])
  const geo = useMemo(() => new THREE.DodecahedronGeometry(1, 1), [])
  const c1 = theme === 'moon' ? '#b9b4d4' : theme === 'kid' ? '#ffb4a2' : PALETTE.stone
  const c2 = theme === 'moon' ? '#958fb4' : theme === 'kid' ? '#ffd6a5' : PALETTE.stoneDark
  return (
    <group>
      {rocks.map((k, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={mat(k.tone ? c1 : c2, { rough: 0.95, flat: true })}
          position={[k.x, 0.1, k.z]}
          rotation={[0, k.rot, 0]}
          scale={[k.s, k.s * k.h, k.s]}
          castShadow
          receiveShadow
        />
      ))}
      {/* basin floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[POOL.r + 0.05, 40]} />
        <meshStandardMaterial color={theme === 'moon' ? '#1f6f7c' : '#3b8f93'} roughness={1} />
      </mesh>
    </group>
  )
}

let steamTex: THREE.Texture | null = null
function getSteamTexture() {
  if (steamTex) return steamTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.4, 'rgba(255,255,255,0.55)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  steamTex = new THREE.CanvasTexture(c)
  steamTex.colorSpace = THREE.SRGBColorSpace
  return steamTex
}

export function Steam({ count = 22, radius = POOL.r * 0.85, height = 2.2, opacity = 0.32 }) {
  const refs = useRef<THREE.Group[]>([])
  const mats = useRef<THREE.MeshBasicMaterial[]>([])
  const puffs = useMemo(() => {
    const r = mulberry32(77)
    return Array.from({ length: count }, () => ({
      a: r() * Math.PI * 2,
      d: Math.sqrt(r()) * radius,
      off: r() * 5,
      life: 3.8 + r() * 2.2,
      drift: (r() - 0.5) * 0.6,
      s: 0.55 + r() * 0.5,
    }))
  }, [count, radius])
  const tex = useMemo(getSteamTexture, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    puffs.forEach((p, i) => {
      const g = refs.current[i]
      const m = mats.current[i]
      if (!g || !m) return
      const k = ((t + p.off) % p.life) / p.life
      g.position.set(Math.cos(p.a) * p.d + Math.sin(t * 0.7 + i) * 0.12 + p.drift * k, WATER_Y + k * height, Math.sin(p.a) * p.d)
      const s = p.s * (0.5 + k * 1.3)
      g.scale.setScalar(s)
      m.opacity = opacity * Math.sin(Math.PI * k) * (1 - k * 0.3)
    })
  })
  return (
    <group>
      {puffs.map((_, i) => (
        <Billboard key={i} ref={(g: any) => void (refs.current[i] = g)}>
          <mesh>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial ref={(m: any) => void (mats.current[i] = m)} map={tex} transparent depthWrite={false} opacity={0} toneMapped={false} />
          </mesh>
        </Billboard>
      ))}
    </group>
  )
}

function FloatingYuzu({ count = 6 }) {
  const g = useRef<THREE.Group>(null!)
  const list = useMemo(() => {
    const r = mulberry32(91)
    return Array.from({ length: count }, () => {
      const a = r() * Math.PI * 2
      const d = 0.35 + r() * (POOL.r - 0.6)
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, ph: r() * 6, sp: 0.15 + r() * 0.2 }
    })
  }, [count])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    g.current.children.forEach((m, i) => {
      const k = list[i]
      const a = Math.atan2(k.z, k.x) + t * k.sp * 0.3
      const d = Math.hypot(k.x, k.z)
      m.position.set(Math.cos(a) * d, WATER_Y + 0.03 + Math.sin(t * 1.6 + k.ph) * 0.02, Math.sin(a) * d)
      m.rotation.y = t * 0.3 + k.ph
    })
  })
  return (
    <group ref={g}>
      {list.map((k, i) => (
        <group key={i} position={[k.x, WATER_Y, k.z]}>
          <mesh material={mat(PALETTE.yuzu, { rough: 0.5 })} scale={[0.13, 0.11, 0.13]} castShadow>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
          <mesh material={mat(PALETTE.leaf)} position={[0.03, 0.1, 0]} rotation={[0, 0, -0.5]} scale={[0.05, 0.012, 0.03]}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Onsen({ theme = 'onsen' as ThemeId, children }: { theme?: ThemeId; children?: React.ReactNode }) {
  return (
    <group position={[POOL.x, 0, POOL.z]}>
      <RockRing theme={theme} />
      <Water theme={theme} />
      <FloatingYuzu />
      <Steam opacity={theme === 'kid' ? 0.18 : 0.3} />
      {children}
    </group>
  )
}

export { WATER_Y }
