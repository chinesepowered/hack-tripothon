#!/usr/bin/env node
// Edits the 3-minute demo-day video from the stage shots (capture/stage-shots.mjs), the walkthrough
// footage and the slides. Narration is placed sentence by sentence, captions are burned in from the
// ElevenLabs alignment, the music is ducked under the voice, and the app's own sound effects play
// where they fired during capture.
// Usage: node capture/stage-edit.mjs [out.mp4]
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = process.argv[2] || path.join(ROOT, 'submission/capy-post-demo-day.mp4')
const TMP = path.join(ROOT, 'capture/out/stage-edit')
const FPS = 30
const W = 1920
const H = 1080
fs.mkdirSync(path.join(TMP, 'clips'), { recursive: true })
const rel = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p))
const readJson = (p) => JSON.parse(fs.readFileSync(rel(p), 'utf8'))
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
const sec = (frames) => frames / FPS
const fr = (seconds) => Math.round(seconds * FPS)

// ---------- footage ----------
const SRC = {
  mom: 'capture/out/stage/mom',
  sam: 'capture/out/stage/sam',
  onsen: 'capture/out/stage/orbit-onsen',
  moon: 'capture/out/stage/orbit-moon',
  kid: 'capture/out/stage/orbit-kid',
  host: 'capture/out/stage/turn-host',
  capy4: 'capture/out/stage/turn-capy4',
  cat: 'capture/out/stage/turn-cat',
  walk: 'capture/out/walkthrough',
  vert: 'capture/out/vertical',
}
// SRC_<KEY>=dir swaps a source (dry runs before every shot is recorded)
for (const k of Object.keys(SRC)) if (process.env[`SRC_${k.toUpperCase()}`]) SRC[k] = process.env[`SRC_${k.toUpperCase()}`]
const frameDir = (d) => (fs.existsSync(rel(d + '/fixed')) ? rel(d + '/fixed') : rel(d))
const timeline = (d) => readJson(d + '/timeline.json')
const SLIDE = (n) => rel(`capture/stage/slides/${n}.png`)

const clips = []
const sfx = []
let T = 0 // running length in frames

function add(clip) {
  clip.start = T
  clips.push(clip)
  T += clip.frames
  // the app's sound effects that fired inside this stretch of footage
  if (clip.src && clip.from !== undefined) {
    for (const e of timeline(clip.src).sfx || []) {
      const f = e.t * FPS
      if (f >= clip.from && f < clip.to) sfx.push({ name: e.name, t: sec(clip.start) + sec(clip.reverse ? clip.to - f : f - clip.from) / clip.speed })
    }
  }
  return clip
}
const seq = (key, from, to, o = {}) => add({ kind: 'seq', src: SRC[key], from, to, speed: o.speed || 1, frames: Math.round((to - from) / (o.speed || 1)), ...o })
const still = (png, seconds, o = {}) => add({ kind: 'still', png, frames: fr(seconds), ...o })
const t0 = (clip) => sec(clip.start)
const fx = (name, t, vol) => sfx.push({ name, t, vol })

// ---------- narration ----------
const NARR = readJson('capture/stage/audio/narration.json')
const voice = []
const capWords = []
function wordsOf(id) {
  const s = NARR.find((x) => x.id === id)
  const a = readJson(s.align)
  const words = []
  let cur = null
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur)
      cur = null
      return
    }
    if (!cur) cur = { text: '', start: a.character_start_times_seconds[i] }
    cur.text += ch
    // trailing punctuation can be stretched over the pause that follows; end on the last letter
    if (/[\p{L}\p{N}]/u.test(ch) || cur.end === undefined) cur.end = a.character_end_times_seconds[i]
  })
  if (cur) words.push(cur)
  return { file: s.file, words, duration: s.duration }
}
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '')
/** Place the words `from`…`to` of a narration section so the first word starts at `at` (seconds). */
function say(id, from, to, at, style = 'Cap') {
  const { file, words, duration } = wordsOf(id)
  const match = (k, text) => text.split(' ').map(norm).every((s, m) => norm(words[k + m]?.text || '') === s)
  // the last word must match exactly, punctuation included ("it." ends a sentence, "it" may not)
  const exact = (k, text) => text.split(' ').every((s, m) => (words[k + m]?.text || '').toLowerCase() === s.toLowerCase())
  const i = words.findIndex((_, k) => match(k, from))
  const n = to.split(' ').length
  let j = -1
  for (let k = Math.max(i, 0); k < words.length && j < 0; k++) if (exact(k - n + 1, to)) j = k
  if (i < 0 || j < 0) throw new Error(`say(${id}): "${from}" … "${to}" not found`)
  const a = Math.max(i > 0 ? (words[i - 1].end + words[i].start) / 2 : 0, words[i].start - 0.1)
  const b = j < words.length - 1 ? Math.min((words[j].end + words[j + 1].start) / 2 + 0.06, words[j].end + 0.35) : duration
  const offset = at - words[i].start
  voice.push({ file, a, b, at: offset + a, id, from: offset + words[i].start, to: offset + words[j].end, text: `${from} … ${to}` })
  if (style) for (const w of words.slice(i, j + 1)) capWords.push({ text: w.text, start: offset + w.start, end: offset + w.end, style })
  return offset + words[j].end
}

// =====================================================================================
// THE EDIT
// =====================================================================================
const sam = timeline(SRC.sam)
const M = sam.marks

// 1. COLD OPEN: Mom unwraps the world her kid built her. The 1.5s of idle box plays at half
// speed so the voice can set it up; then real time from the tap.
const A1 = seq('mom', 0, 45, { speed: 0.45 })
const A2 = seq('mom', 45, 45 + fr(8.0))
say('cold', 'Somewhere', 'world.', t0(A1) + 0.15)
say('cold', 'The ribbon', 'it.', t0(A2) + 0.17)
say('cold', 'Made', 'them.', t0(A2) + 5.6)

// 2. THE IDEA
const B1 = seq('onsen', 0, fr(5.8), { overlays: [{ png: SLIDE('title'), in: 3.65 }] })
say('idea', 'When', 'small.', t0(B1) + 0.25)
say('idea', 'So we built', 'Post.', t0(B1) + 3.75)
fx('sparkle', t0(B1) + 3.7, 0.45)
const B2 = seq('walk', 40, 40 + fr(6.4))
say('idea', 'Tell it', 'world.', t0(B2) + 0.25)

// 3–5. BUILD → SEND → OPEN: one continuous take of Sam's gift, recorded to this narration
// (the share link in these frames reads the production URL: capture/stage/link-fix.mjs)
const C = seq('sam', 0, Math.min(sam.frames, fr(M.letter + 10.6)))
const S = t0(C)
say('build', "Let's", 'gift.', S + 0.5)
say('build', 'And there', 'is!', S + M.ready - 0.15)
say('send', 'Wrap', 'it.', S + M.send)
say('open', 'Sam gets', 'present.', S + M.open + 0.3)
say('open', 'One tap', 'unfolds,', S + M.tap - 0.3)
say('open', 'with a letter', 'Alex.', S + M.letter + 0.15)
say('open', 'Then', 'note.', S + M.letter + 3.1)

// 6. THE LOOP: back to Mom, who sends one back (punch in on the button bar)
const D1 = seq('mom', 350, 411, { zoom: { from: 1, to: 1.4, x: 0.5, y: 0.97 } })
const D2 = seq('mom', 411, 510)
say('loop', 'And every', 'button.', t0(D1) + 0.15, 'Top')
say('loop', 'Send one back.', 'back.', t0(D1) + 2.6, 'Top')

// 7. ANY PHONE
const E = add({ kind: 'phone', src: SRC.vert, from: 330, to: 600, speed: 1, frames: 270 })
say('phone', 'It works', 'download.', t0(E) + 0.4, 'Left')
say('phone', 'And the whole', 'database.', t0(E) + 3.4, 'Left')

// 8. MADE WITH TRIPO
const F1 = still(SLIDE('pipeline'), 4.0, { zoom: { from: 1, to: 1.035, x: 0.5, y: 0.5 } })
fx('whoosh', t0(F1) - 0.12, 0.35)
say('tripo', 'Every capybara', 'Tripo.', t0(F1) + 0.35)
const F2 = add({ kind: 'pan', png: rel('submission/asset-board.png'), y0: 0, y1: 1200, frames: fr(4.4) })
say('tripo', 'One shared', 'set.', t0(F2) + 0.2)
const F3 = seq('cat', 15, 15 + fr(2.2), { overlays: [{ png: SLIDE('label-cat'), in: 0.05 }] })
say('tripo', 'Tripo auto-rigged', 'cat', t0(F3) + 0.2)
const F4 = seq('capy4', 0, fr(4.0), { overlays: [{ png: SLIDE('label-capy4'), in: 0.05 }] })
say('tripo', 'and this capybara', 'walk.', t0(F4) + 0.15)
// the host turns away (an upright plush), then back to camera for its dance and wave
const F5 = seq('host', 0, fr(4.4), { overlays: [{ png: SLIDE('label-host'), in: 0.2 }] })
seq('host', 0, fr(4.4), { reverse: true, overlays: [{ png: SLIDE('label-host'), in: -1 }] })
say('tripo', 'Our very first', 'biped.', t0(F5) + 0.2)
say('tripo', 'So it became', 'dance.', t0(F5) + 5.9)

// 9. MORE WORLDS: the moon unwrap from the walkthrough, then the kid world
const G = seq('walk', 2495, 2636)
say('worlds', 'There are', 'side,', t0(G) + 0.25)
const Gk = seq('walk', 2650, 2784) // the kid-world unwrap
say('worlds', 'and for the kid', 'be.', t0(Gk) + 1.3)
// 10. WHAT'S NEXT, over the kid world
const Hk = seq('kid', 0, 324, { speed: 0.8, overlays: [{ png: SLIDE('next'), in: 0.3, out: 13.1 }] })
say('next', "It's made", 'holidays.', t0(Hk) + 0.5, 'Top')
say('next', 'Sending', 'free.', t0(Hk) + 4.8, 'Top')
say('next', 'Next up', 'island.', t0(Hk) + 6.3, 'Top')
say('next', 'And 3D-printed', 'world.', t0(Hk) + 10.5, 'Top')

// 11. CLOSE: the share loop, then the QR card holds for scanning
const I1 = seq('moon', 0, fr(5.6))
say('close', 'Every gift', 'back.', t0(I1) + 0.3)
const I2 = still(SLIDE('close'), 20)
fx('whoosh', t0(I2) - 0.12, 0.35)
fx('chime', t0(I2) + 0.05, 0.4)
say('close', 'Capy Post.', 'world.', t0(I2) + 0.5, null)
say('close', 'Scan', 'own!', t0(I2) + 3.6, null)

const D = sec(T)
console.log(`timeline: ${clips.length} clips, ${D.toFixed(2)}s, ${voice.length} voice pieces, ${sfx.length} sfx`)
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const chapters = [
  [t0(A1), 'Cold open: Mom unwraps a tiny world'],
  [t0(B1), 'The idea + title'],
  [S, 'Build for Sam: form, then Tripo sculpts the bicycle live (sped up, labelled)'],
  [S + M.send - 0.6, 'Wrap it, get a link'],
  [S + M.open, 'Sam opens it: unwrap, letter, poke the capybaras'],
  [t0(D1), 'Send one back'],
  [t0(E), 'Works on any phone, the gift lives in the link'],
  [t0(F1), 'Made with Tripo: pipeline, asset board, rigged cat + capybara, the biped host'],
  [t0(G), 'The moon and kid worlds'],
  [t0(Hk), "What's next"],
  [t0(I1), 'Close'],
  [t0(I2), 'QR card (holds for scanning)'],
]
console.log(chapters.map(([t, n]) => `  ${mmss(t)}  ${n}`).join('\n'))
voice.sort((x, y) => x.at - y.at)
const clashes = []
for (let k = 1; k < voice.length; k++) {
  const [p, q] = [voice[k - 1], voice[k]]
  if (q.from - p.to < 0.2) clashes.push(`  "${p.text}" speaks until ${p.to.toFixed(2)}, "${q.text}" starts ${q.from.toFixed(2)}`)
}
if (clashes.length) throw new Error(`voice overlaps:\n${clashes.join('\n')}`)

// ---------- captions (ASS, burned in) ----------
const WEAK = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'is', 'with', 'from', 'for', 'as', 'so', 'it', 'its', 'your', 'our', 'their', 'this', 'that', 'who', 'one'])
// good places to start a new line: before a conjunction or a preposition that opens a phrase
const OPENERS = new Set(['and', 'or', 'but', 'from', 'with', 'so', 'as', 'like', 'while', 'into', 'onto', 'in', 'to', 'looking', 'because'])
const HINTS = new Set(['capybara|came'])
const MAX = { Cap: 44, Top: 44, Left: 28 }
function chunks(words) {
  const text = (ws) => ws.map((w) => w.text).join(' ')
  // clauses end at punctuation or a pause
  const clauses = []
  let cur = []
  for (const w of words) {
    const prev = cur[cur.length - 1]
    if (prev && (w.start - prev.end > 0.6 || w.style !== prev.style)) {
      clauses.push(cur)
      cur = []
    }
    cur.push(w)
    if (/[.!?,;:]$/.test(w.text)) {
      clauses.push(cur)
      cur = []
    }
  }
  if (cur.length) clauses.push(cur)
  // merge a short clause into its neighbour when they fit on one line ("Next up: snap a photo…")
  const merged = []
  for (const c of clauses) {
    const last = merged[merged.length - 1]
    const max = MAX[c[0].style]
    if (
      last &&
      !/[.!?]$/.test(last[last.length - 1].text) &&
      last[0].style === c[0].style &&
      c[0].start - last[last.length - 1].end < 0.6 &&
      text(last).length + 1 + text(c).length <= max &&
      (text(last).length < 16 || text(c).length < 10)
    )
      merged[merged.length - 1] = [...last, ...c]
    else merged.push(c)
  }
  // split long clauses into balanced lines, off weak endings and before phrase openers
  const out = []
  for (const c of merged) {
    const max = MAX[c[0].style]
    let rest = c
    for (let k = Math.ceil(text(c).length / max); k > 1; k--) {
      const target = text(rest).length / k
      let best = 1
      let bestScore = Infinity
      for (let i = 1; i < rest.length; i++) {
        const l = text(rest.slice(0, i)).length
        if (l > max) break
        const a = norm(rest[i - 1].text)
        const b = norm(rest[i].text)
        const score = Math.abs(l - target) + (WEAK.has(a) ? 6 : 0) - (OPENERS.has(b) ? 6 : 0) - (HINTS.has(`${a}|${b}`) ? 10 : 0)
        if (score < bestScore) {
          bestScore = score
          best = i
        }
      }
      out.push(rest.slice(0, best))
      rest = rest.slice(best)
    }
    out.push(rest)
  }
  return out
}
const assTime = (t) => {
  const cs = Math.max(0, Math.round(t * 100))
  const h = Math.floor(cs / 360000)
  const m = Math.floor((cs % 360000) / 6000)
  const s = Math.floor((cs % 6000) / 100)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`
}
capWords.sort((x, y) => x.start - y.start)
const groups = chunks(capWords)
const events = groups.map((g, k) => {
  const next = groups[k + 1]
  let end = g[g.length - 1].end + 0.35
  if (next && next[0].start - 0.06 < end) end = next[0].start - 0.06
  const start = g[0].start - 0.08
  return { start, end: Math.max(end, start + 0.7), style: g[0].style, text: g.map((w) => w.text).join(' ').replace(/[{}\\]/g, '') }
})
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Fredoka Capy,62,&H00FFFFFF,&H00FFFFFF,&H1A26344A,&H1A26344A,0,0,0,0,100,100,0.5,0,3,14,0,2,80,80,52,1
Style: Top,Fredoka Capy,62,&H00FFFFFF,&H00FFFFFF,&H1A26344A,&H1A26344A,0,0,0,0,100,100,0.5,0,3,14,0,8,80,80,48,1
Style: Left,Fredoka Capy,54,&H00FFFFFF,&H00FFFFFF,&H1A26344A,&H1A26344A,0,0,0,0,100,100,0.5,0,3,14,0,1,120,80,64,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.map((e) => `Dialogue: 0,${assTime(e.start)},${assTime(e.end)},${e.style},,0,0,0,,${e.text}`).join('\n')}
`
const assFile = path.join(TMP, 'captions.ass')
fs.writeFileSync(assFile, ass)
console.log(`captions: ${events.length}`)

if (process.env.PLAN) {
  for (const c of clips) console.log(`${sec(c.start).toFixed(2).padStart(7)}  ${c.kind.padEnd(5)} ${(c.src || path.basename(c.png || '')).padEnd(32)} ${sec(c.frames).toFixed(2)}s`)
  for (const v of voice) console.log(`${v.from.toFixed(2).padStart(7)}–${v.to.toFixed(2).padEnd(7)} ${v.id}: ${v.text}`)
  for (const e of events) console.log(`${e.start.toFixed(2).padStart(7)} ${e.style.padEnd(4)} ${e.text}`)
  process.exit(0)
}

// =====================================================================================
// RENDER
// =====================================================================================
const ENC = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-video_track_timescale', '15360', '-an']
const ease = (x) => `if(lt(${x},0.5),2*${x}*${x},1-pow(-2*${x}+2,2)/2)`
const mask = path.join(TMP, 'phone-mask.png')
if (!fs.existsSync(mask)) execFileSync('convert', ['-size', '540x960', 'xc:black', '-fill', 'white', '-draw', 'roundrectangle 0,0 539,959 56,56', mask])

function zoomChain(z, frames) {
  // smooth punch-in via zoompan on a 2x upscale (halves zoompan's whole-pixel stepping)
  const k = `min(on/${Math.max(1, frames - 1)},1)`
  const zf = `(${z.from}+(${z.to}-${z.from})*${ease(k)})`
  return `scale=${W * 2}:${H * 2}:flags=bicubic,zoompan=z='${zf}':x='(iw-iw/zoom)*${z.x}':y='(ih-ih/zoom)*${z.y}':d=1:s=${W}x${H}:fps=${FPS}`
}

function render(c, i) {
  const out = path.join(TMP, 'clips', `${String(i).padStart(2, '0')}-${c.kind}.mp4`)
  const D = sec(c.frames)
  const inputs = []
  const chain = []
  let base
  if (c.kind === 'seq' || c.kind === 'phone') {
    inputs.push('-framerate', String(FPS), '-start_number', String(c.from), '-i', path.join(frameDir(c.src), 'f%05d.jpg'))
    let v = `[0:v]trim=end_frame=${c.to - c.from},setpts=PTS-STARTPTS`
    if (c.reverse) v += ',reverse'
    if (c.speed !== 1) v += `,setpts=PTS/${c.speed},framerate=fps=${FPS}`
    if (c.kind === 'phone') {
      inputs.push('-loop', '1', '-framerate', String(FPS), '-t', D.toFixed(3), '-i', SLIDE('phone'), '-loop', '1', '-framerate', String(FPS), '-t', D.toFixed(3), '-i', mask)
      chain.push(`${v},scale=540:960:flags=lanczos,format=rgba[ph]`, `[2:v]format=gray[m]`, `[ph][m]alphamerge[phr]`, `[1:v][phr]overlay=1010:60,format=yuv420p[b0]`)
    } else {
      chain.push(`${v}${c.zoom ? ',' + zoomChain(c.zoom, c.frames) : ''},scale=${W}:${H},format=yuv420p[b0]`)
    }
    base = '[b0]'
  } else if (c.kind === 'still') {
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', D.toFixed(3), '-i', c.png)
    chain.push(`[0:v]format=yuv420p${c.zoom ? ',' + zoomChain(c.zoom, c.frames) : ''},scale=${W}:${H}[b0]`)
    base = '[b0]'
  } else if (c.kind === 'pan') {
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', D.toFixed(3), '-i', c.png)
    const k = `min(t/${D.toFixed(3)},1)`
    chain.push(`[0:v]crop=${W}:${H}:0:'${c.y0}+(${c.y1 - c.y0})*${ease(k)}',format=yuv420p[b0]`)
    base = '[b0]'
  }
  for (const [n, o] of (c.overlays || []).entries()) {
    const idx = inputs.filter((x) => x === '-i').length
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', D.toFixed(3), '-i', o.png)
    if (o.from !== undefined) {
      // hard-switched patch at a position, for clip times [from, until)
      chain.push(`[${idx}:v]format=rgba[o${n}]`, `${base}[o${n}]overlay=${o.x}:${o.y}:format=auto:enable='between(t,${(o.from - 0.001).toFixed(3)},${(o.until - 0.002).toFixed(3)})',format=yuv420p[b${n + 1}]`)
    } else {
      let ov = `[${idx}:v]format=rgba${o.in > 0 ? `,fade=t=in:st=${o.in}:d=0.35:alpha=1` : ''}`
      if (o.out !== undefined) ov += `,fade=t=out:st=${o.out}:d=0.35:alpha=1`
      chain.push(`${ov}[o${n}]`, `${base}[o${n}]overlay=0:0:format=auto,format=yuv420p[b${n + 1}]`)
    }
    base = `[b${n + 1}]`
  }
  ff([...inputs, '-filter_complex', chain.join(';'), '-map', base, '-frames:v', String(c.frames), ...ENC, out])
  return out
}

console.log('rendering clips…')
const files = clips.map((c, i) => {
  const f = render(c, i)
  process.stdout.write(`  ${path.basename(f)} ${sec(c.frames).toFixed(2)}s\n`)
  return f
})
const list = path.join(TMP, 'clips.txt')
fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n') + '\n')
const video = path.join(TMP, 'video.mp4')
ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video])


// ---------- audio ----------
const AUD = path.join(TMP, 'audio')
fs.mkdirSync(AUD, { recursive: true })
function mixTrack(name, items, build) {
  // items → one wav, chunked so filter graphs stay small
  const parts = []
  for (let k = 0; k < items.length; k += 30) {
    const chunk = items.slice(k, k + 30)
    const inputs = chunk.flatMap((it) => ['-i', rel(it.file)])
    const lines = chunk.map((it, n) => `[${n}:a]${build(it)},adelay=${Math.round(it.at * 1000)}:all=1[s${n}]`)
    const f = path.join(AUD, `${name}-${k / 30}.wav`)
    ff([...inputs, '-filter_complex', `${lines.join(';')};${chunk.map((_, n) => `[s${n}]`).join('')}amix=inputs=${chunk.length}:normalize=0:dropout_transition=0,apad,atrim=0:${D.toFixed(3)}[out]`, '-map', '[out]', '-ac', '2', '-ar', '44100', f])
    parts.push(f)
  }
  const f = path.join(AUD, `${name}.wav`)
  if (parts.length === 1) fs.copyFileSync(parts[0], f)
  else ff([...parts.flatMap((p) => ['-i', p]), '-filter_complex', `amix=inputs=${parts.length}:normalize=0:dropout_transition=0[out]`, '-map', '[out]', f])
  return f
}
const voiceWav = mixTrack('voice', voice, (v) => {
  const d = v.b - v.a
  return `aresample=44100,atrim=${v.a.toFixed(3)}:${v.b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st=${Math.max(0, d - 0.04).toFixed(3)}:d=0.04`
})
const sfxItems = sfx.filter((e) => e.t >= 0 && e.t < D - 0.05 && fs.existsSync(rel(`public/audio/sfx-${e.name}.mp3`))).map((e) => ({ ...e, file: `public/audio/sfx-${e.name}.mp3`, at: e.t }))
const sfxWav = mixTrack('sfx', sfxItems, (e) => `aresample=44100,volume=${e.vol ?? (e.name === 'pop' ? 0.5 : 0.65)}`)
const music = rel('capture/stage/audio/music-stage.mp3')
// start the track late so its own ending (≈188s in) lands on the last frame; that also puts the
// track's quiet breakdown under Sam's unwrap and letter
const musicStart = Math.max(0, 188 - D)
const premix = path.join(AUD, 'premix.wav')
const mix = path.join(AUD, 'mix.wav')
ff([
  '-i', voiceWav, '-i', music, '-i', sfxWav,
  '-filter_complex',
  `[1:a]aresample=44100,atrim=start=${musicStart.toFixed(3)},asetpts=PTS-STARTPTS,volume=${process.env.MUSIC_VOL || 0.24},atrim=0:${D.toFixed(3)},afade=t=in:d=0.3,afade=t=out:st=${(D - 1.5).toFixed(2)}:d=1.5[m];` +
    `[0:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.02:ratio=10:attack=20:release=500[duck];` +
    `[v]volume=1.3[vv];[vv][duck][2:a]amix=inputs=3:normalize=0:dropout_transition=0[a]`,
  '-map', '[a]', '-t', D.toFixed(3), '-c:a', 'pcm_s16le', premix,
])
// two-pass loudness normalisation to -14 LUFS (single-pass loudnorm lands about 1 LU short)
const probe = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', premix, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
const measured = JSON.parse(probe.stderr.match(/\{[\s\S]*\}/)?.[0] || '{}')
if (!measured.input_i) throw new Error('loudnorm measurement failed')
ff(['-i', premix, '-af', `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true,aresample=44100`, '-c:a', 'pcm_s16le', mix])

// ---------- final ----------
fs.mkdirSync(path.dirname(OUT), { recursive: true })
const fontsDir = rel('capture/stage/fonts')
ff([
  '-i', video, '-i', mix,
  '-vf', `ass=${assFile}:fontsdir=${fontsDir}`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF || '20', '-tune', 'animation', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT,
])
const size = fs.statSync(OUT).size
console.log(`wrote ${OUT} (${(size / 1024 / 1024).toFixed(1)} MB, ${D.toFixed(1)}s)`)
fs.writeFileSync(
  path.join(TMP, 'edl.json'),
  JSON.stringify({ duration: D, chapters: chapters.map(([t, n]) => ({ t, at: mmss(t), name: n })), clips: clips.map((c) => ({ kind: c.kind, src: c.src || c.png, from: c.from, to: c.to, start: sec(c.start), dur: sec(c.frames) })), voice, captions: events }, null, 2),
)
