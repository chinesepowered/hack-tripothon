// Server-only helpers for the Tripo API. The key never reaches the browser.
export const TRIPO_BASE = process.env.TRIPO_BASE || 'https://openapi.tripo3d.ai/v3'
export const STYLE =
  ', cute stylized 3D toy figurine, soft rounded chunky shapes, pastel colors, smooth hand-painted look, clean simple design, single object, no base'
export const NEG = 'realistic, photorealistic, scary, creepy, text, watermark, ground plane, base, pedestal, multiple objects'

export function key(): string | undefined {
  return process.env.TRIPO_API_KEY || undefined
}

export async function tripo<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const k = key()
  if (!k) throw new HttpError(503, 'live generation is not configured')
  const r = await fetch(TRIPO_BASE + path, {
    method,
    headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const j: any = await r.json().catch(() => ({}))
  if (j.code !== 0) {
    const status = r.status === 429 || j.code === 2000 ? 429 : j.code === 2010 ? 402 : 502
    throw new HttpError(status, j.message || `tripo error ${j.code}`)
  }
  return j.data as T
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  })
}

export function fail(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status)
  console.error(e)
  return json({ error: 'unexpected error' }, 500)
}

export const TASK_RE = /^[A-Za-z0-9_-]{8,80}$/

// Best-effort per-instance rate limit (serverless instances are short-lived).
const hits = new Map<string, number[]>()
export function rateLimit(req: Request, max: number, windowMs: number) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim()
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs)
  if (list.length >= max) throw new HttpError(429, 'The capybaras need a breather. Try again in a few minutes!')
  list.push(now)
  hits.set(ip, list)
}
