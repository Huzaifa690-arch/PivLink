import { NextRequest } from 'next/server';
import { getPrivyTokenFromRequest, verifyPrivyAccessToken } from '@/lib/privy-server';

export type AppRole = 'admin' | 'support' | 'user';

function normalizeRoles(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).toLowerCase());
  return [String(raw).toLowerCase()];
}

function extractRolesFromClaims(claims: Record<string, unknown>): string[] {
  const direct = normalizeRoles(claims.roles).concat(normalizeRoles(claims.role));
  const appMeta = claims.app_metadata as Record<string, unknown> | undefined;
  const customMeta = claims.custom_metadata as Record<string, unknown> | undefined;
  const nested = [
    ...normalizeRoles(appMeta?.roles),
    ...normalizeRoles(appMeta?.role),
    ...normalizeRoles(customMeta?.roles),
    ...normalizeRoles(customMeta?.role),
  ];
  return [...new Set([...direct, ...nested])];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function extractWalletFromLinkedAccount(account: Record<string, unknown>): string | null {
  const chainType = asString(account.chain_type) || asString(account.chainType);
  const walletClientType = asString(account.wallet_client_type) || asString(account.walletClientType);
  const address =
    asString(account.address) ||
    asString(account.wallet_address) ||
    asString(account.walletAddress) ||
    asString(account.public_key) ||
    asString(account.publicKey);

  const looksSolana =
    chainType?.toLowerCase() === 'solana' ||
    walletClientType?.toLowerCase().includes('solana') ||
    asString(account.chain_id)?.toLowerCase().includes('solana') ||
    asString(account.chainId)?.toLowerCase().includes('solana');

  return looksSolana ? address : null;
}

function extractAuthenticatedSolanaWallet(claims: Record<string, unknown>): string | null {
  const direct =
    asString(claims.wallet_address) ||
    asString(claims.walletAddress) ||
    asString(claims.solana_wallet) ||
    asString(claims.solanaWallet);
  if (direct) return direct;

  const linkedAccounts = claims.linked_accounts;
  if (Array.isArray(linkedAccounts)) {
    for (const account of linkedAccounts) {
      const accountRecord = asRecord(account);
      if (!accountRecord) continue;
      const wallet = extractWalletFromLinkedAccount(accountRecord);
      if (wallet) return wallet;
    }
  }

  const user = asRecord(claims.user);
  const userLinked = user?.linked_accounts;
  if (Array.isArray(userLinked)) {
    for (const account of userLinked) {
      const accountRecord = asRecord(account);
      if (!accountRecord) continue;
      const wallet = extractWalletFromLinkedAccount(accountRecord);
      if (wallet) return wallet;
    }
  }

  return null;
}

export function walletsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim() === b.trim();
}

export async function requirePrivyRoles(
  request: NextRequest,
  allowedRoles: AppRole[]
): Promise<
  | { ok: true; userId: string; roles: string[]; walletAddress: string | null }
  | { ok: false; status: number; error: string }
> {
  const token = getPrivyTokenFromRequest(request);
  if (!token) return { ok: false, status: 401, error: 'Authorization required' };

  try {
    const claims = await verifyPrivyAccessToken(token);
    const rawClaims = (claims.raw ?? {}) as Record<string, unknown>;
    const roles = extractRolesFromClaims(rawClaims);
    const walletAddress = extractAuthenticatedSolanaWallet(rawClaims);
    const allowed = allowedRoles.map((r) => r.toLowerCase());
    if (allowed.includes('user') && roles.length === 0) {
      // Default authenticated users to `user` when no explicit role claims are present.
      return { ok: true, userId: claims.userId, roles: ['user'], walletAddress };
    }
    const isAllowed = roles.some((r) => allowed.includes(r));
    if (!isAllowed) {
      return { ok: false, status: 403, error: 'Insufficient role permissions' };
    }
    return { ok: true, userId: claims.userId, roles, walletAddress };
  } catch {
    return { ok: false, status: 401, error: 'Invalid or expired session' };
  }
}
