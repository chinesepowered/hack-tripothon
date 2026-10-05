#!/usr/bin/env node
// Generates all Capy Post audio with ElevenLabs:
//  - narration for the demo walkthrough (capture/audio/n-*.mp3 + narration.json)
//  - background music (public/audio/music.mp3, also used in the app)
//  - sound effects (public/audio/sfx-*.mp3, also used in the app)
// Usage: ELEVENLABS_API_KEY=... NODE_USE_ENV_PROXY=1 node scripts/generate-audio.mjs [narration|music|sfx]
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const KEY = process.env.ELEVENLABS_API_KEY
if (!KEY) {
  console.error('ELEVENLABS_API_KEY is not set')
  process.exit(1)
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const NARR_DIR = path.join(ROOT, 'capture/audio')
const PUB = path.join(ROOT, 'public/audio')
const VOICE = process.env.EL_VOICE || 'cgSgspJ2msm6clMCkdW9' // Jessica: playful, bright, warm
const MODEL = process.env.EL_MODEL || 'eleven_multilingual_v2'

export const NARRATION = [
  {
    id: 'intro',
    text: 'This is Capy Post. Tell it who a gift is for, and three things they love. A crew of capybaras builds them a tiny world, wraps it up, and delivers it as a link.',
  },
  {
    id: 'form',
    text: "Let's make one for Sam, who just moved across the world. A cozy onsen. From the capy shelf, a birthday cake and a tiny cat. And something brand new, typed in: a little red bicycle with a basket.",
  },
  {
    id: 'build',
    text: "Anything you type gets sculpted from scratch by Tripo's text to 3D. That part is sped up here; it takes a couple of minutes. Meanwhile, the crew hauls crates onto the island. The cat was auto-rigged by Tripo as a four-legged animal, which is why it actually walks.",
  },
  { id: 'wrap', text: 'Wrap it up, and you get a link. No app, no login, nothing to install.' },
  {
    id: 'unwrap',
    text: "Here's what Sam sees. A present, waiting. Tap it... the ribbon unties, the box falls open, and a whole world grows out of it.",
  },
  {
    id: 'letter',
    text: 'The host capybara is a Tripo model too, rigged as a biped, so it can wave hello while your letter unfolds. Then Sam can wander around, poke the capybaras soaking in the hot spring, and tap each gift to read its note.',
  },
  {
    id: 'outro',
    text: "There are worlds for the moon's dark side, and for the kid you used to be. Every character and object you've seen was generated, rigged, and animated with Tripo. Capy Post. Send someone a tiny world.",
  },
]

const SFX = {
  pop: { text: 'single soft cute bubbly pop, cartoon, short', d: 0.6 },
  squeak: { text: 'tiny cute squeaky toy squeak, short and happy', d: 0.6 },
  chime: { text: 'gentle magical sparkle chime, bright bells, short', d: 1.6 },
  sparkle: { text: 'twinkling fairy sparkle shimmer, short', d: 1.2 },
  whoosh: { text: 'soft airy whoosh, light and quick', d: 0.8 },
  splash: { text: 'small playful water splash in a hot spring', d: 0.8 },
  paper: { text: 'paper letter unfolding, crisp and gentle', d: 1.0 },
  ribbon: { text: 'satin ribbon being pulled and untied, quick silky swish', d: 0.8 },
  thud: { text: 'soft cardboard box flaps falling open, gentle thump', d: 0.7 },
}

async function post(url, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    })
    if (r.ok) return Buffer.from(await r.arrayBuffer())
    const msg = await r.text()
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 3000 * (attempt + 1)))
      continue
    }
    throw new Error(`${url} -> ${r.status} ${msg.slice(0, 300)}`)
  }
  throw new Error(`${url} failed after retries`)
}

const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim())

async function narration() {
  await fs.mkdir(NARR_DIR, { recursive: true })
  const out = []
  for (const [i, seg] of NARRATION.entries()) {
    const file = path.join(NARR_DIR, `n-${i}-${seg.id}.mp3`)
    if (!existsSync(file) || process.env.FORCE) {
      const buf = await post(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
        text: seg.text,
        model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 1.0 },
        previous_text: i > 0 ? NARRATION[i - 1].text : undefined,
        next_text: NARRATION[i + 1]?.text,
      })
      await fs.writeFile(file, buf)
    }
    const d = duration(file)
    console.log(`narration ${seg.id}: ${d.toFixed(2)}s`)
    out.push({ ...seg, file: path.relative(ROOT, file), duration: d })
  }
  await fs.writeFile(path.join(NARR_DIR, 'narration.json'), JSON.stringify(out, null, 2) + '\n')
}

async function music() {
  await fs.mkdir(PUB, { recursive: true })
  const file = path.join(PUB, 'music.mp3')
  if (existsSync(file) && !process.env.FORCE) return console.log('music exists')
  const prompt =
    'Cozy, playful lo-fi instrumental for a cute capybara hot spring game. Warm ukulele, soft marimba, gentle kalimba, brushed drums, light shaker, a little glockenspiel sparkle. Relaxed, happy, wholesome, Japanese onsen afternoon vibe. 88 bpm. No vocals. Loops smoothly.'
  try {
    const buf = await post('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', { prompt, music_length_ms: 150000, force_instrumental: true })
    await fs.writeFile(file, buf)
    console.log(`music: ${duration(file).toFixed(1)}s`)
  } catch (e) {
    console.warn('music generation failed:', e.message)
  }
}

async function sfx() {
  await fs.mkdir(PUB, { recursive: true })
  for (const [name, s] of Object.entries(SFX)) {
    const file = path.join(PUB, `sfx-${name}.mp3`)
    if (existsSync(file) && !process.env.FORCE) continue
    try {
      const buf = await post('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
        text: s.text,
        duration_seconds: s.d,
        prompt_influence: 0.6,
      })
      await fs.writeFile(file, buf)
      console.log(`sfx ${name}: ${duration(file).toFixed(2)}s`)
    } catch (e) {
      console.warn(`sfx ${name} failed:`, e.message)
    }
  }
}

const which = process.argv[2]
if (!which || which === 'narration') await narration()
if (!which || which === 'sfx') await sfx()
if (!which || which === 'music') await music()
