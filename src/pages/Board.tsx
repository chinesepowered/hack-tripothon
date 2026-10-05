import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { View, PerspectiveCamera, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { GLBModel } from '../three/GLBModel'
import { useAsset, useManifestReady, allAssets } from '../lib/assets'

const CHARACTERS: [string, string][] = [
  ['host', 'Host capybara · biped auto-rig · greet / dance / cheer'],
  ['capy', 'Soaking capybara · text-to-3D'],
  ['capy4', 'Walking capybara · quadruped auto-rig · walk cycle'],
  ['cat', 'Mochi the cat · quadruped auto-rig · walk cycle'],
]
const OBJECTS = ['coffee', 'trophy', 'pillow', 'cake', 'telescope', 'rocket', 'books', 'teddy']
const WORLDS: [string, string][] = [
  ['onsen', 'Capybara Onsen'],
  ['moon', "The Moon's Dark Side"],
  ['kid', 'The Kid You Used to Be'],
]

function Turntable({ id, angle }: { id: string; angle?: number }) {
  const g = useRef<THREE.Group>(null!)
  const a = useAsset(id)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = angle !== undefined ? (angle * Math.PI) / 180 : clock.elapsedTime * 0.5
  })
  if (!a) return null
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, a.height! * 0.75, a.height! * 2.9]} fov={30} onUpdate={(c) => c.lookAt(0, a.height! * 0.45, 0)} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} color="#fff1dc" />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#ffc2d6" />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2} color="#ffe2c4" position={[0, 4, -4]} scale={[8, 4, 1]} />
        <Lightformer intensity={1} color="#c3d4ff" position={[-4, 2, 4]} scale={[6, 4, 1]} />
      </Environment>
      <group ref={g}>
        <GLBModel url={a.url} height={a.height ?? 1} yaw={a.yaw ?? 0} clip={a.clip} />
      </group>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={a.height! * 3} blur={2.2} far={2} />
    </>
  )
}

function Single({ id }: { id: string }) {
  const params = new URLSearchParams(location.search)
  const angle = params.has('a') ? Number(params.get('a')) : undefined
  const ready = useManifestReady()
  return (
    <div className="board-single">
      <Canvas flat dpr={1} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <Suspense fallback={null}>{ready && <Turntable id={id} angle={angle} />}</Suspense>
      </Canvas>
    </div>
  )
}

export function Board({ id }: { id?: string }) {
  const ready = useManifestReady()
  const container = useRef<HTMLDivElement>(null!)
  if (id) return <Single id={id} />
  const assets = allAssets()
  const card = (aid: string, caption: string) =>
    assets[aid] ? (
      <div className="board-card" key={aid}>
        <View className="board-view">
          <Turntable id={aid} />
        </View>
        <b>{aid}</b>
        <small>{caption}</small>
        <code>“{assets[aid].prompt}”</code>
      </div>
    ) : null
  return (
    <div className="board" ref={container}>
      <header>
        <div className="brand">
          <span className="stamp">📮</span> Capy Post — visual asset board
        </div>
        <p>Every character and gift object below was generated with the Tripo API (text-to-3D), and the animals were auto-rigged and animated with Tripo's rig + retarget endpoints.</p>
      </header>
      {ready && (
        <>
          <h3>Characters · Tripo auto-rigged</h3>
          <div className="board-grid four">{CHARACTERS.map(([aid, c]) => card(aid, c))}</div>
          <h3>Gift objects · Tripo text-to-3D</h3>
          <div className="board-grid four">{OBJECTS.map((aid) => card(aid, 'Library gift · text-to-3D, standard texture'))}</div>
          <h3>Worlds</h3>
          <div className="board-grid three">
            {WORLDS.map(([w, name]) => (
              <div className="board-card world" key={w}>
                <img src={`/board/world-${w}.jpg`} alt={name} onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
                <b>{name}</b>
              </div>
            ))}
          </div>
        </>
      )}
      <Canvas eventSource={container} className="board-canvas" flat gl={{ preserveDrawingBuffer: true }}>
        <View.Port />
      </Canvas>
    </div>
  )
}
