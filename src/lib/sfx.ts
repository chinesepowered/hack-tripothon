// Tiny sound kit. Uses ElevenLabs-generated files from /audio when present,
// otherwise synthesizes cute blips with WebAudio. In capture mode it only
// logs events (with page time) so the video mixer can place the real files.

type SfxName = 'pop' | 'squeak' | 'chime' | 'whoosh' | 'splash' | 'paper' | 'sparkle' | 'thud' | 'ribbon'

declare global {
  interface Window {
    __sfxLog?: { t: number; name: string }[]
    __capture?: boolean
  }
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
const buffers = new Map<string, AudioBuffer | null>()
let music: HTMLAudioElement | null = null

function ac() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

async function loadBuffer(name: string) {
  if (buffers.has(name)) return buffers.get(name)
  buffers.set(name, null)
  try {
    const r = await fetch(`/audio/sfx-${name}.mp3`)
    if (!r.ok || !(r.headers.get('content-type') || '').includes('audio')) return null
    const buf = await ac().decodeAudioData(await r.arrayBuffer())
    buffers.set(name, buf)
    return buf
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0) {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  const t = c.currentTime + delay
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, gain: number, f0: number, f1: number) {
  const c = ac()
  const len = Math.floor(c.sampleRate * dur)
  const b = c.createBuffer(1, len, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = b
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.setValueAtTime(f0, c.currentTime)
  f.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur)
  const g = c.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(master!)
  src.start()
}

function synth(name: SfxName) {
  switch (name) {
    case 'pop':
      tone(520, 0.12, 'sine', 0.5, 1300)
      break
    case 'squeak':
      tone(900, 0.09, 'triangle', 0.35, 1600)
      tone(1500, 0.12, 'triangle', 0.25, 1100, 0.09)
      break
    case 'chime':
      ;[1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.9, 'sine', 0.18, undefined, i * 0.07))
      break
    case 'sparkle':
      ;[1568, 2093, 2637].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, undefined, i * 0.05))
      break
    case 'whoosh':
      noise(0.6, 0.5, 300, 2400)
      break
    case 'splash':
      noise(0.5, 0.5, 1800, 400)
      break
    case 'paper':
      noise(0.25, 0.35, 3000, 5000)
      break
    case 'ribbon':
      noise(0.35, 0.3, 2000, 4500)
      break
    case 'thud':
      tone(140, 0.2, 'sine', 0.6, 60)
      break
  }
}

export function sfx(name: SfxName) {
  if (window.__capture) {
    ;(window.__sfxLog ||= []).push({ t: performance.now(), name })
    return
  }
  if (muted) return
  try {
    const buf = buffers.get(name)
    if (buf) {
      const s = ac().createBufferSource()
      s.buffer = buf
      s.connect(master!)
      s.start()
    } else {
      synth(name)
      loadBuffer(name)
    }
  } catch {
    /* audio is optional */
  }
}

export function setMuted(m: boolean) {
  muted = m
  if (music) music.muted = m
}
export const isMuted = () => muted

const ALL: SfxName[] = ['pop', 'squeak', 'chime', 'whoosh', 'splash', 'paper', 'sparkle', 'thud', 'ribbon']

export function startMusic() {
  if (window.__capture || music) return
  ALL.forEach((n) => loadBuffer(n))
  const a = new Audio('/audio/music.mp3')
  a.loop = true
  a.volume = 0.35
  a.muted = muted
  a.play().catch(() => {})
  music = a
}
