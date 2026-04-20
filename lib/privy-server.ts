/**
 * Server-side Privy JWT verification using JWKS.
 * No Privy server SDK required. Uses your App ID and JWKS URL.
 *
 * Env:
 * - NEXT_PUBLIC_PRIVY_APP_ID (required)
 * - PRIVY_JWKS_URI (optional; default: https://auth.privy.io/api/v1/apps/<APP_ID>/jwks.json)
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const ISSUER = 'privy.io';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const uri =
    process.env.PRIVY_JWKS_URI ||
    (appId ? `https://auth.privy.io/api/v1/apps/${appId}/jwks.json` : null);
  if (!uri) throw new Error('Privy: NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_JWKS_URI required');
  jwks = createRemoteJWKSet(new URL(uri));
  return jwks;
}

export interface VerifiedPrivyClaims {
  userId: string;
  sessionId: string;
  appId: string;
  issuedAt: number;
  expiration: number;
  raw: JWTPayload;
}

/**
 * Verify a Privy access token (Authorization: Bearer <token>).
 * Uses JWKS from https://auth.privy.io/api/v1/apps/<APP_ID>/jwks.json
 */
export async function verifyPrivyAccessToken(accessToken: string): Promise<VerifiedPrivyClaims> {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    throw new Error('Privy: NEXT_PUBLIC_PRIVY_APP_ID is not set');
  }

  const { payload } = await jwtVerify(accessToken, getJwks(), {
    issuer: ISSUER,
    audience: appId,
  });

  const sub = payload.sub;
  const sessionId = (payload as { session_id?: string }).session_id;
  if (!sub || typeof sub !== 'string') {
    throw new Error('Invalid Privy token: missing sub');
  }

  return {
    userId: sub,
    sessionId: typeof sessionId === 'string' ? sessionId : '',
    appId: typeof payload.aud === 'string' ? payload.aud : appId,
    issuedAt: typeof payload.iat === 'number' ? payload.iat : 0,
    expiration: typeof payload.exp === 'number' ? payload.exp : 0,
    raw: payload,
  };
}

/**
 * Get Bearer token from request.
 */
export function getPrivyTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}
