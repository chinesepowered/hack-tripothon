import { useRef, useMemo, useEffect } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mat, PALETTE } from './materials'
import { sfx } from '../lib/sfx'

export type CapyPose = 'stand' | 'walk' | 'soak' | 'loaf'
export type Accessory = 'none' | 'yuzu' | 'towel' | 'party' | 'flowers' | 'courier' | 'helmet' | 'crate'

// Geometries shared by every capybara on screen.
const G = {
  body: new THREE.CapsuleGeometry(0.36, 0.5, 8, 18).rotateX(Math.PI / 2),
  head: new RoundedBoxGeometry(0.46, 0.44, 0.5, 4, 0.17),
  snout: new RoundedBoxGeometry(0.4, 0.3, 0.26, 4, 0.11),
  ball: new THREE.SphereGeometry(1, 20, 14),
  leg: new THREE.CapsuleGeometry(0.085, 0.14, 4, 10),
  cone: new THREE.ConeGeometry(1, 1, 18),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
  torus: new THREE.TorusGeometry(1, 0.12, 8, 24),
}
G.leg.translate(0, -0.07, 0)

type Props = ThreeElements['group'] & {
  pose?: CapyPose
  accessory?: Accessory
  seed?: number
  walkSpeed?: number
  sleepy?: boolean
  tint?: string
  pokeable?: boolean
  /** Increment to trigger a hop from outside. */
  hopSignal?: number
}

export function Capybara({
  pose = 'stand',
  accessory = 'none',
  seed = 1,
  walkSpeed = 1,
  sleepy = false,
  tint,
  pokeable = true,
  hopSignal = 0,
  ...rest
}: Props) {
  const root = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const legs = useRef<THREE.Group[]>([])
  const eyes = useRef<THREE.Mesh[]>([])
  const ears = useRef<THREE.Mesh[]>([])
  const hop = useRef(-10)
  const phase = useMemo(() => (seed * 1.618) % (Math.PI * 2), [seed])

  const fur = mat(tint ?? PALETTE.fur, { rough: 0.85 })
  const furDark = mat(PALETTE.furDark, { rough: 0.9 })
  const nose = mat(PALETTE.nose, { rough: 0.6 })
  const eyeM = mat(PALETTE.eye, { rough: 0.25 })
  const white = mat('#ffffff', { rough: 0.3 })
  const blush = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f59c8c', transparent: true, opacity: 0.55, roughness: 1 }), [])

  const clockRef = useRef(0)
  useEffect(() => {
    if (hopSignal > 0) hop.current = clockRef.current
  }, [hopSignal])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    clockRef.current = t
    const p = t + phase
    const walking = pose === 'walk'
    const resting = pose === 'soak' || pose === 'loaf'

    // Hop reaction (squash & stretch)
    const ht = t - hop.current
    let hy = 0
    let squash = 1
    if (ht >= 0 && ht < 0.55) {
      const k = ht / 0.55
      hy = Math.sin(Math.PI * k) * 0.42
      squash = k < 0.12 ? 1 - k * 1.5 : k > 0.88 ? 1 - (1 - k) * 1.5 : 1.06
    }

    const breathe = 1 + Math.sin(p * 2.1) * 0.018
    const bob = walking ? Math.abs(Math.sin(p * 9 * walkSpeed)) * 0.045 : resting ? Math.sin(p * 1.3) * 0.025 : 0
    body.current.position.y = bob + hy
    body.current.scale.set(1 / Math.sqrt(squash), breathe * squash, 1 / Math.sqrt(squash))

    // Head: gentle nod, little look-around
    head.current.rotation.x = walking ? Math.sin(p * 9 * walkSpeed) * 0.05 : Math.sin(p * 0.7) * 0.06 + (resting ? 0.08 : 0)
    head.current.rotation.y = walking ? 0 : Math.sin(p * 0.37) * 0.25

    // Legs
    legs.current.forEach((leg, i) => {
      if (!leg) return
      const diag = i === 0 || i === 3 ? 0 : Math.PI
      leg.rotation.x = walking ? Math.sin(p * 9 * walkSpeed + diag) * 0.55 : 0
      leg.visible = !resting
    })

    // Blink (or stay blissfully closed)
    const blink = (p * 0.9) % 4.3 < 0.12
    const open = sleepy || pose === 'soak' ? 0.18 : blink ? 0.12 : 1
    eyes.current.forEach((e) => e && (e.scale.y = THREE.MathUtils.lerp(e.scale.y, open * 0.045, 0.5)))

    // Ear twitch
    const tw = (p * 1.3) % 5.1 < 0.15 ? 0.5 : 0
    ears.current.forEach((e, i) => e && (e.rotation.z = (i ? -1 : 1) * tw))
  })

  const poke = (e: any) => {
    if (!pokeable) return
    e.stopPropagation()
    hop.current = clockRef.current
    sfx('squeak')
  }

  const restY = pose === 'soak' ? -0.38 : pose === 'loaf' ? -0.2 : 0

  return (
    <group ref={root} {...rest}>
      <group ref={body} onPointerDown={poke}>
        <group position={[0, restY, 0]}>
          {/* Torso */}
          <mesh geometry={G.body} material={fur} position={[0, 0.5, 0]} scale={[1, 0.95, 1]} castShadow receiveShadow />
          {/* Legs: FL, FR, BL, BR */}
          {[
            [-0.2, 0.3],
            [0.2, 0.3],
            [-0.2, -0.32],
            [0.2, -0.32],
          ].map(([x, z], i) => (
            <group key={i} ref={(g) => void (legs.current[i] = g!)} position={[x, 0.27, z]}>
              <mesh geometry={G.leg} material={furDark} castShadow />
            </group>
          ))}
          {/* Head */}
          <group ref={head} position={[0, 0.72, 0.5]}>
            <mesh geometry={G.head} material={fur} castShadow />
            <mesh geometry={G.snout} material={furDark} position={[0, -0.06, 0.28]} castShadow />
            {/* nostrils */}
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={G.ball} material={nose} position={[s * 0.075, 0.02, 0.41]} scale={[0.035, 0.022, 0.02]} />
            ))}
            {/* smile */}
            <mesh geometry={G.ball} material={nose} position={[0, -0.12, 0.41]} scale={[0.05, 0.01, 0.01]} />
            {/* eyes */}
            {[-1, 1].map((s, i) => (
              <group key={s} position={[s * 0.2, 0.08, 0.12]}>
                <mesh ref={(m) => void (eyes.current[i] = m!)} geometry={G.ball} material={eyeM} scale={[0.045, 0.045, 0.045]} />
                {!sleepy && pose !== 'soak' && (
                  <mesh geometry={G.ball} material={white} position={[s * 0.016, 0.016, 0.03]} scale={0.012} />
                )}
              </group>
            ))}
            {/* blush */}
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={G.ball} material={blush} position={[s * 0.22, -0.06, 0.18]} scale={[0.012, 0.045, 0.06]} />
            ))}
            {/* ears */}
            {[-1, 1].map((s, i) => (
              <mesh
                key={s}
                ref={(m) => void (ears.current[i] = m!)}
                geometry={G.ball}
                material={furDark}
                position={[s * 0.16, 0.22, -0.13]}
                scale={[0.075, 0.06, 0.045]}
              />
            ))}
            <AccessoryMesh kind={accessory} />
          </group>
          {accessory === 'courier' && <Satchel />}
          {accessory === 'crate' && <Crate />}
        </group>
      </group>
    </group>
  )
}

function AccessoryMesh({ kind }: { kind: Accessory }) {
  switch (kind) {
    case 'yuzu':
      return (
        <group position={[0, 0.3, -0.02]}>
          <mesh geometry={G.ball} material={mat(PALETTE.yuzu, { rough: 0.55 })} scale={[0.12, 0.105, 0.12]} castShadow />
          <mesh geometry={G.ball} material={mat(PALETTE.leaf)} position={[0.04, 0.1, 0]} rotation={[0, 0, -0.6]} scale={[0.05, 0.015, 0.03]} />
        </group>
      )
    case 'towel':
      return <mesh geometry={G.box} material={mat('#ffffff', { rough: 1 })} position={[0, 0.25, -0.02]} scale={[0.32, 0.07, 0.24]} castShadow />
    case 'party':
      return (
        <group position={[0.06, 0.32, -0.04]} rotation={[0, 0, -0.25]}>
          <mesh geometry={G.cone} material={mat('#7cc6f2', { rough: 0.6 })} scale={[0.1, 0.26, 0.1]} castShadow />
          <mesh geometry={G.ball} material={mat('#ffd45c')} position={[0, 0.14, 0]} scale={0.035} />
        </group>
      )
    case 'flowers':
      return (
        <group position={[0, 0.215, -0.03]}>
          {Array.from({ length: 9 }).map((_, i) => {
            const a = (i / 9) * Math.PI * 2
            const c = ['#ffffff', '#f8b9cc', '#ffd45c'][i % 3]
            return <mesh key={i} geometry={G.ball} material={mat(c, { rough: 0.7 })} position={[Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2]} scale={0.045} />
          })}
        </group>
      )
    case 'courier':
      return (
        <group position={[0, 0.25, -0.02]}>
          <mesh geometry={G.cyl} material={mat('#3aa7a3', { rough: 0.7 })} scale={[0.17, 0.1, 0.17]} castShadow />
          <mesh geometry={G.cyl} material={mat('#2c8783', { rough: 0.7 })} position={[0, -0.04, 0.12]} scale={[0.15, 0.015, 0.12]} />
          <mesh geometry={G.ball} material={mat('#ffd45c')} position={[0, 0.02, 0.17]} scale={[0.04, 0.03, 0.01]} />
        </group>
      )
    case 'helmet':
      return (
        <mesh geometry={G.ball} position={[0, 0.0, 0.12]} scale={0.48}>
          <meshStandardMaterial color="#cfe8ff" transparent opacity={0.22} roughness={0.05} metalness={0.1} depthWrite={false} />
        </mesh>
      )
    default:
      return null
  }
}

function Satchel() {
  return (
    <group position={[0.36, 0.42, 0.05]}>
      <mesh geometry={G.box} material={mat('#e98a5d', { rough: 0.8 })} scale={[0.1, 0.24, 0.3]} castShadow />
      <mesh geometry={G.box} material={mat('#ffffff', { rough: 0.9 })} position={[0.02, 0.1, 0]} rotation={[0, 0, 0.1]} scale={[0.04, 0.12, 0.2]} />
    </group>
  )
}

function Crate() {
  return (
    <group position={[0, 1.02, -0.05]}>
      <mesh geometry={G.box} material={mat(PALETTE.wood, { rough: 0.9 })} scale={[0.5, 0.36, 0.5]} castShadow />
      <mesh geometry={G.box} material={mat(PALETTE.ribbon, { rough: 0.6 })} scale={[0.52, 0.38, 0.08]} />
      <mesh geometry={G.box} material={mat(PALETTE.ribbon, { rough: 0.6 })} scale={[0.08, 0.38, 0.52]} />
    </group>
  )
}

export const CapyGeometries = G
