# Cloudflare Sync Worker

Provides `/api/state` for cross-device app sync.

## Quick Start
1. `cd worker/cloudflare`
2. `npm install -g wrangler`
3. `wrangler login`
4. `wrangler kv namespace create STATE_KV`
5. Put returned namespace id into `wrangler.toml`
6. Optional auth token:
   - `wrangler secret put SYNC_TOKEN`
7. `wrangler deploy`

Use deployed URL in the app profile settings as `Sync endpoint`, including `/api/state`.
