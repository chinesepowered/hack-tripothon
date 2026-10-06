#!/usr/bin/env node
// Narration (with character timestamps for captions) + music for the 3-minute demo-day video.
// Usage: ELEVENLABS_API_KEY=... NODE_USE_ENV_PROXY=1 node scripts/generate-stage-audio.mjs [narration|music]
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const KEY = process.env.ELEVENLABS_API_KEY
if (!KEY) throw new Error('ELEVENLABS_API_KEY is not set')
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(ROOT, 'capture/stage/audio')
const VOICE = process.env.EL_VOICE || 'cgSgspJ2msm6clMCkdW9' // Jessica: playful, bright, warm

export const SECTIONS = [
  { id: 'cold', text: 'Somewhere right now, someone is opening a tiny world. The ribbon unties, the box falls open, and an entire island grows out of it. Made just for them.' },
  { id: 'idea', text: 'When someone you love is far away, a text feels small. So we built Capy Post. Tell it who a gift is for and three things they love, and a crew of capybaras builds them a world.' },
  {
    id: 'build',
    text: "Let's make one for Sam, who just moved across the world. Pick a world. Grab a birthday cake and a tiny cat from the capy shelf. Then type anything, like a little red bicycle with a basket. Tripo sculpts it from scratch, live. We sped that part up. While it works, the capybaras haul crates onto the island, so even the waiting is part of the gift. And there it is!",
  },
  { id: 'send', text: 'Wrap it up, and you get a link. No app, no account, nothing to install. Just send it.' },
  { id: 'open', text: 'Sam gets a present. One tap, and the world unfolds, with a letter from Alex. Then Sam can wander around, poke the capybaras soaking in the hot spring, and tap each gift to read its note.' },
  { id: 'loop', text: 'And every gift ends with one button. Send one back.' },
  { id: 'phone', text: "It works on any phone, with nothing to download. And the whole gift lives inside the link, so there's no account and no database." },
  {
    id: 'tripo',
    text: "Every capybara and every gift here was made with Tripo. One shared style prompt keeps the whole cast looking like a single toy set. Tripo auto-rigged the cat and this capybara as four-legged animals, so they really walk. Our very first capybara came out as an upright plush, and Tripo's rig check called it a biped. So it became our host, and we taught it to dance.",
  },
  { id: 'worlds', text: "There are worlds for the moon's dark side, and for the kid you used to be." },
  {
    id: 'next',
    text: "It's made for birthdays, long-distance friends, and the holidays. Sending is free. Next up: snap a photo of your pet, and it walks around the island. And 3D-printed keepsakes of your world.",
  },
  { id: 'close', text: 'Every gift is a share, and everyone who opens one is a single tap from sending one back. Capy Post. Send someone a tiny world. Scan the code, and unwrap your own!' },
]

const duration = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim())

async function post(url, body, json = false) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: json ? 'application/json' : 'audio/mpeg' },
      body: JSON.stringify(body),
    })
    if (r.ok) return json ? r.json() : Buffer.from(await r.arrayBuffer())
    const msg = await r.text()
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 3000 * (attempt + 1)))
      continue
    }
    throw new Error(`${url} -> ${r.status} ${msg.slice(0, 300)}`)
  }
  throw new Error(`${url} failed`)
}

async function narration() {
  await fs.mkdir(OUT, { recursive: true })
  const out = []
  for (const [i, s] of SECTIONS.entries()) {
    const mp3 = path.join(OUT, `${String(i).padStart(2, '0')}-${s.id}.mp3`)
    const align = mp3.replace(/\.mp3$/, '.json')
    if (!existsSync(mp3) || process.env.FORCE) {
      const j = await post(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`,
        {
          text: s.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.42, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, speed: 1.04 },
          previous_text: i > 0 ? SECTIONS[i - 1].text : undefined,
          next_text: SECTIONS[i + 1]?.text,
        },
        true,
      )
      await fs.writeFile(mp3, Buffer.from(j.audio_base64, 'base64'))
      await fs.writeFile(align, JSON.stringify(j.alignment))
    }
    const d = duration(mp3)
    console.log(`${s.id}: ${d.toFixed(2)}s`)
    out.push({ ...s, file: path.relative(ROOT, mp3), align: path.relative(ROOT, align), duration: d })
  }
  await fs.writeFile(path.join(OUT, 'narration.json'), JSON.stringify(out, null, 2) + '\n')
  console.log('total speech', out.reduce((a, s) => a + s.duration, 0).toFixed(1), 's')
}

async function music() {
  await fs.mkdir(OUT, { recursive: true })
  const file = path.join(OUT, 'music-stage.mp3')
  if (existsSync(file) && !process.env.FORCE) return console.log('music exists')
  const prompt =
    'Upbeat, joyful, playful instrumental for an exciting live product demo of a cute capybara gifting app. Bouncy bass, bright synth plucks, ukulele, handclaps, glockenspiel sparkles, warm and wholesome, steadily building energy, a big satisfying finish at the very end. 112 bpm. No vocals.'
  const buf = await post('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', { prompt, music_length_ms: 190000, force_instrumental: true })
  await fs.writeFile(file, buf)
  console.log(`music: ${duration(file).toFixed(1)}s`)
}

const which = process.argv[2]
if (!which || which === 'narration') await narration()
if (!which || which === 'music') await music()
