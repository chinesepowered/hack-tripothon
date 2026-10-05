import { createCapture } from './engine.mjs'
const W = +process.env.W || 1920, H = +process.env.H || 1080
const cap = await createCapture({ width: W, height: H, fps: 30, outDir: `capture/out/bench-${W}`, baseUrl: 'http://localhost:5173' })
await cap.page.goto(`http://localhost:5173/?capture=1&${process.env.Q || ''}#/`)
await cap.settle(40000, () => (window.__glbLoaded || 0) >= 9)
await cap.settle(1500)
await cap.frame(4)
const t0 = Date.now()
await cap.frame(8)
console.log(`${W}x${H} ${process.env.Q || ''}: ${((Date.now() - t0) / 8).toFixed(0)} ms/frame`)
await cap.browser.close()
