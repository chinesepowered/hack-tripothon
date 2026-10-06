#!/usr/bin/env node
// Renders the demo-day slides (HTML → 1920x1080 PNG; transparent where the page has no background).
// Usage: node capture/stage/slides/render.mjs [name ...]
import path from 'node:path'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const names = process.argv.slice(2).length ? process.argv.slice(2) : (await fs.readdir(DIR)).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const n of names) {
  await page.goto(`file://${path.join(DIR, n + '.html')}`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(DIR, n + '.png'), omitBackground: true })
  console.log('rendered', n)
}
await browser.close()
