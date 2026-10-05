import { key, tripo, json } from './_lib/tripo'

let cache: { at: number; balance: number } | null = null

export async function GET() {
  if (!key()) return json({ live: false, reason: 'not-configured' })
  try {
    if (!cache || Date.now() - cache.at > 60_000) {
      const b = await tripo<{ balance: number }>('GET', '/account/balance')
      cache = { at: Date.now(), balance: b.balance }
    }
    return json({ live: cache.balance >= 25, reason: cache.balance >= 25 ? 'ok' : 'out-of-credits' })
  } catch {
    return json({ live: false, reason: 'unreachable' })
  }
}
