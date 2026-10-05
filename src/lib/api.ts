// Client for our /api routes (Vercel functions). On static hosting these 404
// and the app falls back to the pre-generated Tripo library.

export async function liveAvailable(): Promise<boolean> {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' })
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return false
    const j = await r.json()
    return !!j.live
  } catch {
    return false
  }
}

export async function startGeneration(prompt: string): Promise<string> {
  const r = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.task) throw new Error(j.error || `generation failed (${r.status})`)
  return j.task
}

export type TaskStatus = { status: string; progress: number; error?: string }

export async function getTask(task: string): Promise<TaskStatus> {
  const r = await fetch(`/api/task?id=${encodeURIComponent(task)}`, { cache: 'no-store' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `task lookup failed (${r.status})`)
  return j
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Polls until the task finishes; reports progress (0-100). */
export async function waitForTask(task: string, onProgress: (p: number, status: string) => void, timeoutMs = 5 * 60 * 1000) {
  const start = Date.now()
  let errors = 0
  while (Date.now() - start < timeoutMs) {
    try {
      const t = await getTask(task)
      errors = 0
      onProgress(t.progress, t.status)
      if (t.status === 'success') return
      if (['failed', 'cancelled', 'banned', 'expired'].includes(t.status)) throw new Error(t.error || `generation ${t.status}`)
    } catch (e) {
      if (++errors > 4) throw e
    }
    // capture mode steps a fake clock slowly, so poll more often there to keep the progress bar smooth
    await sleep((window as any).__capture ? 400 : 2500)
  }
  throw new Error('generation timed out')
}
