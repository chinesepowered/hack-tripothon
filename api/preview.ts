import { tripo, fail, TASK_RE, HttpError } from './_lib/tripo.js'

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('task') || ''
    if (!TASK_RE.test(id)) throw new HttpError(400, 'bad task id')
    const d = await tripo<any>('GET', `/tasks/${id}`)
    const url = d.output?.rendered_image_url
    if (!url) throw new HttpError(404, 'no preview')
    const r = await fetch(url)
    if (!r.ok || !r.body) throw new HttpError(502, 'could not fetch preview')
    return new Response(r.body, {
      headers: { 'content-type': r.headers.get('content-type') || 'image/webp', 'cache-control': 'public, s-maxage=31536000, immutable' },
    })
  } catch (e) {
    return fail(e)
  }
}
