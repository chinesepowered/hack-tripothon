// Quick screenshot helper: node capture/shot.mjs <url> <out.png> [waitMs] [w] [h] [clickSelector|x,y ...]
import { chromium } from 'playwright'
const [url, out, wait = '6000', w = '1600', h = '900', ...clicks] = process.argv.slice(2)
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
})
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(url)
await page.waitForTimeout(+wait)
for (const c of clicks) {
  if (/^\d+,\d+$/.test(c)) {
    const [x, y] = c.split(',').map(Number)
    await page.mouse.click(x, y)
  } else if (/^wait:\d+$/.test(c)) {
    await page.waitForTimeout(+c.slice(5))
  } else if (/^shot:/.test(c)) {
    await page.screenshot({ path: c.slice(5) })
  } else {
    await page.click(c).catch((e) => logs.push('click failed ' + c + ' ' + e.message))
  }
}
await page.screenshot({ path: out })
console.log(logs.slice(0, 30).join('\n') || 'no console errors')
await browser.close()
