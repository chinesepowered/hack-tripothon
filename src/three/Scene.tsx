import { Suspense, useEffect, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

const params = new URLSearchParams(location.search)
export const LITE = params.has('lite')
export const CAPTURE = params.has('capture')
/** Capture renders in software GL: MSAA is very expensive there, SMAA is cheap. */
const MSAA = CAPTURE ? Number(params.get('msaa') ?? 0) : 4

/** Capture mode: the recorder drives rendering with explicit timestamps (seconds). */
function CaptureDriver() {
  const advance = useThree((s) => s.advance)
  useEffect(() => {
    ;(window as any).__r3fAdvance = (t: number) => advance(t, true)
  }, [advance])
  return null
}

export function Scene({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`scene ${className ?? ''}`}>
      <Canvas
        shadows
        flat
        frameloop={CAPTURE ? 'never' : 'always'}
        dpr={CAPTURE ? 1 : [1, 1.5]}
        camera={{ fov: 36, near: 0.1, far: 300, position: [0.9, 6.4, 13.8] }}
        gl={{ antialias: false, preserveDrawingBuffer: CAPTURE, powerPreference: 'high-performance' }}
      >
        {CAPTURE && <CaptureDriver />}
        <Suspense fallback={null}>{children}</Suspense>
        {!LITE && (
          <EffectComposer multisampling={MSAA}>
            <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.6} />
            <Vignette offset={0.28} darkness={0.42} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            {MSAA === 0 && params.get('smaa') !== '0' ? <SMAA /> : <></>}
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
