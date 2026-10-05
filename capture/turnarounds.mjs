// Renders front / 3-4 / side / back views of every Tripo asset for the asset board.
// Usage: node capture/turnarounds.mjs [baseUrl]
import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const BASE = process.argv[2] || 'http://localhost:5173'
const IDS = ['host', 'capy', 'capy4', 'cat', 'coffee', 'trophy', 'pillow', 'cake', 'telescope', 'rocket', 'books', 'teddy']
const ANGLES = [0, 35, 90, 180]
await fs.mkdir('public/board', { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 520, height: 520 } })
for (const id of IDS) {
  for (const a of ANGLES) {
    await page.goto(`${BASE}/?a=${a}#/board/${id}`)
    await page.waitForTimeout(5500)
    await page.screenshot({ path: `public/board/${id}-${a}.png` })
  }
  console.log('rendered', id)
}
await browser.close()
