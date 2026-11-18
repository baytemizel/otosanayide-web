# Stub API (local development only)

Synthetic, in-memory stand-in for the Otosanayide REST API so the web can be run in **live** mode on a laptop
without MySQL. It is not the real API and proves nothing about it; shapes follow
`../../../otosanayide-api/docs/openapi.yaml` and `docs/AUTH_API.md`.

```bash
node dev/stub-api/server.mjs
```

Then run the web with `NUXT_PUBLIC_APP_MODE=live NUXT_PUBLIC_API_ORIGIN=http://localhost:4010 npx nuxt dev --port 3001`
(`.claude/launch.json` → `web-live-stub`). Use `localhost` for both, so the refresh cookie is same-site.

Seed member: `deniz@example.com` / `ornek-sifre-123` (test value, stub only). New sign-ups work but start unverified.
Tokens `gecersiz` make `email/verify` and `password/reset` fail. Restarting the stub resets all data.

Route files in `routes/` are grouped by screen area; each one documents what it fakes.
