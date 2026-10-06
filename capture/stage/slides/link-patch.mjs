#!/usr/bin/env node
// The stage shots run against a local server, so the share link in the "Wrapped & ready to send"
// panel reads http://localhost:4173/…. This renders the same input (same app CSS, same layout)
// holding the production URL, as a patch for capture/stage-edit.mjs to lay over those frames.
// Usage: node capture/stage/slides/link-patch.mjs [baseUrl]   (writes link-patch-{copy,copied}.png + link-patch.json)
import fs from 'node:fs/promises'
import path from 'node:path'
import LZString from 'lz-string'
import { chromium } from 'playwright'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const BASE = process.argv[2] || 'http://localhost:4173'
const MSG = "Moving across the world was the bravest thing you've ever done. Here's a little place to rest. The capybaras are holding your spot."
// the gift exactly as the app builds it in the sam shot (only the visible prefix matters)
const gift = {
  v: 1,
  to: 'Sam',
  from: 'Alex',
  msg: MSG,
  theme: 'onsen',
  items: [
    { label: 'A birthday cake', lib: 'cake', walk: false },
    { label: 'A tiny cat', lib: 'cat', walk: true },
    { label: 'a little red bicycle with a basket', task: 'stage-bike-0001' },
  ],
}
const url = `https://hack-tripothon.vercel.app/#/g/${LZString.compressToEncodedURIComponent(JSON.stringify(gift))}`

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.route('**/api/health', (r) => r.fulfill({ json: { live: false } }))
await page.goto(`${BASE}/#/create`)
await page.fill('[data-testid=to]', 'Sam')
await page.fill('[data-testid=from]', 'Alex')
await page.click('[data-testid=shelf-cake]')
await page.click('[data-testid=shelf-cat]')
await page.fill('[data-testid=item-2]', 'a little red bicycle with a basket')
await page.fill('[data-testid=msg]', MSG)
await page.click('[data-testid=build]')
await page.locator('[data-testid=wrap]').waitFor({ timeout: 60000 })
await page.click('[data-testid=wrap]')
const input = page.locator('[data-testid=share-link]')
await input.waitFor()
// one patch per button state: "Copy" leaves the input wider than "Copied!" does
const out = {}
for (const state of ['copy', 'copied']) {
  if (state === 'copied') await page.evaluate(() => document.querySelector('.share button').click())
  await page.evaluate((u) => {
    const el = document.querySelector('[data-testid=share-link]')
    el.value = u
    el.blur()
    el.scrollLeft = 0
  }, url)
  await page.mouse.move(1900, 1070)
  await page.waitForTimeout(300)
  const box = await input.boundingBox()
  const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) }
  await page.screenshot({ path: path.join(DIR, `link-patch-${state}.png`), clip, timeout: 180000 })
  out[state] = clip
  console.log(state, clip)
}
await fs.writeFile(path.join(DIR, 'link-patch.json'), JSON.stringify({ ...out, url }, null, 2) + '\n')
await browser.close()
