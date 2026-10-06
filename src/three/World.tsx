import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { Gift, GiftItem, ThemeId } from '../lib/gift'
import { Atmosphere } from './Sky'
import { IslandBase, GrassTufts, Flowers, SteppingStones, Craters, SPOTS, POOL } from './Island'
import { Onsen, WATER_Y } from './Onsen'
import {
  StoneLantern,
  Torii,
  SakuraTree,
  Bamboo,
  Mailbox,
  BucketStack,
  Pedestal,
  Crystals,
  Flag,
  Blocks,
  Crayons,
  Balloons,
  RainbowArch,
  LollipopTree,
  Motes,
} from './Props'
import { GiftBox, UNWRAP } from './GiftBox'
import { Capy, PathWalker, PopIn, Pokeable } from './Actors'
import { ItemModel, Mystery } from './Items'
import { Capybara } from './Capybara'
import { easeOutBack, easeInOutCubic, seg, lerp } from '../lib/rng'
import { sfx } from '../lib/sfx'
import { useAsset } from '../lib/assets'

export type WorldMode = 'ambient' | 'gift' | 'build'
export type ItemState = 'pending' | 'ready' | 'failed'

type Props = {
  gift: Gift
  mode: WorldMode
  openAt: React.MutableRefObject<number | null>
  onOpen?: () => void
  onLetter?: () => void
  itemStates?: ItemState[]
  onItemTap?: (i: number) => void
  showLabels?: boolean
  /** Shift the framing (fraction of viewport) to make room for UI: [x on wide screens, y on portrait]. */
  shift?: [number, number]
  /** Idle auto-rotation speed of the explore camera. */
  spin?: number
}

const LOOP_A: [number, number][] = [
  [1.0, -0.15],
  [1.85, -2.05],
  [3.45, -1.0],
  [3.75, 0.9],
  [2.8, 2.85],
  [1.05, 3.3],
  [0.35, 1.7],
]
const LOOP_B: [number, number][] = [
  [-1.7, -2.2],
  [-3.35, -1.25],
  [-3.55, 0.55],
  [-2.9, 0.95],
  [-2.55, -0.55],
]

const KEEP_OUT: [number, number, number][] = [
  [2.2, -2.6, 1.1],
  [-2.7, -2.3, 0.9],
  [-0.6, -3.5, 0.8],
  [-2.75, 1.85, 0.5],
  [0.55, -1.75, 0.5],
  [-1.6, 2.4, 0.6],
  [2.85, 2.55, 0.5],
  [-0.35, 2.95, 0.7],
  ...SPOTS.map(([x, , z]) => [x, z, 0.75] as [number, number, number]),
  [0.75, 2.2, 0.5],
  [0.95, 1.3, 0.45],
  [0.4, 3.5, 0.4],
]

function ThemeProps({ theme, at }: { theme: ThemeId; at: React.MutableRefObject<number | null> }) {
  if (theme === 'moon') {
    return (
      <>
        <PopIn at={at} delay={0.0}><Crystals position={[-2.7, 0, -2.3]} scale={1.3} /></PopIn>
        <PopIn at={at} delay={0.12}><Crystals position={[2.2, 0, -2.6]} scale={1.1} rotation={[0, 1, 0]} /></PopIn>
        <PopIn at={at} delay={0.24}><Flag position={[-0.6, 0, -3.5]} /></PopIn>
        <PopIn at={at} delay={0.3}><StoneLantern position={[-2.75, 0, 1.85]} /></PopIn>
        <PopIn at={at} delay={0.36}><StoneLantern position={[0.55, 0, -1.75]} /></PopIn>
        <PopIn at={at} delay={0.42}><Mailbox position={[2.85, 0, 2.55]} rotation={[0, -0.6, 0]} /></PopIn>
        <Craters />
        <Motes count={50} color="#bff6ff" />
      </>
    )
  }
  if (theme === 'kid') {
    return (
      <>
        <PopIn at={at} delay={0.0}><RainbowArch position={[2.2, 0, -2.6]} rotation={[0, -0.5, 0]} scale={1.2} /></PopIn>
        <PopIn at={at} delay={0.12}><LollipopTree position={[-2.7, 0, -2.3]} color="#ff8fb1" /></PopIn>
        <PopIn at={at} delay={0.18}><LollipopTree position={[-1.2, 0, -3.3]} color="#8fd3ff" scale={0.85} /></PopIn>
        <PopIn at={at} delay={0.24}><Blocks position={[-2.75, 0, 1.85]} /></PopIn>
        <PopIn at={at} delay={0.3}><Crayons position={[0.55, 0, -1.75]} /></PopIn>
        <PopIn at={at} delay={0.36}><Balloons position={[2.85, 0, 2.55]} /></PopIn>
        <PopIn at={at} delay={0.42}><Mailbox position={[3.3, 0, 1.6]} rotation={[0, -0.9, 0]} /></PopIn>
      </>
    )
  }
  return (
    <>
      <PopIn at={at} delay={0.0}><Torii position={[2.2, 0, -2.6]} rotation={[0, -0.5, 0]} /></PopIn>
      <PopIn at={at} delay={0.12}><SakuraTree position={[-2.7, 0, -2.3]} /></PopIn>
      <PopIn at={at} delay={0.2}><Bamboo position={[-0.6, 0, -3.5]} /></PopIn>
      <PopIn at={at} delay={0.28}><StoneLantern position={[-2.75, 0, 1.85]} /></PopIn>
      <PopIn at={at} delay={0.34}><StoneLantern position={[0.55, 0, -1.75]} /></PopIn>
      <PopIn at={at} delay={0.4}><BucketStack position={[-1.6, 0, 2.4]} rotation={[0, 0.4, 0]} /></PopIn>
      <PopIn at={at} delay={0.46}><Mailbox position={[2.85, 0, 2.55]} rotation={[0, -0.6, 0]} /></PopIn>
    </>
  )
}

function Soakers({ theme }: { theme: ThemeId }) {
  const capyAsset = useAsset('capy')
  const acc = theme === 'moon' ? (['helmet', 'helmet', 'yuzu'] as const) : (['yuzu', 'towel', 'flowers'] as const)
  // pool-local positions
  const spots: [number, number, number, number][] = [
    [0.35, 0.1, 0.4, 0.95],
    [-0.62, -0.42, 2.4, 0.82],
    [-0.3, 0.72, -2.2, 0.7],
  ]
  return (
    <>
      {spots.map(([x, z, ry, s], i) => (
        <Pokeable key={i} position={[x, WATER_Y, z]} rotation={[0, ry, 0]} sound="splash">
          <Capy pose="soak" accessory={acc[i]} seed={i + 3} assetId="capy" height={s} scale={capyAsset ? 1 : s} />
        </Pokeable>
      ))}
    </>
  )
}

function Host({ mode, openAt }: { mode: WorldMode; openAt: React.MutableRefObject<number | null> }) {
  const host = useAsset('host')
  const [clip, setClip] = useState('standing_relax')
  const last = useRef('')
  useFrame(({ clock }) => {
    let next = 'standing_relax'
    if (mode === 'gift' && openAt.current !== null) {
      const t = clock.elapsedTime - openAt.current
      if (t > UNWRAP.props + 0.4 && t < UNWRAP.letter + 0.4) next = 'greet_01'
      else if (t >= UNWRAP.letter + 0.4 && t < UNWRAP.letter + 6) next = 'dance_01'
    } else if (mode === 'build') next = 'cheer'
    if (next !== last.current) {
      last.current = next
      setClip(next)
    }
  })
  return (
    <group position={[-0.35, 0, 2.95]} rotation={[0, 0.25, 0]}>
      <Pokeable>
        {host ? (
          <Capy assetId="host" clip={clip} height={host.height ?? 1.25} />
        ) : (
          <Capybara pose="stand" accessory="courier" seed={9} pokeable={false} rotation={[0, 0, 0]} />
        )}
      </Pokeable>
    </group>
  )
}

function ItemSpot({
  item,
  index,
  state,
  at,
  showLabel,
  onTap,
}: {
  item: GiftItem
  index: number
  state: ItemState
  at: React.MutableRefObject<number | null>
  showLabel: boolean
  onTap?: () => void
}) {
  const [x, , z] = SPOTS[index]
  const lib = useAsset(item.lib)
  const walks = !!item.walk && (!!lib?.rigged || !lib)
  const [wasPending] = useState(state === 'pending')
  const popRef = useRef<number | null>(null)
  const [popping, setPopping] = useState(false)
  const { clock } = useThree()
  useEffect(() => {
    if (state === 'ready' && wasPending && !popping) {
      popRef.current = clock.elapsedTime
      setPopping(true)
      sfx('pop')
      sfx('sparkle')
    }
  }, [state, wasPending, popping, clock])
  const waitingForPop = state === 'ready' && wasPending && !popping

  const content =
    state === 'pending' ? (
      <WobbleCrate />
    ) : walks ? (
      <PathWalker
        points={Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2
          return [Math.cos(a) * 0.95, Math.sin(a) * 0.95] as [number, number]
        })}
        speed={0.32}
      >
        <ItemModel item={item} height={lib?.height} />
      </PathWalker>
    ) : (
      <group position={[0, 0.19, 0]}>
        <Pokeable sound="pop" onClick={onTap}>
          <ItemModel item={item} height={lib?.height} />
        </Pokeable>
      </group>
    )

  return (
    <group position={[x, 0, z]}>
      <PopIn at={at} delay={0.55 + index * 0.25} sound>
        {!walks && <Pedestal glow={state === 'ready' ? 1 : 0.4} />}
        {waitingForPop ? null : popping ? <PopIn at={popRef} dur={0.7}>{content}</PopIn> : content}
        {popping && <Sparkles count={24} scale={[1.6, 1.6, 1.6]} position={[0, 0.9, 0]} size={4} speed={0.6} color="#fff2a8" />}
      </PopIn>
      {showLabel && (
        <Html position={[0, walks ? 1.3 : [1.95, 1.6, 1.75][index] ?? 1.75, 0]} center distanceFactor={9.5} zIndexRange={[10, 0]}>
          <button className={`item-label ${state}`} onClick={onTap}>
            {state === 'pending' ? '✨ ' : ''}
            {item.label}
          </button>
        </Html>
      )}
    </group>
  )
}

function WobbleCrate() {
  const g = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    g.current.rotation.z = Math.sin(t * 9) * 0.06
    g.current.position.y = 0.19 + Math.abs(Math.sin(t * 4.5)) * 0.08
  })
  return (
    <group ref={g}>
      <Mystery />
    </group>
  )
}

function Workers() {
  return (
    <>
      {[0, 0.5].map((o, i) => (
        <PathWalker key={i} points={LOOP_A} speed={0.75} offset={o}>
          <Capybara pose="walk" accessory="crate" seed={20 + i} walkSpeed={1.4} pokeable scale={0.85} />
        </PathWalker>
      ))}
    </>
  )
}

function Walkers({ theme }: { theme: ThemeId }) {
  const quad = useAsset('capy4')
  return (
    <>
      <PathWalker points={LOOP_A} speed={0.3} offset={0.15}>
        <Pokeable>
          {quad ? <Capy assetId="capy4" pose="walk" /> : <Capybara pose="walk" accessory={theme === 'moon' ? 'helmet' : 'party'} seed={5} pokeable={false} scale={0.8} />}
        </Pokeable>
      </PathWalker>
      <PathWalker points={LOOP_B} speed={0.24} offset={0.4}>
        <Pokeable>
          {quad ? <Capy assetId="capy4" pose="walk" height={0.65} /> : <Capybara pose="walk" accessory="none" seed={8} pokeable={false} scale={0.65} />}
        </Pokeable>
      </PathWalker>
    </>
  )
}

function CameraRig({ mode, openAt, shift, spin = 0.35 }: { mode: WorldMode; openAt: React.MutableRefObject<number | null>; shift?: [number, number]; spin?: number }) {
  const { camera, size } = useThree()
  // capture/debug hook: project a world point to screen pixels (used to aim the scripted cursor)
  useEffect(() => {
    ;(window as any).__project = (x: number, y: number, z: number) => {
      const v = new THREE.Vector3(x, y, z).project(camera)
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height]
    }
  }, [camera, size])
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (shift && (shift[0] || shift[1])) {
      const portrait = size.width / size.height < 0.8
      const sx = portrait ? 0 : shift[0]
      const sy = portrait ? shift[1] : 0
      cam.setViewOffset(size.width, size.height, -size.width * sx, size.height * sy, size.width, size.height)
    } else cam.clearViewOffset()
    return () => cam.clearViewOffset()
  }, [camera, size.width, size.height, shift?.[0], shift?.[1]])
  const controls = useRef<any>(null)
  const [explore, setExplore] = useState(mode !== 'gift')
  const portrait = size.width / size.height < 0.8
  const fit = portrait ? 1.75 : size.width / size.height < 1.3 ? 1.25 : 1
  const target = useMemo(() => new THREE.Vector3(0.3, 0.35, 0.2), [])
  // the gift box should fill a phone screen, so it gets a tighter framing than the island
  const boxPos = useMemo(() => new THREE.Vector3(0, 3.4 * (fit > 1 ? 1.1 : 1), 10.2 * (portrait ? 1.32 : fit)), [fit, portrait])
  const boxLook = useMemo(() => new THREE.Vector3(0, 1.05, 0), [])
  const widePos = useMemo(() => new THREE.Vector3(0.9, 6.4, 13.8).multiplyScalar(fit), [fit])
  const look = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (mode !== 'gift') {
      camera.position.copy(widePos)
      camera.lookAt(target)
    } else {
      camera.position.copy(boxPos)
      camera.lookAt(boxLook)
    }
    setExplore(mode !== 'gift')
  }, [mode, camera, widePos, boxPos, target, boxLook])

  useFrame(({ clock }) => {
    if (explore) return
    const now = clock.elapsedTime
    if (openAt.current === null) {
      camera.position.set(boxPos.x + Math.sin(now * 0.4) * 0.35, boxPos.y + Math.sin(now * 0.3) * 0.12, boxPos.z)
      camera.lookAt(boxLook)
      return
    }
    const t = now - openAt.current
    const k = easeInOutCubic(seg(t, 0.7, 3.0))
    camera.position.lerpVectors(boxPos, widePos, k)
    look.lerpVectors(boxLook, target, k)
    camera.lookAt(look)
    if (t > 3.8) {
      setExplore(true)
    }
  })

  return explore ? (
    <OrbitControls
      ref={controls}
      makeDefault
      target={target}
      enablePan={false}
      minDistance={7}
      maxDistance={26 * fit}
      maxPolarAngle={1.36}
      autoRotate
      autoRotateSpeed={spin}
      enableDamping
    />
  ) : null
}

export function World({ gift, mode, openAt, onOpen, onLetter, itemStates, onItemTap, showLabels = true, shift, spin }: Props) {
  const theme = gift.theme
  const island = useRef<THREE.Group>(null!)
  const propsAt = useRef<number | null>(null)
  const letterSent = useRef(false)
  const [labels, setLabels] = useState(mode !== 'gift')
  const [burst, setBurst] = useState(false)
  const { clock } = useThree()

  useEffect(() => {
    letterSent.current = false
    setLabels(mode !== 'gift')
    propsAt.current = null
  }, [mode, gift])

  useFrame(({ clock }) => {
    const g = island.current
    if (mode !== 'gift') {
      g.scale.setScalar(1)
      g.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.08
      return
    }
    if (openAt.current === null) {
      g.scale.setScalar(0.26)
      g.position.y = 1.15
      return
    }
    const t = clock.elapsedTime - openAt.current
    const k = easeOutBack(seg(t, UNWRAP.island[0], UNWRAP.island[1]), 1.3)
    g.scale.setScalar(lerp(0.26, 1, k))
    g.position.y = lerp(1.15, 0, Math.min(1, k)) + (t > UNWRAP.island[0] + UNWRAP.island[1] ? Math.sin(clock.elapsedTime * 0.5) * 0.08 : 0)
    if (propsAt.current === null && t > 0) propsAt.current = openAt.current + UNWRAP.props
    if (t > UNWRAP.props + 0.6 && !labels) setLabels(true)
    if (t > UNWRAP.letter && !letterSent.current) {
      letterSent.current = true
      onLetter?.()
    }
  })

  const open = () => {
    if (openAt.current !== null) return
    openAt.current = clock.elapsedTime
    propsAt.current = clock.elapsedTime + UNWRAP.props
    sfx('ribbon')
    setTimeout(() => sfx('whoosh'), 300)
    setTimeout(() => sfx('chime'), 1200)
    setBurst(true)
    onOpen?.()
  }

  const at = mode === 'gift' ? propsAt : { current: null as number | null }
  const items = gift.items.slice(0, 3)

  return (
    <>
      <Atmosphere theme={theme} />
      <group ref={island}>
        <IslandBase theme={theme} />
        <GrassTufts theme={theme} keepOut={KEEP_OUT} />
        <Flowers theme={theme} keepOut={KEEP_OUT} />
        <SteppingStones theme={theme} />
        <Onsen theme={theme}>
          <Soakers theme={theme} />
        </Onsen>
        <ThemeProps theme={theme} at={at} />
        {items.map((item, i) => (
          <ItemSpot
            key={i}
            item={item}
            index={i}
            state={itemStates?.[i] ?? 'ready'}
            at={at}
            showLabel={showLabels && labels}
            onTap={() => onItemTap?.(i)}
          />
        ))}
        <PopIn at={at} delay={0.9}>
          <Walkers theme={theme} />
        </PopIn>
        {mode === 'build' && <Workers />}
        <PopIn at={at} delay={1.1} sound>
          <Host mode={mode} openAt={openAt} />
        </PopIn>
      </group>
      {mode === 'gift' && <GiftBox openAt={openAt} onTap={open} />}
      {mode === 'gift' && burst && <Sparkles count={80} scale={[9, 5, 9]} position={[0, 2.2, 0]} size={6} speed={0.8} color="#fff1b0" />}
      <CameraRig mode={mode} openAt={openAt} shift={shift} spin={spin} />
    </>
  )
}

export { POOL }
