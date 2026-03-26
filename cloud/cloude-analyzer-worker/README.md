# Cloude Analyzer Worker

Minimal Cloudflare Worker endpoint used by the supermarkets flow in the frontend.

## Deploy

1. Install dependencies:

```bash
cd cloud/cloude-analyzer-worker
npm install
```

2. Login once:

```bash
npx wrangler login
```

3. Optional: set a bearer key in `wrangler.toml` (`ANALYZER_KEY`) or with secret commands.

4. Deploy:

```bash
npm run deploy
```

Wrangler prints a public URL similar to:

`https://menuplanner-cloude-analyzer.<subdomain>.workers.dev`

Use this as `VITE_CLOUDE_ANALYZER_URL` in the frontend.

## Frontend Wiring

Set these in root `.env.local`:

```env
VITE_CLOUDE_ANALYZER_URL=https://menuplanner-cloude-analyzer.<subdomain>.workers.dev
VITE_CLOUDE_ANALYZER_KEY=your_optional_bearer_key
```

For GitHub Pages workflow, set repository secrets with the same names.
