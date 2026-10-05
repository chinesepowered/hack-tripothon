#!/usr/bin/env node
// Batch-generates Capy Post's asset library with the Tripo API:
//   text-to-3D  ->  (rig-check -> auto-rig -> animation retarget)  ->  GLB in public/assets
// Resumable: finished assets are skipped, in-flight task ids live in scripts/gen-state.json.
//
// Usage: TRIPO_API_KEY=... NODE_USE_ENV_PROXY=1 node scripts/generate-assets.mjs [id ...]
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const KEY = process.env.TRIPO_API_KEY
const BASE = process.env.TRIPO_BASE || 'https://openapi.tripo3d.ai/v3'
const MODEL = process.env.TRIPO_MODEL || 'v3.1-20260211'
const RESERVE = Number(process.env.TRIPO_RESERVE || 150) // credits kept for live generation
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(ROOT, 'public/assets')
const STATE = path.join(ROOT, 'scripts/gen-state.json')
const MANIFEST = path.join(OUT, 'manifest.json')

if (!KEY) {
  console.error('TRIPO_API_KEY is not set')
  process.exit(1)
}

export const STYLE =
  ', cute stylized 3D toy figurine, soft rounded chunky shapes, pastel colors, smooth hand-painted look, clean simple design, single object, no base'
export const NEG = 'realistic, photorealistic, scary, creepy, text, watermark, ground plane, base, pedestal, multiple objects'

const CAPY_GEN = 'c255a461-b255-4ec6-ab6d-6c5821a067bf' // first capybara: came out as an upright plush, perfect host
const QUAD_STYLE = ', cute stylized 3D animal figurine, smooth rounded shapes, soft hand-painted look, single animal, no base'
const QUAD_NEG = 'standing upright, bipedal, sitting, humanoid, realistic, scary, text, base, pedestal, multiple animals'

const SPECS = [
  // Host capybara: static copy (soaking in the onsen) + biped rig with a few moves
  { id: 'capy', fromGen: CAPY_GEN, height: 1.0, prompt: 'a cute chubby capybara, calm content sleepy face, small round ears, blunt square snout, soft warm brown fur' },
  {
    id: 'host',
    fromGen: CAPY_GEN,
    kind: 'biped',
    height: 1.25,
    anims: ['preset:biped:greet_01', 'preset:biped:dance_01', 'preset:biped:walk', 'preset:biped:standing_relax', 'preset:biped:cheer'],
    prompt: 'a cute chubby capybara, calm content sleepy face, small round ears, blunt square snout, soft warm brown fur',
  },
  {
    id: 'capy4',
    kind: 'quadruped',
    height: 0.8,
    faces: 16000,
    anims: ['preset:quadruped:walk'],
    style: QUAD_STYLE,
    neg: QUAD_NEG,
    // Tripo orients models by their reference image; "side profile" put this one's head along -X
    yaw: 0,
    prompt:
      'a capybara walking on all four legs, long horizontal barrel shaped body low to the ground, four short sturdy legs, side profile, blunt square snout, tiny round ears, soft warm brown fur, calm content face',
  },
  { id: 'coffee', height: 0.95, faces: 8000, prompt: 'a giant cute coffee mug with a latte art heart on top, cream colored mug with a pastel stripe' },
  { id: 'trophy', height: 1.0, faces: 8000, prompt: 'a small shiny golden trophy cup with two handles and a star on top' },
  { id: 'pillow', height: 0.7, faces: 6000, prompt: 'a fluffy soft pastel pink square pillow with a cute sleepy smiling face' },
  { id: 'cake', height: 0.9, faces: 10000, prompt: 'a cute round birthday cake with pink frosting, strawberries and three candles' },
  {
    id: 'cat',
    kind: 'quadruped',
    height: 0.7,
    faces: 12000,
    anims: ['preset:quadruped:walk'],
    style: QUAD_STYLE,
    neg: QUAD_NEG,
    prompt: 'a cute chubby orange tabby cat walking on all four legs, horizontal body, legs straight and slightly apart, round face, tail up',
  },
  { id: 'telescope', height: 1.2, faces: 8000, prompt: 'a cute small brass telescope on a short wooden tripod' },
  { id: 'rocket', height: 1.3, faces: 8000, prompt: 'a cute chubby red and white toy rocket with a round blue window and three fins' },
  { id: 'books', height: 0.8, faces: 8000, prompt: 'a small stack of three colorful hardcover books with a shiny red apple on top' },
  { id: 'teddy', height: 0.9, faces: 10000, prompt: 'a cute brown teddy bear sitting down, wearing a red bow tie' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(method, p, body) {
  let last
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const r = await fetch(BASE + p, {
        method,
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const j = await r.json().catch(() => ({}))
      if (r.status === 429 || j.code === 2000 || j.code === 1007) {
        await sleep(4000 * (attempt + 1))
        continue
      }
      if (j.code !== 0) throw Object.assign(new Error(`${method} ${p} -> ${r.status} ${JSON.stringify(j)}`), { fatal: true })
      return j.data
    } catch (e) {
      last = e
      if (e.fatal) throw e
      await sleep(3000 * (attempt + 1))
    }
  }
  throw last
}

async function waitTask(id, label) {
  const start = Date.now()
  let lastLog = ''
  while (Date.now() - start < 15 * 60 * 1000) {
    const d = await api('GET', `/tasks/${id}`)
    const line = `${d.status} ${d.progress ?? 0}%`
    if (line !== lastLog) {
      console.log(`  [${label}] ${line}`)
      lastLog = line
    }
    if (d.status === 'success') return d
    if (['failed', 'cancelled', 'banned', 'expired'].includes(d.status)) {
      throw new Error(`[${label}] task ${id} ${d.status} ${d.error_code ?? ''} ${d.error_message ?? ''}`)
    }
    await sleep(3000)
  }
  throw new Error(`[${label}] task ${id} timed out`)
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

let state = await readJson(STATE, {})
const saveState = () => fs.writeFile(STATE, JSON.stringify(state, null, 2) + '\n')

async function download(url, file) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`download ${r.status} ${url}`)
  const buf = Buffer.from(await r.arrayBuffer())
  await fs.writeFile(file, buf)
  return buf.length
}

async function step(spec, key, create) {
  const s = (state[spec.id] ||= {})
  if (!s[key]) {
    const d = await create()
    s[key] = d.task_id
    await saveState()
    console.log(`  [${spec.id}] ${key} task ${d.task_id}`)
  }
  const done = await waitTask(s[key], `${spec.id}:${key}`)
  s[`${key}_credits`] = done.credits_consumed
  await saveState()
  return done
}

async function generate(spec) {
  const file = path.join(OUT, `${spec.id}.glb`)
  if (existsSync(file) && state[spec.id]?.done) {
    console.log(`skip ${spec.id} (done)`)
    return
  }
  console.log(`\n=== ${spec.id} (${spec.kind || 'object'})`)
  if (spec.fromGen) (state[spec.id] ||= {}).gen = spec.fromGen
  const gen = await step(spec, 'gen', () =>
    api('POST', '/generation/text-to-model', {
      prompt: spec.prompt + (spec.style ?? STYLE),
      negative_prompt: spec.neg ?? NEG,
      model: MODEL,
      face_limit: spec.faces,
      texture: true,
      pbr: true,
    }),
  )
  let finalUrl = gen.output?.model_url || gen.output?.pbr_model_url
  const preview = gen.output?.rendered_image_url
  if (preview) await download(preview, path.join(OUT, `${spec.id}.preview.png`)).catch(() => {})
  let rigged = false
  let clip

  if (spec.kind === 'quadruped' || spec.kind === 'biped') {
    try {
      const check = await step(spec, 'rigcheck', () => api('POST', '/animations/rig-check', { input: state[spec.id].gen }))
      console.log(`  [${spec.id}] rig-check`, JSON.stringify(check.output))
      const rigType = spec.kind
      const rig = await step(spec, 'rig', () =>
        api('POST', '/animations/rig', {
          input: state[spec.id].gen,
          model: rigType === 'biped' ? 'v1.0-20240301' : 'v2.5-20260210',
          rig_type: rigType,
          out_format: 'glb',
        }),
      )
      finalUrl = rig.output?.model_url || finalUrl
      rigged = true
      const anim = await step(spec, 'anim', () =>
        api('POST', '/animations/retarget', {
          input: state[spec.id].rig,
          ...(spec.anims.length > 1 ? { animations: spec.anims } : { animation: spec.anims[0] }),
          out_format: 'glb',
          bake_animation: true,
          animate_in_place: true,
        }),
      )
      finalUrl = anim.output?.model_url || finalUrl
      clip = spec.anims[0]
    } catch (e) {
      console.warn(`  [${spec.id}] rig/animate failed, keeping static model:`, e.message)
      // keep whatever we have (static or rigged)
      if (state[spec.id].rig && !state[spec.id].anim) {
        const r = await api('GET', `/tasks/${state[spec.id].rig}`).catch(() => null)
        if (r?.output?.model_url) finalUrl = r.output.model_url
      }
    }
  }

  const bytes = await download(finalUrl, file)
  console.log(`  [${spec.id}] saved ${(bytes / 1024 / 1024).toFixed(2)} MB`)
  state[spec.id].done = true
  await saveState()

  const manifest = await readJson(MANIFEST, { assets: {} })
  manifest.generatedAt = new Date().toISOString()
  manifest.assets[spec.id] = {
    url: `/assets/${spec.id}.glb`,
    height: spec.height,
    yaw: spec.yaw ?? -Math.PI / 2,
    clip: rigged ? clip : undefined,
    rigged,
    prompt: spec.prompt,
    task: state[spec.id].gen,
    model: MODEL,
  }
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
}

async function balance() {
  const b = await api('GET', '/account/balance')
  return b.balance
}

await fs.mkdir(OUT, { recursive: true })
const wanted = process.argv.slice(2)
const queue = SPECS.filter((s) => !wanted.length || wanted.includes(s.id))
const CONCURRENCY = Number(process.env.TRIPO_CONCURRENCY || 4)
console.log(`balance: ${await balance()} credits, model ${MODEL}, ${queue.length} assets`)

let idx = 0
async function worker() {
  while (idx < queue.length) {
    const spec = queue[idx++]
    const bal = await balance().catch(() => Infinity)
    if (bal < RESERVE && !state[spec.id]?.gen) {
      console.warn(`stop: balance ${bal} below reserve ${RESERVE}, skipping ${spec.id}`)
      continue
    }
    try {
      await generate(spec)
    } catch (e) {
      console.error(`FAILED ${spec.id}:`, e.message)
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
console.log(`\ndone. balance: ${await balance()} credits`)
