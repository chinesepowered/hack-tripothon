#!/usr/bin/env node
// Records the narrated walkthrough: real app, real Tripo generation, scripted cursor.
// Usage: BASE=http://localhost:5173 node capture/record.mjs [--test]
import fs from 'node:fs/promises'
import path from 'node:path'
import LZString from 'lz-string'
import { createCapture } from './engine.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TEST = process.argv.includes('--test')
const OUT = path.join(ROOT, 'capture/out', TEST ? 'test' : 'walkthrough')
const W = Number(process.env.W || 1920)
const H = Number(process.env.H || 1080)
const narration = JSON.parse(await fs.readFile(path.join(ROOT, 'capture/audio/narration.json'), 'utf8'))
const dur = Object.fromEntries(narration.map((n) => [n.id, n.duration]))
const GAP = 0.7

const enc = (g) => LZString.compressToEncodedURIComponent(JSON.stringify(g))
const MOON = {
  v: 1,
  to: 'Mei',
  from: 'Jun',
  msg: 'Happy birthday to my favourite person on this planet (and the moon).',
  theme: 'moon',
  items: [
    { label: 'A birthday cake', note: 'Moon gravity means extra fluffy.', lib: 'cake' },
    { label: 'Her telescope', note: 'So you can wave at Earth.', lib: 'telescope' },
    { label: 'Mochi the cat', note: 'Mochi insisted on coming.', lib: 'cat', walk: true },
  ],
}
const KID = {
  v: 1,
  to: 'little me',
  from: 'grown-up me',
  msg: 'It all turns out okay.',
  theme: 'kid',
  items: [
    { label: 'The red rocket', note: 'You drew it on every notebook.', lib: 'rocket' },
    { label: 'A pile of books', note: 'You read them all twice.', lib: 'books' },
    { label: 'The teddy bear', note: 'Still undefeated at hugs.', lib: 'teddy' },
  ],
}

const cap = await createCapture({ width: W, height: H, fps: 30, outDir: OUT, baseUrl: process.env.BASE || 'http://localhost:5173' })
const { page, frame, click, type, drag, moveTo, settle, setHash, goto } = cap
const segments = []

async function segment(id, fn, { minExtra = GAP, until } = {}) {
  const start = cap.t()
  segments.push({ id, start })
  console.log(`[${id}] start ${start.toFixed(2)}s (narration ${dur[id]?.toFixed(2)}s)`)
  await fn()
  const end = start + (dur[id] ?? 0) + minExtra
  while (cap.t() < end) await frame()
  if (until) await until()
}

async function overlay(html, id) {
  await page.evaluate(
    ([h, i]) => {
      document.getElementById(i)?.remove()
      const d = document.createElement('div')
      d.id = i
      d.innerHTML = h
      document.body.appendChild(d)
    },
    [html, id],
  )
}
const removeOverlay = (id) => page.evaluate((i) => document.getElementById(i)?.remove(), id)
const project = (x, y, z) => page.evaluate(([a, b, c]) => window.__project?.(a, b, c), [x, y, z])

// ---------- boot ----------
await goto('#/')
console.log('loading assets…')
await settle(40000, () => (window.__glbLoaded || 0) >= 9 && document.fonts.status === 'loaded')
console.log('glb loaded:', await page.evaluate(() => window.__glbLoaded || 0))
await settle(1500)
const fake0 = await cap.nowFake()
await frame(18) // lead-in

// ---------- 1. intro ----------
await segment('intro', async () => {
  await frame(Math.round(30 * 6.5))
  const [x, y] = await cap.center('[data-testid=cta-create]')
  await moveTo(x, y, 1.0)
  await frame(30 * 2)
})
if (TEST) {
  await finish()
  process.exit(0)
}
await click('[data-testid=cta-create]', { move: 0.2 })
await frame(10)

// ---------- 2. form ----------
await segment('form', async () => {
  await type('[data-testid=to]', 'Sam', 9)
  await type('[data-testid=from]', 'Alex', 9)
  await click('[data-testid=theme-onsen]', { move: 0.45 })
  await click('[data-testid=shelf-cake]', { move: 0.5 })
  await click('[data-testid=shelf-cat]', { move: 0.4 })
  await type('[data-testid=item-2]', 'a little red bicycle with a basket', 22)
  await page.locator('[data-testid=msg]').scrollIntoViewIfNeeded()
  await type('[data-testid=msg]', "Moving across the world was the bravest thing you've ever done. Here's a little place to rest. The capybaras are holding your spot.", 60)
})

// ---------- 3. build (real Tripo text-to-3D) ----------
await segment(
  'build',
  async () => {
    await click('[data-testid=build]', { move: 0.5 })
    await overlay(
      `<div style="position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:99;padding:8px 16px;border-radius:999px;background:rgba(74,52,38,.78);color:#fff;font:700 15px Nunito,sans-serif;letter-spacing:.2px">⏩ sped up · real Tripo generation takes ~2 min</div>`,
      'timelapse',
    )
    await frame(30 * 3)
    // look at the crew while Tripo works
    const p = await project(2.4, 0.4, 0.6)
    if (p) await moveTo(p[0], p[1] + 40, 1.2)
  },
  {
    minExtra: GAP,
    until: async () => {
      // keep recording until the live model has landed (or the app fell back to the shelf)
      let guard = 0
      while (!(await page.locator('[data-testid=wrap]').isVisible().catch(() => false)) && guard++ < 30 * 90) await frame()
      await removeOverlay('timelapse')
      await frame(30 * 1.5)
    },
  },
)
await removeOverlay('timelapse')

// ---------- 4. wrap ----------
await segment('wrap', async () => {
  await click('[data-testid=wrap]', { move: 0.5 })
  await frame(30 * 2.2)
  const [x, y] = await cap.center('[data-testid=share-link]')
  await moveTo(x + 60, y, 0.6)
  await frame(30 * 1.4)
  const [ox, oy] = await cap.center('[data-testid=open-own]')
  await moveTo(ox, oy, 0.7)
})
await click('[data-testid=open-own]', { move: 0.15 })
await frame(8)

// ---------- 5. unwrap ----------
await segment('unwrap', async () => {
  await frame(30 * 2.6)
  await click([W / 2, H * 0.55], { move: 0.7 })
  await moveTo(W * 0.62, H * 0.82, 1.4)
})

// ---------- 6. letter + explore ----------
await segment('letter', async () => {
  // letter types itself out
  await page.locator('[data-testid=letter-close]').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {})
  await frame(30 * 6.2)
  await click('[data-testid=letter-close]', { move: 0.6 })
  await frame(20)
  await drag([W * 0.6, H * 0.62], [W * 0.42, H * 0.6], 1.3)
  await frame(30 * 1.2)
  // poke a soaking capybara
  const s = await project(-0.4, 0.55, 0.35)
  if (s) await click([s[0], s[1]], { move: 0.7 })
  await frame(30 * 1.2)
  // tap a gift label to read its note
  const labels = page.locator('.item-label')
  if ((await labels.count()) > 0) await click('.item-label >> nth=0', { move: 0.7 })
  await frame(30 * 1.5)
})

// ---------- 7. other worlds + outro ----------
await segment(
  'outro',
  async () => {
    await setHash(`#/g/${enc(MOON)}`)
    await frame(30 * 1.4)
    await click([W / 2, H * 0.55], { move: 0.5 })
    await frame(30 * 4.2)
    await setHash(`#/g/${enc(KID)}`)
    await frame(30 * 1.2)
    await click([W / 2, H * 0.55], { move: 0.5 })
    await frame(30 * 3.2)
    cap.cursor.hidden = true
    await overlay(
      `<div style="position:fixed;inset:0;z-index:98;display:grid;place-items:center;background:rgba(255,246,236,.55);backdrop-filter:blur(6px);animation:fade .8s ease both">
        <div style="text-align:center;font-family:Fredoka,sans-serif;color:#4a3426">
          <div style="font-size:30px;font-weight:600;display:flex;gap:12px;align-items:center;justify-content:center"><span style="display:inline-grid;place-items:center;width:52px;height:52px;border-radius:14px;background:#ffd45c">📮</span> Capy Post</div>
          <div style="font-size:64px;font-weight:600;margin:14px 0 8px">Send someone a tiny world.</div>
          <div style="font:700 22px Nunito,sans-serif;color:#8a6a55">Characters &amp; objects generated, rigged and animated with Tripo · #Tripothon</div>
        </div>
      </div>`,
      'endcard',
    )
  },
  { minExtra: 2.2 },
)
await frame(30 * 1.5)
await finish()

async function finish() {
  const sfx = await cap.sfxLog()
  const timeline = {
    fps: cap.fps,
    frames: cap.frameNo,
    duration: cap.frameNo / cap.fps,
    fake0,
    segments: segments.map((s) => ({ ...s, file: narration.find((n) => n.id === s.id)?.file })),
    sfx: sfx.map((e) => ({ t: (e.t - fake0) / 1000, name: e.name })).filter((e) => e.t >= 0),
  }
  await fs.writeFile(path.join(OUT, 'timeline.json'), JSON.stringify(timeline, null, 2))
  console.log(`done: ${cap.frameNo} frames, ${timeline.duration.toFixed(1)}s, ${timeline.sfx.length} sfx`)
  if (cap.logs.length) console.log(cap.logs.slice(0, 20).join('\n'))
  await cap.browser.close()
}
