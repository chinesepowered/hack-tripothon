import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

// Runs the Vercel-style web handlers in /api (export GET/POST(request: Request))
// inside the Vite dev server so live generation works locally too.
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url || '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()
        const name = url.pathname.slice(5).replace(/\/$/, '')
        const file = path.resolve(__dirname, 'api', `${name}.ts`)
        if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(file)) {
          res.statusCode = 404
          return res.end('not found')
        }
        try {
          const mod = await server.ssrLoadModule(file)
          const handler = mod[req.method || 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end('method not allowed')
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const request = new Request(url.toString(), {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          })
          const response: Response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          console.error('[dev-api]', err)
          res.statusCode = 500
          res.end(String(err))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApi()],
  server: { host: true, port: 5173 },
  build: {
    chunkSizeWarningLimit: 2000,
  },
})
