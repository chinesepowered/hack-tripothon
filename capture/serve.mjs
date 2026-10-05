// Serves the production build (dist/) plus the /api handlers (compiled to .api-build/) so
// captures run against a frozen build instead of the hot-reloading dev server.
// Usage: TRIPO_API_KEY=... node capture/serve.mjs [port]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const DIST = path.join(ROOT, 'dist')
const API = path.join(ROOT, '.api-build')
const port = Number(process.argv[2] || 4173)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.webp': 'image/webp' }

http
  .createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost')
    try {
      if (url.pathname.startsWith('/api/')) {
        const name = url.pathname.slice(5).replace(/\/$/, '')
        const file = path.join(API, `${name}.js`)
        if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(file)) return void res.writeHead(404).end('not found')
        const mod = await import(file)
        const handler = mod[req.method || 'GET']
        if (!handler) return void res.writeHead(405).end()
        const chunks = []
        for await (const c of req) chunks.push(c)
        const request = new Request(url.toString(), { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) })
        const r = await handler(request)
        res.writeHead(r.status, Object.fromEntries(r.headers))
        return void res.end(Buffer.from(await r.arrayBuffer()))
      }
      let file = path.join(DIST, decodeURIComponent(url.pathname))
      if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
      fs.createReadStream(file).pipe(res)
    } catch (e) {
      console.error(e)
      res.writeHead(500).end(String(e))
    }
  })
  .listen(port, () => console.log(`serving dist + api on http://localhost:${port}`))
