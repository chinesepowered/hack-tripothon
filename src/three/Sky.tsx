import { useMemo } from 'react'
import * as THREE from 'three'
import { Stars, Environment, Lightformer } from '@react-three/drei'
import type { ThemeId } from '../lib/gift'
import { Clouds, Earth } from './Props'

export const SKY: Record<
  ThemeId,
  { zenith: string; mid: string; horizon: string; bottom: string; fog: string; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; ambient: number }
> = {
  onsen: { zenith: '#8e9ff2', mid: '#f4aec4', horizon: '#ffd9a8', bottom: '#b9a2e6', fog: '#f5c2c0', sun: '#ffd2a1', sunI: 2.6, hemiSky: '#ffe9d6', hemiGround: '#8d6e5c', hemiI: 1.1, ambient: 0.25 },
  moon: { zenith: '#070b24', mid: '#1c2257', horizon: '#3d3a80', bottom: '#060818', fog: '#1d2150', sun: '#c9d6ff', sunI: 1.9, hemiSky: '#8fa2ff', hemiGround: '#2a2450', hemiI: 0.9, ambient: 0.3 },
  kid: { zenith: '#64c2ff', mid: '#b5e6ff', horizon: '#fff4cc', bottom: '#7cc8ff', fog: '#cfeeff', sun: '#fff1d6', sunI: 2.8, hemiSky: '#ffffff', hemiGround: '#9a8a6a', hemiI: 1.2, ambient: 0.3 },
}

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`
const frag = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uSunDir; uniform vec3 uSun;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  // the camera mostly looks down at the island, so the band below the horizon carries the mood
  vec3 col = mix(uBottom, uMid, smoothstep(-0.8, -0.18, h));
  col = mix(col, uHorizon, smoothstep(-0.2, 0.05, h));
  col = mix(col, uZenith, smoothstep(0.05, 0.65, h));
  float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
  col += uSun * (pow(s, 64.0) * 0.9 + pow(s, 6.0) * 0.18);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`

export function SkyDome({ theme }: { theme: ThemeId }) {
  const c = SKY[theme]
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color(c.zenith) },
      uMid: { value: new THREE.Color(c.mid) },
      uHorizon: { value: new THREE.Color(c.horizon) },
      uBottom: { value: new THREE.Color(c.bottom) },
      uSunDir: { value: new THREE.Vector3(0.6, 0.35, -0.7) },
      uSun: { value: new THREE.Color(theme === 'moon' ? '#000000' : '#fff2c8') },
    }),
    [c, theme],
  )
  return (
    <mesh scale={80} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  )
}

export function Atmosphere({ theme }: { theme: ThemeId }) {
  const c = SKY[theme]
  return (
    <>
      <SkyDome theme={theme} />
      <fog attach="fog" args={[c.fog, 26, 70]} />
      {theme === 'moon' ? (
        <>
          <Stars radius={50} depth={20} count={2500} factor={3} saturation={0.4} fade speed={0.6} />
          <Earth position={[-9, 7.5, -16]} scale={2.4} />
        </>
      ) : (
        <Clouds count={12} radius={21} y={-4.5} color={theme === 'kid' ? '#ffffff' : '#fff1ea'} />
      )}
      <hemisphereLight args={[c.hemiSky, c.hemiGround, c.hemiI]} />
      <ambientLight intensity={c.ambient} />
      <directionalLight
        position={[6, 11, 5]}
        intensity={c.sunI}
        color={c.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-6, 4, -6]} intensity={theme === 'moon' ? 1.2 : 0.6} color={theme === 'moon' ? '#6fe3ff' : '#ffc2d6'} />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2} color={c.horizon} position={[0, 5, -6]} scale={[12, 6, 1]} />
        <Lightformer intensity={1.2} color={c.zenith} position={[-6, 3, 5]} rotation={[0, Math.PI / 2, 0]} scale={[8, 6, 1]} />
        <Lightformer intensity={1} color={c.mid} position={[6, 2, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 4, 1]} />
        <Lightformer intensity={1.5} color="#ffffff" position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 6, 1]} />
      </Environment>
    </>
  )
}
