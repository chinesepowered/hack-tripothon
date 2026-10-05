#!/usr/bin/env node
// 9:16 social clip of the unwrap moment (music + sfx + captions, no narration).
// Usage: BASE=http://localhost:5173 node capture/record-vertical.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import LZString from 'lz-string'
import { createCapture } from './engine.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(ROOT, 'capture/out/vertical')
const W = 1080
const H = 1920
const GIFT = {
  v: 1,
  to: 'you',
  from: 'someone who misses you',
  msg: "I couldn't be there, so I sent a tiny world instead. There's a hot spring, a big coffee, and capybaras who will listen to anything.",
  theme: 'onsen',
  items: [
    { label: 'A very large coffee', note: 'Extra shot.', lib: 'coffee' },
    { label: 'A birthday cake', note: 'Make a wish.', lib: 'cake' },
    { label: 'A tiny cat', note: 'Mochi says hi.', lib: 'cat', walk: true },
  ],
}
const cap = await createCapture({ width: W, height: H, fps: 30, outDir: OUT, baseUrl: process.env.BASE || 'http://localhost:5173' })
const { page, frame, click, drag, moveTo, settle } = cap

async function caption(text, id = 'cap') {
  await page.evaluate(
    ([t, i]) => {
      document.getElementById(i)?.remove()
      if (!t) return
      const d = document.createElement('div')
      d.id = i
      d.textContent = t
      Object.assign(d.style, {
        position: 'fixed', left: '50%', bottom: '15%', transform: 'translateX(-50%)', zIndex: '99', maxWidth: '86%', textAlign: 'center',
        padding: '18px 30px', borderRadius: '28px', background: 'rgba(255,250,244,.94)', color: '#4a3426', boxShadow: '0 12px 40px rgba(74,52,38,.25)',
        font: '600 50px/1.15 Fredoka, sans-serif', animation: 'pop .5s cubic-bezier(.2,1.4,.4,1) both',
      })
      document.body.appendChild(d)
    },
    [text, id],
  )
}

await page.goto(`${process.env.BASE || 'http://localhost:5173'}/?capture=1#/g/${LZString.compressToEncodedURIComponent(JSON.stringify(GIFT))}`)
await settle(40000, () => (window.__glbLoaded || 0) >= 9 && document.fonts.status === 'loaded')
await settle(1200)
const fake0 = await cap.nowFake()
await caption('POV: someone sent you a tiny world 🎁')
await frame(30 * 2.2)
await click([W / 2, H * 0.52], { move: 0.6 })
await caption('')
await frame(30 * 3.6)
await caption('every capybara + gift made with Tripo ✨')
await frame(30 * 2.4)
await caption('')
await frame(30 * 2.6)
const close = page.locator('[data-testid=letter-close]')
if (await close.isVisible().catch(() => false)) await click('[data-testid=letter-close]', { move: 0.5 })
await frame(10)
await drag([W * 0.7, H * 0.55], [W * 0.3, H * 0.53], 1.2)
const s = await page.evaluate(() => window.__project?.(-0.4, 0.55, 0.35))
if (s) await click([s[0], s[1]], { move: 0.6 })
await caption('poke the capybaras 🫶')
await frame(30 * 2.4)
cap.cursor.hidden = true
await caption('Capy Post · send someone a tiny world')
await frame(30 * 2.6)
const sfx = (await cap.sfxLog()).map((e) => ({ t: (e.t - fake0) / 1000, name: e.name })).filter((e) => e.t >= 0)
await fs.writeFile(path.join(OUT, 'timeline.json'), JSON.stringify({ fps: 30, frames: cap.frameNo, duration: cap.frameNo / 30, fake0, segments: [], sfx }, null, 2))
console.log(`done: ${cap.frameNo} frames`)
if (cap.logs.length) console.log(cap.logs.slice(0, 10).join('\n'))
await cap.browser.close()
