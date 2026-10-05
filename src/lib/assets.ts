import { useEffect, useState } from 'react'

export type AssetEntry = {
  url: string
  /** Target height in world units after normalization */
  height?: number
  /** Extra yaw (radians) to make the model face +Z */
  yaw?: number
  /** Name of the animation clip to loop (if rigged) */
  clip?: string
  prompt?: string
  task?: string
  rigged?: boolean
  model?: string
}

export type Manifest = { generatedAt?: string; assets: Record<string, AssetEntry> }

let manifest: Manifest = { assets: {} }
let loaded = false
let pending: Promise<Manifest> | null = null
const listeners = new Set<() => void>()

export function loadManifest(): Promise<Manifest> {
  if (pending) return pending
  pending = fetch('/assets/manifest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { assets: {} }))
    .catch(() => ({ assets: {} }))
    .then((m: Manifest) => {
      manifest = { ...m, assets: m.assets || {} }
      loaded = true
      listeners.forEach((l) => l())
      return manifest
    })
  return pending
}

export function getAsset(id: string): AssetEntry | undefined {
  return manifest.assets[id]
}

/** Re-renders once the manifest is loaded; returns the entry if one exists. */
export function useAsset(id: string | undefined): AssetEntry | undefined {
  const [, force] = useState(0)
  useEffect(() => {
    if (loaded) return
    const l = () => force((n) => n + 1)
    listeners.add(l)
    loadManifest()
    return () => {
      listeners.delete(l)
    }
  }, [])
  return id ? manifest.assets[id] : undefined
}

export function useManifestReady(): boolean {
  const [ready, setReady] = useState(loaded)
  useEffect(() => {
    if (loaded) return setReady(true)
    const l = () => setReady(true)
    listeners.add(l)
    loadManifest()
    return () => {
      listeners.delete(l)
    }
  }, [])
  return ready
}

export function allAssets(): Record<string, AssetEntry> {
  return manifest.assets
}
