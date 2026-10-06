#!/usr/bin/env node
// Clean, cursor-free 1920x1080 key-frame stills for the submission gallery.
// Usage: BASE=https://hack-tripothon.vercel.app SHARP=/path/to/sharp node capture/stills.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import LZString from 'lz-string'
import { createCapture } from './engine.mjs'

const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP || 'sharp')
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(ROOT, 'submission/stills')
await fs.mkdir(OUT, { recursive: true })
const W = 1920
const H = 1080
const cap = await createCapture({ width: W, height: H, fps: 30, outDir: path.join(ROOT, 'capture/out/stills'), baseUrl: process.env.BASE || 'http://localhost:4173' })
const { page, frame, settle } = cap
cap.cursor.hidden = true

async function blank(buf) {
  const { data } = await sharp(buf).resize(96, 54, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let ty = 0; ty < 6; ty++)
    for (let tx = 0; tx < 12; tx++) {
      const s = [0, 0, 0], q = [0, 0, 0]
      let n = 0
      for (let y = ty * 9; y < ty * 9 + 9; y++)
        for (let x = tx * 8; x < tx * 8 + 8; x++) {
          const i = (y * 96 + x) * 3
          for (let c = 0; c < 3; c++) (s[c] += data[i + c]), (q[c] += data[i + c] ** 2)
          n++
        }
      const m = s.map((v) => v / n)
      const sd = Math.max(...q.map((v, c) => Math.sqrt(Math.max(0, v / n - m[c] ** 2))))
      if (sd < 1.6 && [[247, 198, 183], [216, 172, 157]].some((b) => Math.abs(b[0] - m[0]) + Math.abs(b[1] - m[1]) + Math.abs(b[2] - m[2]) < 12)) return true
    }
  return false
}

async function still(name) {
  for (let attempt = 0; attempt < 12; attempt++) {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    const { data } = await cap.cdp.send('Page.captureScreenshot', { format: 'png' })
    const buf = Buffer.from(data, 'base64')
    if (!(await blank(buf))) {
      await sharp(buf).jpeg({ quality: 93 }).toFile(path.join(OUT, `${name}.jpg`))
      console.log('still', name, attempt ? `(after ${attempt} retries)` : '')
      return
    }
    await page.evaluate(() => window.__r3fAdvance?.(window.__vnow / 1000))
  }
  console.log('FAILED still', name)
}

const JUDGE = {
  v: 1,
  to: 'you, dear judge',
  from: 'the Capy Post crew',
  msg: "You've opened a lot of demos today. This one asks nothing of you. A warm onsen, a yuzu, a big coffee, and absolutely no deadlines. Stay as long as you like. The capybaras insist.",
  theme: 'onsen',
  items: [
    { label: 'A very large coffee', note: 'Judging stamina, extra shot.', lib: 'coffee' },
    { label: 'A tiny trophy', note: 'For making it through every single demo.', lib: 'trophy' },
    { label: 'A nap pillow', note: 'Officially approved break.', lib: 'pillow' },
  ],
}
await page.goto(`${process.env.BASE || 'http://localhost:4173'}/?capture=1#/g/${LZString.compressToEncodedURIComponent(JSON.stringify(JUDGE))}`)
await settle(60000, () => (window.__glbLoaded || 0) >= 9 && document.fonts.status === 'loaded')
await settle(1500)
await frame(30)
if (process.env.ONLY !== 'unwrap') await still('01-gift-box')
await page.mouse.click(W / 2, H * 0.55)
await frame(Math.round(30 * 1.35))
await still('02-unwrap')
if (process.env.ONLY === 'unwrap') {
  await cap.browser.close()
  process.exit(0)
}
await frame(Math.round(30 * 1.55))
await still('02b-island-rises')
await frame(Math.round(30 * 1.25))
await still('03-world-grows')
await frame(Math.round(30 * 4.8))
await still('04-letter')
const close = page.locator('[data-testid=letter-close]')
if (await close.isVisible().catch(() => false)) {
  const b = await close.boundingBox()
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
}
await frame(45)
await still('05-explore')
await cap.browser.close()
