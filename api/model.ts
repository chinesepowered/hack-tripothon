import { tripo, fail, TASK_RE, HttpError } from './_lib/tripo'

// Streams a generated GLB through our origin (Tripo's CDN sends no CORS headers)
// and lets the edge cache keep it, so gift links keep working after Tripo's
// signed URLs expire.
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('task') || ''
    if (!TASK_RE.test(id)) throw new HttpError(400, 'bad task id')
    const d = await tripo<any>('GET', `/tasks/${id}`)
    const url = d.output?.model_url || d.output?.pbr_model_url
    if (d.status !== 'success' || !url) throw new HttpError(404, 'model not ready')
    const r = await fetch(url)
    if (!r.ok || !r.body) throw new HttpError(502, 'could not fetch model')
    return new Response(r.body, {
      status: 200,
      headers: {
        'content-type': 'model/gltf-binary',
        'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable',
        'access-control-allow-origin': '*',
      },
    })
  } catch (e) {
    return fail(e)
  }
}
