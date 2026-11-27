import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { askModel, modelReachable, type ModelConfig } from './ollama';
import { validateRequest, type ParseRequest } from './prompt';
import { transcribeWithWispr, validateTranscribe, type TranscribeRequest } from './wispr';

const MAX_BODY_BYTES = 20_000;
/** Audio uploads are bigger: allow about 2 minutes of 16 kHz WAV as base64. */
const MAX_AUDIO_BODY_BYTES = 4_200_000;

export interface VoiceConfig {
  /** Wispr Flow API key. Optional: without it /api/transcribe answers 503 and the app uses browser speech. */
  wisprKey?: string;
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
      return send(res, 200, { wispr: Boolean(voice.wisprKey) });
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
      if (!voice.wisprKey) return send(res, 503, { error: 'Wispr Flow is not configured' });
      try {
        return send(res, 200, { text: await transcribeWithWispr(voice.wisprKey, body as TranscribeRequest, fetchImpl) });
      } catch {
        return send(res, 502, { error: 'Wispr Flow did not return a transcript' });
      }
    }

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
  const voice: VoiceConfig = { wisprKey: process.env.WISPR_API_KEY || undefined };
  createApp(cfg, fetch, voice).listen(port, '127.0.0.1', () => {
    console.log(`BoliHisab server on http://127.0.0.1:${port}`);
    console.log(`  Wispr Flow: ${voice.wisprKey ? 'configured' : 'not configured (set WISPR_API_KEY); the app will use browser speech'}`);
    console.log(`  Local model (optional): ${cfg.url} (model: ${cfg.model})`);
  });
}
