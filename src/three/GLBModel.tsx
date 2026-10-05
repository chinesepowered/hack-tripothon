import { useEffect, useMemo, useRef, Suspense, Component, type ReactNode } from 'react'
import { useFrame, useLoader, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'

type Props = ThreeElements['group'] & {
  url: string
  height?: number
  yaw?: number
  /** Play the first (or named) animation clip */
  animate?: boolean
  clip?: string
  speed?: number
  onReady?: (obj: THREE.Object3D) => void
}

/**
 * Loads a GLB (Tripo output), normalizes it to a target height standing on y=0,
 * centers it, and loops its animation if it has one.
 */
function GLBInner({ url, height = 1, yaw = 0, animate = true, clip, speed = 1, onReady, ...rest }: Props) {
  const gltf = useLoader(GLTFLoader, url)
  const mixer = useRef<THREE.AnimationMixer | null>(null)

  const { object, scale, offset } = useMemo(() => {
    const object = skeletonClone(gltf.scene)
    object.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (o.material) {
          o.material = o.material.clone()
          // Tripo PBR maps can read a little metallic/dark in stylized lighting
          if ('metalness' in o.material) o.material.metalness = Math.min(o.material.metalness ?? 0, 0.25)
          if ('envMapIntensity' in o.material) o.material.envMapIntensity = 0.9
        }
        o.frustumCulled = false
      }
    })
    object.rotation.y = yaw
    object.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(object)
    const size = box.getSize(new THREE.Vector3())
    const scale = size.y > 0 ? height / size.y : 1
    const center = box.getCenter(new THREE.Vector3())
    const offset = new THREE.Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale)
    return { object, scale, offset }
  }, [gltf, height, yaw])

  useEffect(() => {
    if (!animate || !gltf.animations.length) return
    const m = new THREE.AnimationMixer(object)
    const c = (clip && gltf.animations.find((a) => a.name.includes(clip))) || gltf.animations[0]
    m.clipAction(c).play()
    mixer.current = m
    return () => {
      m.stopAllAction()
      mixer.current = null
    }
  }, [object, gltf, animate, clip])

  useEffect(() => {
    onReady?.(object)
    ;(window as any).__glbLoaded = ((window as any).__glbLoaded || 0) + 1
  }, [object, onReady])

  useFrame((_, dt) => mixer.current?.update(Math.min(dt, 0.1) * speed))

  return (
    <group {...rest}>
      <group position={offset} scale={scale}>
        <primitive object={object} />
      </group>
    </group>
  )
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[GLBModel] failed to load, using fallback', err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function GLBModel(props: Props & { fallback?: ReactNode }) {
  const { fallback = null, ...rest } = props
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBInner {...rest} />
      </Suspense>
    </Boundary>
  )
}

/** Clips available in a GLB, for multi-animation characters. */
export function useClipNames(url: string) {
  const gltf = useLoader(GLTFLoader, url)
  return gltf.animations.map((a) => a.name)
}
