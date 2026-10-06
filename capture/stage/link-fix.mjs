#!/usr/bin/env node
// Bakes the production-URL patch (slides/link-patch.mjs) into Sam's deflickered frames while the
// "Wrapped & ready to send" panel is up. The cursor stays on top: pixels that differ from a clean
// frame of the same panel state (the cursor and its shadow) are kept as captured.
// Run after capture/deflicker.mjs. Usage: SHARP=/path/to/sharp node capture/stage/link-fix.mjs [samDir]
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)(process.env.SHARP || 'sharp')
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const dir = process.argv[2] || path.join(ROOT, 'capture/out/stage/sam')
const fixed = path.join(dir, 'fixed')
const tl = JSON.parse(await fs.readFile(path.join(dir, 'timeline.json'), 'utf8'))
const LP = JSON.parse(await fs.readFile(path.join(ROOT, 'capture/stage/slides/link-patch.json'), 'utf8'))
const M = tl.marks
// a click at virtual time t = N/30 first shows up in frame N
const wrapAt = Math.round(tl.sfx.find((e) => e.name === 'ribbon' && e.t > M.ready).t * 30)
const copyAt = Math.round(tl.sfx.find((e) => e.name === 'pop' && e.t > wrapAt / 30).t * 30)
const openAt = Math.round(M.open * 30)
const name = (f) => path.join(fixed, `f${String(f).padStart(5, '0')}.jpg`)

const states = {
  // clean references: the cursor is still down by the old Wrap button / resting on Copy
  copy: { box: LP.copy, ref: wrapAt + 5, patch: path.join(ROOT, 'capture/stage/slides/link-patch-copy.png') },
  copied: { box: LP.copied, ref: copyAt + 8, patch: path.join(ROOT, 'capture/stage/slides/link-patch-copied.png') },
}
const region = (file, b) => sharp(file).extract({ left: b.x, top: b.y, width: b.width, height: b.height }).removeAlpha().raw().toBuffer()
for (const s of Object.values(states)) {
  s.refPx = await region(name(s.ref), s.box)
  s.patchPx = await sharp(s.patch).resize(s.box.width, s.box.height, { fit: 'fill' }).removeAlpha().raw().toBuffer()
}

// frames deflicker had to rebuild (the blank grabs around the page change) hold the last good one
const rebuilt = new Set(
  (await fs.readFile(path.join(dir, 'blank-frames.txt'), 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean)
    .map((f) => Number(f.slice(1, 6))),
)
let done = 0
for (let f = wrapAt; f < openAt; f++) {
  if (rebuilt.has(f) && f > wrapAt) {
    await fs.rm(name(f))
    await fs.copyFile(name(f - 1), name(f))
    done++
    continue
  }
  const s = f < copyAt ? states.copy : states.copied
  const { width: w, height: h } = s.box
  const px = await region(name(f), s.box)
  // cursor mask: differs from the clean frame, grown by 3px to keep anti-aliasing and shadow
  const hot = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const d = Math.max(Math.abs(px[i * 3] - s.refPx[i * 3]), Math.abs(px[i * 3 + 1] - s.refPx[i * 3 + 1]), Math.abs(px[i * 3 + 2] - s.refPx[i * 3 + 2]))
    hot[i] = d > 14 ? 1 : 0
  }
  const out = Buffer.from(s.patchPx)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let keep = false
      for (let dy = -3; dy <= 3 && !keep; dy++) for (let dx = -3; dx <= 3 && !keep; dx++) keep = hot[(Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx)))] === 1
      if (keep) for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] = px[(y * w + x) * 3 + c]
    }
  }
  // write a new file (fixed/ frames can be hard links to the raw capture)
  const tmp = name(f) + '.tmp.jpg'
  await sharp(name(f))
    .composite([{ input: out, raw: { width: w, height: h, channels: 3 }, left: s.box.x, top: s.box.y }])
    .jpeg({ quality: 92 })
    .toFile(tmp)
  await fs.rename(tmp, name(f))
  done++
}
console.log(`patched the share link in ${done} frames (${wrapAt}–${openAt - 1}, "Copied!" from ${copyAt})`)
