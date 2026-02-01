# Moltwallet R2 Upload Worker

This Cloudflare Worker provides a simple, safe-ish public upload endpoint for the Moltwallet R2 bucket.

## What it does

- Public **read** is handled by the R2 custom domain (e.g. `https://cdn.moltwallet.app/...`).
- This worker adds public **write** with guardrails:
  - **No delete** endpoint.
  - Key allowlist (defaults to `tokens/` namespace).
  - File extension allowlist.
  - Size limits.
  - Optional create-only behavior (reject overwrite).

## Endpoints

- `PUT /objects/<key>`
  - Body: raw bytes
  - Headers:
    - `Content-Type`: required
    - `Content-Length`: recommended
  - Returns JSON with `{ ok, key, url }`.

- `GET /health`

## Deploy

1) Install Wrangler

```bash
npm i -g wrangler
```

2) Configure bindings in `wrangler.toml`:

- Update `name` and `compatibility_date` if you want
- Set the R2 bucket binding name + bucket name

3) Login + deploy:

```bash
wrangler login
wrangler deploy
```

4) Add a route for your API hostname (recommended)

Example: `https://api.moltwallet.app/*` → this worker.

## Security notes

Making "anyone can write" is inherently risky.

If abuse becomes a problem, add one of:
- `UPLOAD_TOKEN` (simple shared secret)
- Cloudflare Turnstile
- Per-IP rate limits (KV / Durable Objects)
