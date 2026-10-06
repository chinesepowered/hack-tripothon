// Deterministic screen-capture engine for WebGL apps.
// The page runs on a virtual clock (setTimeout/setInterval/performance.now/Date.now are
// replaced in capture mode), React Three Fiber renders only when told to (frameloop="never"),
// and CSS/WAAPI animations are stepped by hand. Each video frame advances everything by
// exactly 1/FPS seconds and takes a CDP screenshot, so rendering speed doesn't matter.
import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'

// Software GL occasionally hands back a screenshot taken before the WebGL canvas was composited
// (the flat page background shows through). With sharp available (SHARP=/path/to/sharp), such
// frames are detected and re-taken at the same virtual time; capture/deflicker.mjs stays as a net.
let sharp = null
try {
  sharp = createRequire(import.meta.url)(process.env.SHARP || 'sharp')
} catch {}
const MAX_TRIES = Number(process.env.RETAKES || 6)
const PAGE_BG = [
  [247, 198, 183],
  [216, 172, 157],
]
async function looksBlank(buf) {
  if (!sharp) return false
  const GW = 96
  const GH = 54
  const data = await sharp(buf).resize(GW, GH, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  for (let ty = 0; ty < 6; ty++) {
    for (let tx = 0; tx < 12; tx++) {
      const sum = [0, 0, 0]
      const sq = [0, 0, 0]
      for (let y = ty * 9; y < ty * 9 + 9; y++) {
        for (let x = tx * 8; x < tx * 8 + 8; x++) {
          const i = (y * GW + x) * 3
          for (let c = 0; c < 3; c++) {
            sum[c] += data[i + c]
            sq[c] += data[i + c] * data[i + c]
          }
        }
      }
      const mean = sum.map((v) => v / 72)
      const std = Math.max(...sq.map((v, c) => Math.sqrt(Math.max(0, v / 72 - mean[c] * mean[c]))))
      if (std < 1.6 && PAGE_BG.some((b) => Math.abs(b[0] - mean[0]) + Math.abs(b[1] - mean[1]) + Math.abs(b[2] - mean[2]) < 12)) return true
    }
  }
  return false
}

const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="40" viewBox="0 0 34 40"><path d="M4 3 L4 31 L11.5 24.5 L16.5 36 L22 33.5 L17 22.5 L27 22 Z" fill="#fffaf4" stroke="#4a3426" stroke-width="2.6" stroke-linejoin="round"/></svg>`

function initScript({ svg }) {
  // ---- virtual time ----
  const realSetTimeout = window.setTimeout.bind(window)
  let vnow = 0
  let nextId = 1
  const timers = new Map()
  window.__vnow = 0
  window.setTimeout = (fn, ms = 0, ...args) => {
    const id = nextId++
    timers.set(id, { at: vnow + Math.max(0, Number(ms) || 0), fn: typeof fn === 'function' ? () => fn(...args) : () => {}, every: 0 })
    return id
  }
  window.setInterval = (fn, ms = 0, ...args) => {
    const id = nextId++
    const every = Math.max(1, Number(ms) || 1)
    timers.set(id, { at: vnow + every, fn: () => fn(...args), every })
    return id
  }
  window.clearTimeout = window.clearInterval = (id) => void timers.delete(id)
  const t0 = Date.now()
  performance.now = () => vnow
  Date.now = () => t0 + vnow
  window.__vadvance = async (ms) => {
    const target = vnow + ms
    for (let guard = 0; guard < 10000; guard++) {
      let best = null
      for (const [id, t] of timers) if (t.at <= target && (!best || t.at < best[1].at)) best = [id, t]
      if (!best) break
      const [id, t] = best
      vnow = t.at
      window.__vnow = vnow
      if (t.every) t.at += t.every
      else timers.delete(id)
      try {
        t.fn()
      } catch (e) {
        console.error(e)
      }
      for (let i = 0; i < 6; i++) await null // let promise continuations run
    }
    vnow = target
    window.__vnow = vnow
  }
  window.__realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms))

  // ---- fake cursor + animation stepping ----
  window.__capture = true
  window.__cap = {
    el: null,
    ring: null,
    ensure() {
      if (this.el || !document.body) return
      const el = document.createElement('div')
      el.id = 'fake-cursor'
      el.innerHTML = svg
      Object.assign(el.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.25))', transformOrigin: '4px 3px' })
      const ring = document.createElement('div')
      Object.assign(ring.style, { position: 'fixed', left: '0', top: '0', width: '44px', height: '44px', marginLeft: '-22px', marginTop: '-22px', borderRadius: '50%', border: '3px solid rgba(242,120,106,.9)', zIndex: '2147483646', pointerEvents: 'none', opacity: '0' })
      document.body.appendChild(ring)
      document.body.appendChild(el)
      this.el = el
      this.ring = ring
    },
    stepAnimations(dt) {
      for (const a of document.getAnimations()) {
        if (a.__v === undefined) {
          a.__v = 0
          a.pause()
          a.currentTime = 0
        } else {
          a.__v += dt
          a.currentTime = a.__v
        }
      }
    },
    cursor(x, y, pressed, ringK, hidden) {
      this.ensure()
      if (!this.el) return
      this.el.style.transform = `translate(${x - 4}px, ${y - 3}px) scale(${pressed ? 0.88 : 1})`
      this.el.style.display = hidden ? 'none' : 'block'
      this.ring.style.opacity = ringK >= 0 && ringK < 1 ? String(1 - ringK) : '0'
      this.ring.style.transform = `translate(${x}px, ${y}px) scale(${0.3 + ringK * 1.3})`
    },
  }
}

export async function createCapture({ width = 1920, height = 1080, fps = 30, outDir, baseUrl }) {
  await fs.rm(outDir, { recursive: true, force: true })
  await fs.mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  })
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  const logs = []
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && logs.push(`[console] ${m.text()}`))
  await page.addInitScript(initScript, { svg: CURSOR_SVG })

  let frameNo = 0
  let retakes = 0
  const cursor = { x: width / 2, y: height * 0.62, pressed: false, ringAt: -999, hidden: false }
  const msPerFrame = 1000 / fps

  async function tick(step, withCursor = true) {
    const ringK = (frameNo - cursor.ringAt) / 12
    await page.evaluate(
      async ([dt, x, y, p, k, h, wc]) => {
        await window.__vadvance(dt)
        window.__cap.stepAnimations(dt)
        if (wc) window.__cap.cursor(x, y, p, k, h)
        window.__r3fAdvance?.(window.__vnow / 1000)
      },
      [step, cursor.x, cursor.y, cursor.pressed, ringK, cursor.hidden, withCursor],
    )
  }

  async function frame(n = 1) {
    for (let i = 0; i < n; i++) {
      const step = Math.round((frameNo + 1) * msPerFrame) - Math.round(frameNo * msPerFrame)
      await tick(step)
      // let the compositor present the freshly drawn WebGL frame before grabbing it
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      let buf
      for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 })
        buf = Buffer.from(data, 'base64')
        if (!(await looksBlank(buf))) break
        retakes++
        // wait for another presentation; from the third try, redraw the same instant first
        await page.evaluate(async ([redraw, wait]) => {
          if (redraw) window.__r3fAdvance?.(window.__vnow / 1000)
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          await window.__realSleep(wait)
        }, [attempt >= 2, Math.min(40 * 2 ** attempt, 640)])
      }
      await fs.writeFile(`${outDir}/f${String(frameNo).padStart(5, '0')}.jpg`, buf)
      frameNo++
      if (frameNo % 150 === 0) console.log(`  frame ${frameNo} (${(frameNo / fps).toFixed(1)}s)${retakes ? `, ${retakes} blank grabs re-taken` : ''}`)
    }
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

  async function moveTo(x, y, seconds = 0.6) {
    const n = Math.max(1, Math.round(seconds * fps))
    const x0 = cursor.x
    const y0 = cursor.y
    const arc = Math.min(60, Math.hypot(x - x0, y - y0) * 0.12)
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n)
      cursor.x = x0 + (x - x0) * k
      cursor.y = y0 + (y - y0) * k - Math.sin(Math.PI * k) * arc
      await page.mouse.move(cursor.x, cursor.y)
      await frame()
    }
  }

  async function center(selector) {
    await page.locator(selector).first().scrollIntoViewIfNeeded().catch(() => {})
    const box = await page.locator(selector).first().boundingBox()
    if (!box) throw new Error(`no element for ${selector}`)
    return [box.x + box.width / 2, box.y + box.height / 2]
  }

  async function click(target, { move = 0.55, hold = 3 } = {}) {
    const [x, y] = typeof target === 'string' ? await center(target) : target
    await moveTo(x, y, move)
    cursor.pressed = true
    await page.mouse.down()
    cursor.ringAt = frameNo
    await frame(hold)
    await page.mouse.up()
    cursor.pressed = false
    await frame(2)
  }

  async function drag(from, to, seconds = 1.2) {
    await moveTo(from[0], from[1], 0.4)
    cursor.pressed = true
    await page.mouse.down()
    await frame(2)
    const n = Math.round(seconds * fps)
    const [x0, y0] = from
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n)
      cursor.x = x0 + (to[0] - x0) * k
      cursor.y = y0 + (to[1] - y0) * k
      await page.mouse.move(cursor.x, cursor.y)
      await frame()
    }
    await page.mouse.up()
    cursor.pressed = false
    await frame(2)
  }

  async function type(selector, text, cps = 14) {
    await click(selector, { move: 0.45, hold: 2 })
    const per = Math.max(1, fps / cps)
    let acc = 0
    for (const ch of text) {
      await page.keyboard.type(ch)
      acc += per
      const n = Math.floor(acc)
      acc -= n
      if (n) await frame(n)
    }
    await frame(4)
  }

  /** Advance virtual time in small steps without recording while real time passes (asset loading). */
  async function settle(realMs = 4000, until) {
    const start = Date.now()
    while (Date.now() - start < realMs) {
      await tick(16, false).catch(() => {})
      await new Promise((r) => setTimeout(r, 100))
      if (until && (await page.evaluate(until).catch(() => false))) break
    }
  }

  async function goto(hash) {
    await page.goto(`${baseUrl}/?capture=1${hash}`)
  }

  async function setHash(hash) {
    await page.evaluate((h) => (location.hash = h), hash)
  }

  const t = () => frameNo / fps
  const sfxLog = () => page.evaluate(() => window.__sfxLog || [])
  const nowFake = () => page.evaluate(() => window.__vnow)

  return {
    cdp,
    page,
    browser,
    frame,
    moveTo,
    click,
    drag,
    type,
    settle,
    goto,
    setHash,
    center,
    cursor,
    t,
    sfxLog,
    nowFake,
    logs,
    get frameNo() {
      return frameNo
    },
    fps,
    width,
    height,
  }
}
