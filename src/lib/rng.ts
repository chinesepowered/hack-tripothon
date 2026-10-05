/** Small deterministic PRNG so scenes (and captured videos) are reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
export const easeInOutCubic = (t: number) => {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
export const easeOutBack = (t: number, s = 1.70158) => {
  const x = clamp01(t) - 1
  return 1 + (s + 1) * x * x * x + s * x * x
}
export const easeOutElastic = (t: number) => {
  const x = clamp01(t)
  if (x === 0 || x === 1) return x
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
}
/** 0→1 over [start, start+dur] */
export const seg = (t: number, start: number, dur: number) => clamp01((t - start) / dur)
