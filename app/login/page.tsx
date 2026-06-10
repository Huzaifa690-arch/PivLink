'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/components/Toast';
import { useKycStatus } from '@/lib/hooks/useKycStatus';

export default function LoginPage() {
  const { login, authenticated, ready } = usePrivy();
  const { loading: kycLoading, allowed: kycAllowed } = useKycStatus();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (kycLoading) return;
    router.replace(kycAllowed ? '/' : '/onboarding/kyc');
  }, [ready, authenticated, kycLoading, kycAllowed, router]);

  if (ready && authenticated) return null;

  const handleLogin = async () => {
    try {
      await login();
    } catch (err: any) {
      toast(err.message || 'Failed to sign in. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />

      <Logo href="/" variant="bridge" size="lg" className="relative mb-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-8 md:p-10">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-600 mb-3">Secure sign in</p>
            <h1 className="text-3xl font-bold text-slate-950 mb-2">Access your payment dashboard</h1>
            <p className="text-slate-500">Sign in securely with Privy and manage invoices, wallets, and escrow payments.</p>
          </div>

          <button
            onClick={handleLogin}
            disabled={!ready}
            className="w-full bg-primary text-white py-4 rounded-2xl font-semibold text-base hover:bg-blue-600 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {ready ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Continue with Email
              </>
            ) : (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Loading…
              </>
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative inline-flex justify-center px-4 text-xs text-slate-400 bg-white">
              Wallet and email authentication in one flow
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Secure', sub: 'JWT verified', icon: '🛡️' },
              { label: 'Non-custodial', sub: 'You own keys', icon: '🔑' },
              { label: 'Instant', sub: '~400ms settle', icon: '⚡' },
            ].map((b) => (
              <div key={b.label} className="text-center bg-slate-50 rounded-3xl p-3">
                <span className="text-xl block mb-1">{b.icon}</span>
                <p className="text-xs font-semibold text-slate-900">{b.label}</p>
                <p className="text-[10px] text-slate-400">{b.sub}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 text-sm text-slate-500">
            <p className="leading-6">Connect in seconds with Privy and manage payments with confidence.</p>
            <p className="leading-6">Create invoices, track escrow, and release funds securely from one interface.</p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
