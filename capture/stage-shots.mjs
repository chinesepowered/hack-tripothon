#!/usr/bin/env node
// New footage for the 3-minute demo-day video (frames + sfx timeline per shot).
// Usage: BASE=http://localhost:4173 node capture/stage-shots.mjs [shot ...]
import fs from 'node:fs/promises'
import path from 'node:path'
import LZString from 'lz-string'
import { createCapture } from './engine.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const BASE = process.env.BASE || 'http://localhost:4173'
const W = Number(process.env.W || 1920)
const H = Number(process.env.H || 1080)
const OUT = path.join(ROOT, process.env.STAGE_OUT || 'capture/out/stage')
const enc = (g) => LZString.compressToEncodedURIComponent(JSON.stringify(g))
const wanted = process.argv.slice(2)

async function shot(name, fn) {
  if (wanted.length && !wanted.includes(name)) return
  console.log(`=== ${name}`)
  const cap = await createCapture({ width: W, height: H, fps: 30, outDir: path.join(OUT, name), baseUrl: BASE })
  cap.cursor.hidden = true
  const res = await fn(cap)
  const fake0 = typeof res === 'number' ? res : res.fake0
  const sfx = (await cap.sfxLog()).map((e) => ({ t: (e.t - fake0) / 1000, name: e.name })).filter((e) => e.t >= 0)
  const timeline = { fps: 30, frames: cap.frameNo, duration: cap.frameNo / 30, marks: res.marks, sfx }
  await fs.writeFile(path.join(OUT, name, 'timeline.json'), JSON.stringify(timeline, null, 2))
  console.log(`  ${name}: ${cap.frameNo} frames`)
  if (cap.logs.length) console.log(cap.logs.slice(0, 5).join('\n'))
  await cap.browser.close()
}

async function open(cap, url, minGlb = 9) {
  await cap.page.goto(url)
  await cap.settle(60000, `(window.__glbLoaded || 0) >= ${minGlb} && document.fonts.status === 'loaded'`)
  await cap.settle(1500)
  return cap.nowFake()
}

const MOM = {
  v: 1,
  to: 'Mom',
  from: 'your kid in SF',
  msg: "Happy birthday, Mom. I'm three thousand miles away, so I built you a hot spring instead. The capybaras will keep you company until I'm home.",
  theme: 'onsen',
  items: [
    { label: 'Your morning coffee', note: 'Extra big, like your hugs.', lib: 'coffee' },
    { label: 'A birthday cake', note: 'Make a wish!', lib: 'cake' },
    { label: 'Mochi the cat', note: 'Mochi misses you too.', lib: 'cat', walk: true },
  ],
}

// 1. Cold open: Mom unwraps her world, reads the letter, then sends one back
await shot('mom', async (cap) => {
  const fake0 = await open(cap, `${BASE}/?capture=1#/g/${enc(MOM)}`)
  await cap.frame(45)
  await cap.page.mouse.click(W / 2, H * 0.55)
  await cap.frame(30 * 10)
  const close = cap.page.locator('[data-testid=letter-close]')
  if (await close.isVisible().catch(() => false)) {
    const b = await close.boundingBox()
    await cap.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  }
  await cap.frame(40)
  cap.cursor.hidden = false
  cap.cursor.x = W * 0.62
  cap.cursor.y = H * 0.72
  await cap.click('[data-testid=send-back]', { move: 0.8 })
  await cap.frame(30 * 3.2)
  return fake0
})

// 2. Sam's gift start to finish, paced to the narration: form, live build, wrap, unwrap.
// The Tripo task status is mocked so the build wait fits the edit (the video says it's sped up);
// the model that pops out is a real Tripo generation of the same prompt with the app's live
// settings (capture/stage/bike.glb).
const SAM_MSG = "Moving across the world was the bravest thing you've ever done. Here's a little place to rest. The capybaras are holding your spot."
const BADGE = `<div style="position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:99;padding:8px 16px;border-radius:999px;background:rgba(74,52,38,.78);color:#fff;font:700 15px Nunito,sans-serif;letter-spacing:.2px">⏩ sped up · real Tripo generation takes ~2 min</div>`
await shot('sam', async (cap) => {
  const { page } = cap
  const glb = process.env.BIKE_GLB || path.join(ROOT, 'capture/stage/bike.glb')
  const gen = { done: false, polls: 0 }
  await page.route('**/api/health', (r) => r.fulfill({ json: { live: true } }))
  await page.route('**/api/generate', (r) => r.fulfill({ json: { task: 'stage-bike-0001' } }))
  await page.route('**/api/task**', (r) => {
    const n = ++gen.polls
    if (gen.done) return r.fulfill({ json: { status: 'success', progress: 100 } })
    if (n < 3) return r.fulfill({ json: { status: 'queued', progress: 0 } })
    return r.fulfill({ json: { status: 'running', progress: Math.min(97, Math.round((n - 2) * 3.7)) } })
  })
  await page.route('**/api/model**', (r) => r.fulfill({ path: glb, contentType: 'model/gltf-binary' }))
  await open(cap, `${BASE}/?capture=1#/create`, 4)
  await page.fill('[data-testid=msg]', SAM_MSG)
  await page.evaluate(() => {
    document.activeElement?.blur()
    document.querySelector('[data-testid=create-panel]').scrollTop = 0
  })
  await cap.settle(800)
  const fake0 = await cap.nowFake()
  const marks = {}
  const until = async (t) => {
    while (cap.t() < t) await cap.frame()
  }
  const visible = (sel) => page.locator(sel).first().isVisible().catch(() => false)
  const waitFor = async (sel, maxSecs) => {
    for (let i = 0; i < 30 * maxSecs && !(await visible(sel)); i++) await cap.frame()
  }
  const panelScroll = (y) => page.evaluate((v) => (document.querySelector('[data-testid=create-panel]').scrollTop = v), y)
  async function scrollPanelTo(sel, secs = 0.45) {
    const [from, to] = await page.evaluate((s) => {
      const p = document.querySelector('[data-testid=create-panel]')
      const r = document.querySelector(s).getBoundingClientRect()
      const pr = p.getBoundingClientRect()
      return [p.scrollTop, Math.max(0, Math.min(p.scrollHeight - p.clientHeight, p.scrollTop + r.bottom - pr.bottom + 28))]
    }, sel)
    const n = Math.round(30 * secs)
    for (let i = 1; i <= n; i++) {
      const k = i / n
      await panelScroll(from + (to - from) * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2))
      await cap.frame()
    }
  }
  cap.cursor.hidden = false
  cap.cursor.x = W * 0.36
  cap.cursor.y = H * 0.3

  // build (narration starts at 0.5s): "Let's make one for Sam…"
  await until(0.6)
  await cap.type('[data-testid=to]', 'Sam', 9)
  await until(1.7)
  await cap.type('[data-testid=from]', 'Alex', 9)
  await until(3.9) // "Pick a world."
  await cap.click('[data-testid=theme-onsen]', { move: 0.45 })
  await until(5.6) // "Grab a birthday cake…"
  await cap.click('[data-testid=shelf-cake]', { move: 0.45 })
  await until(6.8) // "…and a tiny cat"
  await cap.click('[data-testid=shelf-cat]', { move: 0.4 })
  await until(9.4) // "…like a little red bicycle with a basket."
  await cap.type('[data-testid=item-2]', 'a little red bicycle with a basket', 22)
  await until(11.7)
  await scrollPanelTo('[data-testid=build]')
  await until(12.6) // "Tripo sculpts it from scratch, live."
  await cap.click('[data-testid=build]', { move: 0.5 })
  marks.build = cap.t()
  await page.evaluate((h) => {
    const d = document.createElement('div')
    d.id = 'timelapse'
    d.innerHTML = h
    document.body.appendChild(d)
  }, BADGE)
  await cap.frame(30 * 2.5)
  const crew = await page.evaluate(() => window.__project?.(2.4, 0.4, 0.6))
  if (crew) await cap.moveTo(crew[0], crew[1] + 40, 1.2)
  await until(24.6) // "And there it is!" lands at ~25.25s
  gen.done = true
  await waitFor('[data-testid=wrap]', 20)
  marks.ready = cap.t()
  await cap.frame(30 * 1.0)
  await page.evaluate(() => document.getElementById('timelapse')?.remove())

  // send: "Wrap it up, and you get a link…"
  marks.send = Math.max(27.8, cap.t() + 0.6)
  await until(marks.send - 0.55)
  await cap.click('[data-testid=wrap]', { move: 0.6 })
  await until(marks.send + 0.5)
  const [lx, ly] = await cap.center('[data-testid=share-link]')
  await cap.moveTo(lx + 40, ly, 0.6)
  await until(marks.send + 4.9) // "Just send it."
  await cap.click('.share button', { move: 0.6 })
  await until(marks.send + 6.4)
  await cap.click('[data-testid=open-own]', { move: 0.6 })

  // open: "Sam gets a present. One tap, and the world unfolds…"
  marks.open = cap.t()
  await until(marks.open + 1.6)
  await cap.click([W / 2, H * 0.55], { move: 0.6 })
  marks.tap = cap.t()
  await cap.moveTo(W * 0.62, H * 0.82, 1.4)
  await waitFor('[data-testid=letter-close]', 15)
  marks.letter = cap.t()
  await until(marks.letter + 2.6)
  await cap.click('[data-testid=letter-close]', { move: 0.5 })
  marks.explore = cap.t()
  await cap.frame(8)
  await cap.drag([W * 0.6, H * 0.62], [W * 0.42, H * 0.6], 1.1)
  await until(marks.letter + 4.8) // "poke the capybaras soaking in the hot spring"
  const s = await page.evaluate(() => window.__project?.(-0.4, 0.55, 0.35))
  if (s) await cap.click([s[0], s[1]], { move: 0.6 })
  await until(marks.letter + 7.4) // "and tap each gift to read its note"
  if ((await page.locator('.item-label').count()) > 0) await cap.click('.item-label >> nth=0', { move: 0.6 })
  await until(marks.letter + 10.6)
  return { fake0, marks }
})

// 3. Cinematic orbits of the three worlds (no UI)
for (const [name, i, secs] of [
  ['orbit-onsen', 0, 8],
  ['orbit-moon', 1, 8],
  ['orbit-kid', 2, 12],
]) {
  await shot(name, async (cap) => {
    const fake0 = await open(cap, `${BASE}/?capture=1&spin=2.5#/view/${i}`)
    await cap.frame(Math.round(30 * secs))
    return fake0
  })
}

// 4. Turntables of the rigged characters, animations playing
for (const [name, id, secs] of [
  ['turn-host', 'host', 7],
  ['turn-capy4', 'capy4', 4.2],
  ['turn-cat', 'cat', 3.2],
]) {
  await shot(name, async (cap) => {
    const fake0 = await open(cap, `${BASE}/?capture=1#/board/${id}`, 1)
    await cap.frame(Math.round(30 * secs))
    return fake0
  })
}
console.log('all shots done')
