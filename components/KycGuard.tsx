'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useKycStatus } from '@/lib/hooks/useKycStatus';

const ALLOW_LIST_EXACT = new Set<string>([
  '/',
  '/login',
  '/onboarding/kyc',
  '/about',
  '/contact',
  '/support',
  '/privacy',
  '/terms',
  '/security',
]);

const ALLOW_LIST_PREFIXES = [
  '/_next',
  '/api',
  '/onboarding/',
];

function isAllowListed(pathname: string | null): boolean {
  if (!pathname) return true;
  if (ALLOW_LIST_EXACT.has(pathname)) return true;
  return ALLOW_LIST_PREFIXES.some((p) => pathname.startsWith(p));
}

const HAS_PRIVY = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export function KycGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, authenticated, loading, allowed, kyc } = useKycStatus();

  useEffect(() => {
    if (!HAS_PRIVY) return;
    if (!ready || !authenticated) return;
    if (loading) return;
    if (allowed) return;
    if (isAllowListed(pathname)) return;
    router.replace('/onboarding/kyc');
  }, [ready, authenticated, loading, allowed, kyc, pathname, router]);

  return <>{children}</>;
}
