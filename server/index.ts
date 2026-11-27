import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { askModel, modelReachable, type ModelConfig } from './ollama';
import { validateRequest, type ParseRequest } from './prompt';

const MAX_BODY_BYTES = 20_000;

function send(res: ServerResponse, status: number, json: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(json));
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        resolve(null);
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
  });
}

/**
 * A tiny proxy in front of a local open-source model (Ollama-compatible).
 * It is optional: the app works without it, using its rule-based parser.
 */
export function createApp(cfg: ModelConfig, fetchImpl: typeof fetch = fetch): Server {
  return createServer(async (req, res) => {
    const path = (req.url ?? '').split('?')[0];

    if (path === '/api/health') {
      if (req.method !== 'GET') return send(res, 405, { error: 'use GET' });
      return send(res, 200, { ok: await modelReachable(cfg, fetchImpl), model: cfg.model });
    }

    if (path === '/api/parse') {
      if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
      const raw = await readBody(req);
      if (raw === null) return send(res, 413, { error: 'request too large' });
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return send(res, 400, { error: 'invalid JSON' });
      }
      const problem = validateRequest(body);
      if (problem) return send(res, 400, { error: problem });
      try {
        return send(res, 200, await askModel(cfg, body as ParseRequest, fetchImpl));
      } catch {
        return send(res, 502, { error: 'local model unavailable or returned an unusable answer' });
      }
    }

    return send(res, 404, { error: 'not found' });
  });
}

// Run directly: `npm run edge`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg: ModelConfig = {
    url: process.env.LOCAL_LLM_URL ?? 'http://localhost:11434',
    model: process.env.LOCAL_LLM_MODEL ?? 'gemma3n:e2b',
  };
  const port = Number(process.env.PORT ?? 8787);
  createApp(cfg).listen(port, '127.0.0.1', () => {
    console.log(`BoliHisab edge proxy on http://127.0.0.1:${port}  ->  ${cfg.url}  (model: ${cfg.model})`);
  });
}
