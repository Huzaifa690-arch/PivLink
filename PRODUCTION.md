# PivLink – Production readiness (Privy)

Use this checklist to make the app production-ready with Privy.

---

## 1. Privy Dashboard – What you need

You already have:

- **App ID**: `cmltsm587001y0cky9igylrz6`
- **JWKS URL**: `https://auth.privy.io/api/v1/apps/cmltsm587001y0cky9igylrz6/jwks.json`  
  (Used by Privy SDK for JWT verification; no need to set it in `.env` unless you use custom verification.)

From the [Privy Dashboard](https://dashboard.privy.io/), ensure you have and configure the following.

### Required from Dashboard

| Item | Where in Dashboard | Purpose |
|------|--------------------|--------|
| **App ID** | Already set in app | Used for client SDK and for server-side JWT verification (via JWKS). |
| **JWKS URL** | `https://auth.privy.io/api/v1/apps/<APP_ID>/jwks.json` | Used by the server to verify access tokens (no App Secret needed). You can override with `PRIVY_JWKS_URI` in `.env` if needed. |
| **App secret** (optional) | **App settings** | Only needed if you use Privy’s server API for other features (e.g. user lookup). Not required for token verification; we use JWKS. |

### Configuration in Dashboard

- **Login methods**  
  Enable the methods you want (e.g. **Email**, **Wallet**).  
  Path: **Login methods** (or **Authentication**).

- **Embedded wallets**  
  Enable **Solana** and set **Create on login** (e.g. “All users” or as needed).  
  Path: **Wallets** → **Embedded wallets**.

- **Allowed origins (production)**  
  Add your production domain(s), e.g. `https://yourdomain.com` and `https://www.yourdomain.com`.  
  Path: **Settings** or **App settings** → **Allowed origins** / **Domains**.  
  Keep `http://localhost:3000` for local dev.

- **RPC / chain settings**  
  Ensure **Solana** is enabled and the correct **network** (mainnet/devnet) and RPC URLs are set if you override them in the app.

- **Stripe Crypto Onramp (primary card rail on mainnet)**
  Configure `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and register webhook `POST /api/stripe/webhooks/onramp` for `crypto.onramp_session.*` events. Set `NEXT_PUBLIC_SOLANA_NETWORK=mainnet` and `NEXT_PUBLIC_ENABLE_STRIPE_ONRAMP=true`. Use `STRIPE_ONRAMP_MAX_USD` for staged rollout caps.

- **Funding / payments (Privy fallback)**
  Configure **Funding** (e.g. MoonPay) in Privy if `NEXT_PUBLIC_ENABLE_PRIVY_CARD_FALLBACK=true`.

---

## 2. Environment variables (production)

In production, set at least:

```bash
# Privy (required for auth and server-side token verification via JWKS)
NEXT_PUBLIC_PRIVY_APP_ID=cmltsm587001y0cky9igylrz6

# Optional: override JWKS URL (default: https://auth.privy.io/api/v1/apps/<APP_ID>/jwks.json)
# PRIVY_JWKS_URI=https://auth.privy.io/api/v1/apps/cmltsm587001y0cky9igylrz6/jwks.json
```

- **App ID**: required; used by the client and by the server to verify JWTs via the public JWKS endpoint.  
- **JWKS URI**: optional; the app derives it from the App ID if not set.  
- **App secret**: not required for token verification (we use JWKS). Only add `PRIVY_APP_SECRET` if you use Privy’s server API for other features.

Also set all other production env vars (Supabase, Solana RPC, program ID, etc.) as in your normal production setup.

---

## 3. Sending the access token from the frontend

For any API route that should be authenticated (e.g. create invoice), the frontend must send the Privy access token.

Example with `fetch`:

```ts
const { getAccessToken } = usePrivy();
const token = await getAccessToken();
await fetch('/api/invoices/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ ... }),
});
```

The server can then use `verifyPrivyAccessToken` from `lib/privy-server.ts` to verify the token and get `userId` (Privy DID).

---

## 4. Optional: Enforce auth on API routes

To make invoice creation (or other routes) production-ready:

1. Read `Authorization: Bearer <token>` (or use `getPrivyTokenFromRequest(request)` from `lib/privy-server.ts`).
2. Call `verifyPrivyAccessToken(token)`.
3. Optionally check that the wallet in the request body belongs to `verifiedClaims.userId` (e.g. by calling Privy’s API to resolve the user’s wallets).

If you skip this, anyone who knows the API can send a fake `freelancerWallet`. So for production, either enforce Privy token verification or another trusted auth mechanism.

---

## 5. Summary – What to provide from the Dashboard

- **App secret** → `PRIVY_APP_SECRET` in `.env` (required for server-side verification).  
- **Allowed origins** → Add production domain(s).  
- **Login methods** → Email (and any others you want).  
- **Embedded wallets** → Solana, create on login.  
- **Funding/Payments** → If you use Privy for card payments, configure the onramp/funding providers and any payment settings.

You do **not** need to paste the JWKS URL into the app unless you implement custom JWT verification; the Privy SDK uses it internally.

With **App ID** set, the app already enforces token verification on the create-invoice API. No App Secret is required for that.
