
# aigarage-chatkit-backend

Minimal Vercel serverless API for Shopify → ChatKit.

## Routes
- `GET /api/chatkit/session` → returns `{ clientToken: "TEST_TOKEN_FOR_UI_SANITY", plan: "free" }`
- `GET /api/health` → returns `{ ok: true }`
