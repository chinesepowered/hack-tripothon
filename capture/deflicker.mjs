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
const meta = await sharp(path.join(dir, files[0])).metadata()
const W = meta.width
const H = meta.height
const sw = Math.round(W * 0.1)
const sh = Math.round(H * 0.055)

async function mean(file, top) {
  // note: sharp's stats() reads the whole input, so average the extracted raw pixels ourselves
  const { data, info } = await sharp(file).extract({ left: W - sw, top, width: sw, height: sh }).raw().toBuffer({ resolveWithObject: true })
  const sum = [0, 0, 0]
  for (let i = 0; i < data.length; i += info.channels) {
    sum[0] += data[i]
    sum[1] += data[i + 1]
    sum[2] += data[i + 2]
  }
  const n = data.length / info.channels
  return sum.map((v) => v / n)
}

// pass 1: classify
const blank = []
for (const f of files) {
  const p = path.join(dir, f)
  const a = await mean(p, 0)
  const b = await mean(p, H - sh)
  blank.push(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 10)
}
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
