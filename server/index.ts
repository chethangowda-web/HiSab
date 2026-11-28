import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { askModel, modelReachable, type ModelConfig } from './ollama';
import { validateRequest, type ParseRequest } from './prompt';
import { askSarvam, askSarvamMulti, DEFAULT_SARVAM_MODEL, transcribeWithSarvam, ttsWithSarvam } from './sarvam';
import { transcribeWithWispr, validateTranscribe, type TranscribeRequest } from './wispr';

const MAX_BODY_BYTES = 20_000;
/** Audio uploads are bigger: allow about 2 minutes of 16 kHz WAV as base64. */
const MAX_AUDIO_BODY_BYTES = 4_200_000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

export interface VoiceConfig {
  /** Wispr Flow API key. Optional: without it /api/transcribe answers 503 and the app uses browser speech. */
  wisprKey?: string;
  /** Optional directory (e.g. `dist`) to serve static frontend assets in production. */
  staticDir?: string;
}

function send(res: ServerResponse, status: number, json: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(json));
}

function readBody(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<string | null> {
  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
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
 * It also forwards recordings to Wispr Flow, keeping the API key on the server.
 */
export function createApp(cfg: ModelConfig, fetchImpl: typeof fetch = fetch, voice: VoiceConfig = {}): Server {
  return createServer(async (req, res) => {
    const path = (req.url ?? '').split('?')[0];

    if (path === '/api/voice-health') {
      if (req.method !== 'GET') return send(res, 405, { error: 'use GET' });
      return send(res, 200, cfg.sarvamKey ? { wispr: Boolean(voice.wisprKey), sarvamStt: true, sarvamTts: true } : { wispr: Boolean(voice.wisprKey) });
    }

    if (path === '/api/transcribe') {
      if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
      const raw = await readBody(req, MAX_AUDIO_BODY_BYTES);
      if (raw === null) return send(res, 413, { error: 'recording too large' });
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return send(res, 400, { error: 'invalid JSON' });
      }
      const problem = validateTranscribe(body);
      if (problem) return send(res, 400, { error: problem });
      if (!voice.wisprKey && !cfg.sarvamKey) return send(res, 503, { error: 'Wispr Flow is not configured' });
      try {
        if (voice.wisprKey) {
          try {
            return send(res, 200, { text: await transcribeWithWispr(voice.wisprKey, body as TranscribeRequest, fetchImpl) });
          } catch {
            if (!cfg.sarvamKey) throw new Error('wispr failed');
          }
        }
        return send(res, 200, { text: await transcribeWithSarvam(cfg.sarvamKey!, body as TranscribeRequest, fetchImpl) });
      } catch {
        return send(res, 502, { error: 'Speech transcription failed' });
      }
    }

    if (path === '/api/tts') {
      if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
      if (!cfg.sarvamKey) return send(res, 503, { error: 'Sarvam is not configured' });
      const raw = await readBody(req);
      if (raw === null) return send(res, 413, { error: 'request too large' });
      let body: { text?: unknown; lang?: unknown };
      try {
        body = JSON.parse(raw);
      } catch {
        return send(res, 400, { error: 'invalid JSON' });
      }
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > 1500) return send(res, 400, { error: 'text must be 1-1500 characters' });
      if (body.lang !== 'en-IN' && body.lang !== 'hi-IN' && body.lang !== 'kn-IN') return send(res, 400, { error: 'unsupported language' });
      try {
        return send(res, 200, { audio: await ttsWithSarvam(cfg.sarvamKey, text, body.lang, fetchImpl) });
      } catch {
        return send(res, 502, { error: 'Speech synthesis failed' });
      }
    }

    if (path === '/api/health') {
      if (req.method !== 'GET') return send(res, 405, { error: 'use GET' });
      if (cfg.sarvamKey) {
        return send(res, 200, { ok: true, model: cfg.sarvamModel ?? DEFAULT_SARVAM_MODEL, provider: 'sarvam' });
      }
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
        const parsed = cfg.sarvamKey
          ? await askSarvam({ apiKey: cfg.sarvamKey, model: cfg.sarvamModel }, body as ParseRequest, fetchImpl)
          : await askModel(cfg, body as ParseRequest, fetchImpl);
        return send(res, 200, parsed);
      } catch {
        return send(res, 502, { error: 'model unavailable or returned an unusable answer' });
      }
    }

    if (path === '/api/parse-multi') {
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
      if (!cfg.sarvamKey) return send(res, 503, { error: 'Sarvam LLM is not configured' });
      try {
        return send(res, 200, await askSarvamMulti({ apiKey: cfg.sarvamKey, model: cfg.sarvamModel }, body as ParseRequest, fetchImpl));
      } catch {
        return send(res, 502, { error: 'model unavailable or returned an unusable answer' });
      }
    }

    if (voice.staticDir && req.method === 'GET' && !path.startsWith('/api/')) {
      const root = resolve(voice.staticDir);
      const rel = path === '/' ? 'index.html' : path.replace(/^\/+/, '');
      const candidate = resolve(root, rel);
      const safeFile = candidate.startsWith(root + sep) && existsSync(candidate) && statSync(candidate).isFile();
      const target = safeFile ? candidate : join(root, 'index.html');
      if (existsSync(target) && statSync(target).isFile()) {
        res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' });
        res.end(readFileSync(target));
        return;
      }
    }

    return send(res, 404, { error: 'not found' });
  });
}

// Run directly: `npm run edge` or `npm run server`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg: ModelConfig = {
    url: process.env.LOCAL_LLM_URL ?? 'http://localhost:11434',
    model: process.env.LOCAL_LLM_MODEL ?? 'gemma3n:e2b',
    sarvamKey: process.env.SARVAM_API_KEY || undefined,
    sarvamModel: process.env.SARVAM_MODEL || undefined,
  };
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
  const distDir = resolve(process.cwd(), 'dist');
  const voice: VoiceConfig = {
    wisprKey: process.env.WISPR_API_KEY || undefined,
    staticDir: existsSync(join(distDir, 'index.html')) ? distDir : undefined,
  };
  createApp(cfg, fetch, voice).listen(port, host, () => {
    console.log(`BoliHisab server on http://${host}:${port}`);
    console.log(`  Wispr Flow: ${voice.wisprKey ? 'configured' : 'not configured (set WISPR_API_KEY); the app will use browser speech'}`);
    if (cfg.sarvamKey) {
      console.log(`  LLM (Sarvam): ${cfg.sarvamModel ?? DEFAULT_SARVAM_MODEL}`);
    } else {
      console.log(`  Local model (optional): ${cfg.url} (model: ${cfg.model})`);
    }
    if (voice.staticDir) console.log(`  Static frontend: ${voice.staticDir}`);
  });
}
