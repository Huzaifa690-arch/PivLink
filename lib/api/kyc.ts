import { getSupabaseServiceRole } from '@/lib/supabase/client';
import type { UserKyc } from '@/lib/supabase/types';

export type KycGateResult =
  | { ok: true; kyc: UserKyc }
  | { ok: false; status: 403 | 500; error: string };

/**
 * Look up the KYC row for a wallet. Returns null when no submission exists yet.
 */
export async function getUserKyc(walletAddress: string): Promise<UserKyc | null> {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('user_kyc')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load KYC for wallet: ${error.message}`);
  }
  return (data as UserKyc | null) ?? null;
}

/**
 * Server-side gate. Self-attested submission alone unlocks the app, so a row
 * with status `pending` or `approved` passes. `rejected` (or missing) fails.
 */
export async function requireKycSubmitted(
  walletAddress: string | null | undefined
): Promise<KycGateResult> {
  if (!walletAddress) {
    return { ok: false, status: 403, error: 'KYC required: wallet not linked to account' };
  }
  try {
    const kyc = await getUserKyc(walletAddress);
    if (!kyc) {
      return { ok: false, status: 403, error: 'KYC required: please complete identity verification' };
    }
    if (kyc.status === 'rejected') {
      return {
        ok: false,
        status: 403,
        error: kyc.rejection_reason
          ? `KYC rejected: ${kyc.rejection_reason}`
          : 'KYC rejected: please resubmit your identity verification',
      };
    }
    return { ok: true, kyc };
  } catch (err: any) {
    return { ok: false, status: 500, error: err?.message || 'Failed to verify KYC status' };
  }
}
