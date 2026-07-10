# Cross-Device Sync + iPhone Offline Setup

This app can now sync across devices using a cloud endpoint and still work offline on iPhone (PWA cache).

## 1) Deploy Cloud Sync API (Cloudflare Worker)

### Prerequisites
- Cloudflare account
- Node.js + npm installed
- Wrangler CLI (`npm install -g wrangler`)

### Steps
1. Open terminal in `worker/cloudflare`
2. Login:
   - `wrangler login`
3. Create KV namespace:
   - `wrangler kv namespace create STATE_KV`
4. Copy returned namespace id and update `wrangler.toml`:
   - Replace `id = "__SET_ME__"`
5. Set a sync token (optional but recommended):
   - `wrangler secret put SYNC_TOKEN`
6. Deploy:
   - `wrangler deploy`
7. Note your worker URL, e.g.:
   - `https://assamese-survival-sync.<subdomain>.workers.dev/api/state`

## 2) Configure Sync in the App

On laptop and iPhone:
1. Open Profile -> Cloud Sync (Cross-Device)
2. Enter:
   - Sync endpoint: your worker `/api/state` URL
   - Sync token: same token (if configured)
3. Click `Save Sync Settings`
4. Click `Test Sync`

## 3) iPhone Offline Usage

After the app opens once on iPhone:
1. In Safari, open your app URL
2. Share -> Add to Home Screen
3. Launch from home screen at least once while online
4. The app shell and content are cached and should load offline

## Notes
- If sync endpoint is unreachable, the app still works locally.
- Each device keeps local data; sync merges by latest shared snapshot from cloud endpoint.
- For best reliability, keep opening the app online occasionally so the service worker can refresh assets.
