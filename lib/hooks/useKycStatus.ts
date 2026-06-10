'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import type { KycStatus, UserKyc } from '@/lib/supabase/types';

export interface KycStatusState {
  ready: boolean;
  authenticated: boolean;
  loading: boolean;
  status: KycStatus | null;
  allowed: boolean;
  kyc: UserKyc | null;
  walletAddress: string | null;
  error: string | null;
  refetch: () => Promise<void>;
}

const HAS_PRIVY = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

/**
 * Fetches the current user's KYC status from /api/kyc once Privy is ready
 * and the user is authenticated. The user is "allowed" when a row exists
 * with status `pending` or `approved` (self-attested gate).
 */
export function useKycStatus(): KycStatusState {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [loading, setLoading] = useState<boolean>(false);
  const [kyc, setKyc] = useState<UserKyc | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedFor = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!HAS_PRIVY) return;
    if (!ready || !authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/kyc', { headers, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load KYC status');
      setKyc((json?.kyc as UserKyc | null) ?? null);
      setWalletAddress((json?.walletAddress as string | null) ?? null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load KYC status');
      setKyc(null);
    } finally {
      setLoading(false);
    }
  }, [ready, authenticated, getAccessToken]);

  useEffect(() => {
    if (!HAS_PRIVY) return;
    if (!ready) return;
    if (!authenticated) {
      lastFetchedFor.current = null;
      setKyc(null);
      setWalletAddress(null);
      setError(null);
      return;
    }
    const key = `${authenticated}`;
    if (lastFetchedFor.current === key) return;
    lastFetchedFor.current = key;
    void fetchStatus();
  }, [ready, authenticated, fetchStatus]);

  const status = kyc?.status ?? null;
  const allowed = !HAS_PRIVY || (kyc !== null && kyc.status !== 'rejected');

  return {
    ready,
    authenticated,
    loading,
    status,
    allowed,
    kyc,
    walletAddress,
    error,
    refetch: fetchStatus,
  };
}
