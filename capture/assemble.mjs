#!/usr/bin/env node
// Turns captured frames + timeline into the final MP4:
// narration placed at each segment start, ElevenLabs music ducked under the voice,
// and the app's own sound-effect events (logged during capture) mixed in.
// Usage: node capture/assemble.mjs <framesDir> <out.mp4> [--vertical]
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const [framesDir = path.join(ROOT, 'capture/out/walkthrough'), out = path.join(ROOT, 'submission/capy-post-walkthrough.mp4')] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const timeline = JSON.parse(await fs.readFile(path.join(framesDir, 'timeline.json'), 'utf8'))
const tmp = path.join(framesDir, '_audio')
await fs.mkdir(tmp, { recursive: true })
await fs.mkdir(path.dirname(out), { recursive: true })
const D = timeline.duration
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })

// 1. narration track
const narr = timeline.segments.filter((s) => s.file)
if (narr.length) {
  const inputs = narr.flatMap((s) => ['-i', path.join(ROOT, s.file)])
  const delays = narr.map((s, i) => `[${i}:a]aresample=44100,adelay=${Math.round(s.start * 1000)}:all=1[n${i}]`).join(';')
  const mix = `${narr.map((_, i) => `[n${i}]`).join('')}amix=inputs=${narr.length}:normalize=0:dropout_transition=0,apad,atrim=0:${D.toFixed(3)}[out]`
  ff([...inputs, '-filter_complex', `${delays};${mix}`, '-map', '[out]', '-ac', '2', path.join(tmp, 'narration.wav')])
} else {
  ff(['-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`, '-t', D.toFixed(3), path.join(tmp, 'narration.wav')])
}

// 2. sound effects (from the app's own sfx log), chunked to keep filter graphs small
const sfx = timeline.sfx.filter((e) => e.t < D - 0.1)
const chunks = []
for (let i = 0; i < sfx.length; i += 40) chunks.push(sfx.slice(i, i + 40))
const sfxFiles = []
for (const [ci, chunk] of chunks.entries()) {
  const ok = chunk.filter((e) => fsExists(path.join(ROOT, `public/audio/sfx-${e.name}.mp3`)))
  if (!ok.length) continue
  const inputs = ok.flatMap((e) => ['-i', path.join(ROOT, `public/audio/sfx-${e.name}.mp3`)])
  const delays = ok.map((e, i) => `[${i}:a]aresample=44100,volume=${e.name === 'pop' ? 0.55 : 0.7},adelay=${Math.round(e.t * 1000)}:all=1[s${i}]`).join(';')
  const mix = `${ok.map((_, i) => `[s${i}]`).join('')}amix=inputs=${ok.length}:normalize=0:dropout_transition=0,apad,atrim=0:${D.toFixed(3)}[out]`
  const f = path.join(tmp, `sfx-${ci}.wav`)
  ff([...inputs, '-filter_complex', `${delays};${mix}`, '-map', '[out]', '-ac', '2', f])
  sfxFiles.push(f)
}

// 3. final mix: music looped + ducked under narration, plus sfx
const music = path.join(ROOT, 'public/audio/music.mp3')
const inputs = ['-i', path.join(tmp, 'narration.wav'), '-stream_loop', '-1', '-i', music, ...sfxFiles.flatMap((f) => ['-i', f])]
const fadeOut = Math.max(0, D - 3).toFixed(2)
let graph =
  `[1:a]aresample=44100,volume=${process.env.MUSIC_VOL || 0.3},afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOut}:d=3,atrim=0:${D.toFixed(3)}[m];` +
  `[0:a]asplit=2[v][sc];` +
  `[m][sc]sidechaincompress=threshold=0.035:ratio=6:attack=40:release=500[duck];`
const sfxLabels = sfxFiles.map((_, i) => `[${i + 2}:a]`).join('')
graph += `[v]volume=1.25[vv];[vv][duck]${sfxLabels}amix=inputs=${2 + sfxFiles.length}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100[a]`
ff([...inputs, '-filter_complex', graph, '-map', '[a]', '-t', D.toFixed(3), '-c:a', 'pcm_s16le', path.join(tmp, 'mix.wav')])

// 4. video + audio (prefer the deflickered frames when present)
const frameSrc = (await fs.stat(path.join(framesDir, 'fixed')).catch(() => null)) ? path.join(framesDir, 'fixed') : framesDir
ff([
  '-framerate', String(timeline.fps),
  '-i', path.join(frameSrc, 'f%05d.jpg'),
  '-i', path.join(tmp, 'mix.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF || '20', '-pix_fmt', 'yuv420p', '-tune', 'animation',
  '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart',
  '-shortest',
  out,
])
const size = (await fs.stat(out)).size
console.log(`wrote ${out} (${(size / 1024 / 1024).toFixed(1)} MB, ${D.toFixed(1)}s)`)

function fsExists(p) {
  try {
    execFileSync('test', ['-f', p])
    return true
  } catch {
    return false
  }
}
