import { tripo, json, fail, rateLimit, STYLE, NEG, HttpError } from './_lib/tripo.js'

export async function POST(req: Request) {
  try {
    rateLimit(req, 4, 60 * 60 * 1000)
    const body: any = await req.json().catch(() => ({}))
    const prompt = String(body.prompt || '')
      .replace(/[\u0000-\u001f]/g, ' ')
      .trim()
      .slice(0, 140)
    if (prompt.length < 2) throw new HttpError(400, 'Tell the capybaras what to make!')
    const data = await tripo<{ task_id: string }>('POST', '/generation/text-to-model', {
      prompt: prompt + STYLE,
      negative_prompt: NEG,
      model: process.env.TRIPO_MODEL || 'v3.1-20260211',
      face_limit: 8000,
      texture: true,
      pbr: true,
      texture_version: 'v3.5-20260815',
      texture_quality: 'fast',
    })
    return json({ task: data.task_id })
  } catch (e) {
    return fail(e)
  }
}
