export interface Env {
  // Cloudflare dashboard binding name (as configured in the Worker UI)
  IMG: R2Bucket;
  UPLOAD_TOKEN?: string;
  CDN_BASE?: string;
}

const DEFAULT_CDN_BASE = 'https://cdn.moltwallet.app';

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,HEAD,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,content-length,x-upload-token',
  };
}

function badRequest(message: string, status = 400) {
  return json({ ok: false, error: message }, status);
}

function normalizeKey(raw: string) {
  // decode and normalize leading slashes
  let k = raw;
  try {
    k = decodeURIComponent(k);
  } catch {}
  k = k.replace(/^\/+/, '');
  return k;
}

function validateKey(key: string) {
  // Guardrails: keep uploads constrained to a known namespace.
  if (!key.startsWith('tokens/')) return 'Key must start with tokens/';
  if (key.includes('..')) return 'Key must not contain ..';

  const lower = key.toLowerCase();
  const okExt =
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.json');
  if (!okExt) return 'Unsupported file extension';

  return null;
}

function maxBytesForKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.json')) return 64 * 1024; // 64KB for metadata
  return 2 * 1024 * 1024; // 2MB for images
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true });
    }

    // Public write endpoint
    // PUT /objects/<key>
    if (req.method === 'PUT' && url.pathname.startsWith('/objects/')) {
      if (env.UPLOAD_TOKEN) {
        const tok = req.headers.get('x-upload-token') || '';
        if (tok !== env.UPLOAD_TOKEN) return badRequest('Unauthorized', 401);
      }

      const rawKey = url.pathname.slice('/objects/'.length);
      const key = normalizeKey(rawKey);

      const keyErr = validateKey(key);
      if (keyErr) return badRequest(keyErr, 400);

      const contentType = req.headers.get('content-type') || '';
      if (!contentType) return badRequest('Missing Content-Type header', 400);

      // Size limit (best-effort)
      const maxBytes = maxBytesForKey(key);
      const len = req.headers.get('content-length');
      if (len) {
        const n = Number(len);
        if (Number.isFinite(n) && n > maxBytes) {
          return badRequest(`File too large (max ${maxBytes} bytes)`, 413);
        }
      }

      // Create-only by default
      const overwrite = url.searchParams.get('overwrite') === '1';
      if (!overwrite) {
        const existing = await env.IMG.head(key);
        if (existing) {
          return badRequest('Object already exists (use ?overwrite=1 to overwrite)', 409);
        }
      }

      const body = req.body;
      if (!body) return badRequest('Missing request body', 400);

      const res = await env.IMG.put(key, body, {
        httpMetadata: {
          contentType,
          cacheControl: key.toLowerCase().endsWith('.json')
            ? 'public, max-age=300'
            : 'public, max-age=31536000, immutable',
        },
      });

      const base = env.CDN_BASE || DEFAULT_CDN_BASE;
      return json({ ok: true, key, etag: res.etag, url: `${base}/${key}` }, 200);
    }

    // Explicitly disallow deletes
    if (req.method === 'DELETE') {
      return badRequest('Delete not supported', 405);
    }

    return badRequest('Not found', 404);
  },
};
