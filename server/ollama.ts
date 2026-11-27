import { buildMessages, RESPONSE_SCHEMA, type ParseRequest } from './prompt';

export interface ModelConfig {
  /** Base URL of an Ollama-compatible server, e.g. http://localhost:11434 */
  url: string;
  /** Model tag, e.g. the Gemma or Qwen tag you pulled. */
  model: string;
}

/** Asks the local model to parse one sentence. Throws if the server or the answer is unusable. */
export async function askModel(
  cfg: ModelConfig,
  req: ParseRequest,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 20000,
): Promise<unknown> {
  const res = await fetchImpl(`${cfg.url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      messages: buildMessages(req),
      stream: false,
      format: RESPONSE_SCHEMA,
      options: { temperature: 0, num_predict: 200 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`model server answered ${res.status}`);
  const data = (await res.json()) as { message?: { content?: unknown } };
  const content = data?.message?.content;
  if (typeof content !== 'string') throw new Error('model returned no content');
  return JSON.parse(content); // throws if the model did not return JSON
}

/** True if the model server answers at all. */
export async function modelReachable(cfg: ModelConfig, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`${cfg.url}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
