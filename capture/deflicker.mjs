#!/usr/bin/env node
// Software-GL captures occasionally grab a frame before the WebGL canvas is composited,
// leaving the flat page background. Detect those (no sky gradient between the top and
// bottom of the right edge) and replace each with the previous good frame.
// Usage: SHARP=/path/to/node_modules/sharp node capture/deflicker.mjs <framesDir>
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP || 'sharp')
const dir = process.argv[2]
const out = path.join(dir, 'fixed')
await fs.rm(out, { recursive: true, force: true })
await fs.mkdir(out)
const files = (await fs.readdir(dir)).filter((f) => /^f\d{5}\.jpg$/.test(f)).sort()

// pass 1: classify. A frame is bad if any tile of a 12x6 grid is a flat patch of the page
// background (the canvas, or part of it, wasn't composited), with or without the letter's dim overlay.
const BG = [
  [247, 198, 183],
  [216, 172, 157],
]
async function isBlank(file) {
  const GW = 96
  const GH = 54
  const { data } = await sharp(file).resize(GW, GH, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const TW = 8
  const TH = 9
  for (let ty = 0; ty < GH / TH; ty++) {
    for (let tx = 0; tx < GW / TW; tx++) {
      let n = 0
      const sum = [0, 0, 0]
      const sq = [0, 0, 0]
      for (let y = ty * TH; y < (ty + 1) * TH; y++) {
        for (let x = tx * TW; x < (tx + 1) * TW; x++) {
          const i = (y * GW + x) * 3
          for (let c = 0; c < 3; c++) {
            sum[c] += data[i + c]
            sq[c] += data[i + c] * data[i + c]
          }
          n++
        }
      }
      const mean = sum.map((v) => v / n)
      const std = Math.max(...sq.map((v, c) => Math.sqrt(Math.max(0, v / n - mean[c] * mean[c]))))
      if (std < 1.6 && BG.some((b) => Math.abs(b[0] - mean[0]) + Math.abs(b[1] - mean[1]) + Math.abs(b[2] - mean[2]) < 12)) return true
    }
  }
  return false
}
const blank = []
for (const f of files) blank.push(await isBlank(path.join(dir, f)))
// pass 2: good frames are hard-linked; blank frames become a blend of their nearest good
// neighbours (keeps motion smooth), or a copy of the previous good frame for long gaps
let replaced = 0
const list = []
for (let i = 0; i < files.length; i++) {
  const dst = path.join(out, files[i])
  if (!blank[i]) {
    await fs.link(path.join(dir, files[i]), dst)
    continue
  }
  let p = i - 1
  while (p >= 0 && blank[p]) p--
  let n = i + 1
  while (n < files.length && blank[n]) n++
  replaced++
  list.push(files[i])
  if (p < 0 && n >= files.length) await fs.link(path.join(dir, files[i]), dst)
  else if (p < 0) await fs.link(path.join(dir, files[n]), dst)
  else if (n >= files.length || n - p > 6) await fs.link(path.join(dir, files[p]), dst)
  else {
    const w = (i - p) / (n - p)
    const [pa, pb] = await Promise.all([sharp(path.join(dir, files[p])).raw().toBuffer({ resolveWithObject: true }), sharp(path.join(dir, files[n])).raw().toBuffer()])
    const mix = Buffer.alloc(pa.data.length)
    for (let k = 0; k < mix.length; k++) mix[k] = Math.round(pa.data[k] * (1 - w) + pb[k] * w)
    await sharp(mix, { raw: { width: pa.info.width, height: pa.info.height, channels: pa.info.channels } }).jpeg({ quality: 92 }).toFile(dst)
  }
}
console.log(`${files.length} frames, repaired ${replaced} blank frames`)
await fs.writeFile(path.join(dir, 'blank-frames.txt'), list.join('\n') + '\n')
