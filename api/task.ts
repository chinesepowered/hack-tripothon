import { tripo, json, fail, TASK_RE, HttpError } from './_lib/tripo'

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id') || ''
    if (!TASK_RE.test(id)) throw new HttpError(400, 'bad task id')
    const d = await tripo<any>('GET', `/tasks/${id}`)
    return json({
      status: d.status,
      progress: d.progress ?? 0,
      preview: d.output?.rendered_image_url ? `/api/preview?task=${id}` : undefined,
      error: d.status === 'banned' ? 'The capybaras politely declined that one. Try something else!' : d.error_message,
    })
  } catch (e) {
    return fail(e)
  }
}
