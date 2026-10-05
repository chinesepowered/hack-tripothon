import { Suspense, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

const params = new URLSearchParams(location.search)
export const LITE = params.has('lite')
export const CAPTURE = params.has('capture')

export function Scene({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`scene ${className ?? ''}`}>
      <Canvas
        shadows
        flat
        dpr={CAPTURE ? 1 : [1, 2]}
        camera={{ fov: 36, near: 0.1, far: 300, position: [0.9, 6.4, 13.8] }}
        gl={{ antialias: false, preserveDrawingBuffer: CAPTURE, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>{children}</Suspense>
        {!LITE && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.6} />
            <Vignette offset={0.28} darkness={0.42} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
