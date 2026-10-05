import * as THREE from 'three'

// Shared, cached materials keep draw state small and the palette consistent.
const cache = new Map<string, THREE.Material>()

export function mat(color: string, opts: { rough?: number; metal?: number; emissive?: string; ei?: number; flat?: boolean } = {}) {
  const key = `${color}|${opts.rough ?? 0.8}|${opts.metal ?? 0}|${opts.emissive ?? ''}|${opts.ei ?? 0}|${opts.flat ? 1 : 0}`
  let m = cache.get(key)
  if (!m) {
    const params: THREE.MeshStandardMaterialParameters = {
      color,
      roughness: opts.rough ?? 0.8,
      metalness: opts.metal ?? 0,
      flatShading: !!opts.flat,
    }
    if (opts.emissive) {
      params.emissive = new THREE.Color(opts.emissive)
      params.emissiveIntensity = opts.ei ?? 1
    }
    m = new THREE.MeshStandardMaterial(params)
    cache.set(key, m)
  }
  return m
}

export const PALETTE = {
  fur: '#b07a4a',
  furDark: '#87593a',
  furLight: '#c89262',
  nose: '#4a3022',
  eye: '#1d1410',
  grass: '#93c86f',
  grassDark: '#6fae58',
  soil: '#a9744f',
  rock: '#8f7a6b',
  stone: '#b3aca6',
  stoneDark: '#8e8884',
  water: '#7fd6d2',
  yuzu: '#ffd23f',
  leaf: '#5fae4f',
  torii: '#e5553f',
  wood: '#c08a5a',
  woodDark: '#8d5f3b',
  lantern: '#ffd894',
  sakura: '#f8b9cc',
  sakuraDeep: '#f39ab5',
  cream: '#fff4e6',
  ribbon: '#ffd45c',
  box: '#f28c7a',
  boxInside: '#ffe3d6',
  bucket: '#ffcf3a',
  mailbox: '#ef6b5b',
} as const
