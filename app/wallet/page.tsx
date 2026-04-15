'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaAddress } from '@/lib/privy';
import { motion } from 'framer-motion';
import type { Invoice } from '@/lib/supabase/types';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/components/Toast';

const statusConfig: Record<Invoice['status'], { label: string; class: string }> = {
  released: { label: 'Paid', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  funded: { label: 'In Escrow', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  disputed: { label: 'Disputed', class: 'bg-red-50 text-red-700 border-red-200' },
  created: { label: 'Awaiting Payment', class: 'bg-gray-50 text-gray-700 border-gray-200' },
};

function WalletWithPrivy() {
  const { authenticated, ready } = usePrivy();
  const walletAddress = useSolanaAddress();
  const isAuthenticated = authenticated && ready;
  const { toast } = useToast();

  const [balance, setBalance] = useState<{ sol: number; usdc: number } | null>(null);
  const [received, setReceived] = useState<Invoice[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingReceived, setLoadingReceived] = useState(true);

  const loadWalletData = useCallback(async () => {
    if (!walletAddress) {
      setLoadingBalance(false);
      setLoadingReceived(false);
      return;
    }

    try {
      const [balanceRes, invoicesRes] = await Promise.all([
        fetch(`/api/wallet/balance?address=${encodeURIComponent(walletAddress)}`, { cache: 'no-store' }),
        fetch(`/api/wallet/invoices?wallet=${encodeURIComponent(walletAddress)}`, { cache: 'no-store' }),
      ]);
      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance({ sol: data.sol, usdc: data.usdc });
      }
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setReceived(data.invoices ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingBalance(false);
      setLoadingReceived(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await loadWalletData();
      if (cancelled) return;
    };
    run();

    return () => { cancelled = true; };
  }, [loadWalletData]);

  useEffect(() => {
    if (!walletAddress) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadWalletData();
    };
    const handleFocus = () => void loadWalletData();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [walletAddress, loadWalletData]);

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    toast('Wallet address copied!', 'success');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-sm bg-white rounded-3xl border border-gray-100 shadow-lg p-10">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-6 font-medium">Sign in to view your wallet.</p>
            <Link href="/login" className="btn-primary inline-block">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  const totalEarned = received
    .filter((inv) => inv.status === 'released')
    .reduce((sum, inv) => sum + Number(inv.amount_usdc), 0);

  const pendingCount = received.filter((inv) => inv.status === 'funded').length;

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-text mb-1">My Wallet</h1>
          <div className="flex items-center gap-2 mt-3">
            <code className="text-sm text-gray-400 font-mono bg-white border border-gray-100 rounded-lg px-3 py-1.5">
              {walletAddress
                ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-8)}`
                : '—'}
            </code>
            <button
              onClick={copyAddress}
              title="Copy full address"
              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Balance + Summary cards */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'USDC Balance',
              value: loadingBalance ? null : balance != null ? `${Number(balance.usdc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC` : '—',
              icon: '💵',
              accent: 'text-primary',
            },
            {
              label: 'SOL Balance',
              value: loadingBalance ? null : balance != null ? `${balance.sol.toFixed(4)} SOL` : '—',
              icon: '◎',
              accent: 'text-violet-600',
            },
            {
              label: 'Total Earned',
              value: loadingReceived ? null : `${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC`,
              icon: '✅',
              accent: 'text-emerald-600',
            },
            {
              label: 'Pending in Escrow',
              value: loadingReceived ? null : `${pendingCount} invoice${pendingCount !== 1 ? 's' : ''}`,
              icon: '⏳',
              accent: 'text-amber-600',
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <span className="text-xl">{card.icon}</span>
              </div>
              {card.value === null ? (
                <div className="h-8 w-28 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className={`text-xl font-bold ${card.accent}`}>{card.value}</p>
              )}
            </motion.div>
          ))}
        </section>

        {/* Invoice history */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8"
        >
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-text">Invoice History</h2>
              <p className="text-sm text-gray-400 mt-0.5">All invoices linked to your wallet.</p>
            </div>
            <Link
              href="/create"
              className="btn-primary text-sm py-2 px-4"
            >
              + New Invoice
            </Link>
          </div>

          <div className="overflow-x-auto">
            {loadingReceived ? (
              <div className="p-10 flex justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : received.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium mb-1">No invoices yet</p>
                <p className="text-gray-400 text-sm mb-6">Create your first invoice to start accepting payments.</p>
                <Link href="/create" className="btn-primary text-sm py-2.5 px-5 inline-block">
                  Create Invoice
                </Link>
              </div>
            ) : (
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {received.map((inv) => {
                    const cfg = statusConfig[inv.status];
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-text text-sm">
                          {inv.client_name || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 text-primary font-bold text-sm">
                          {Number(inv.amount_usdc).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cfg.class}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {new Date(inv.updated_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/invoice/${inv.id}`}
                            className="text-primary hover:underline text-sm font-medium"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>

        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </div>
    </main>
  );
}

export default function WalletPage() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <main className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-lg w-full text-center rounded-3xl border border-amber-200 bg-amber-50 p-10">
            <h1 className="text-2xl font-bold text-amber-900 mb-2">Privy not configured</h1>
            <p className="text-sm text-amber-800 mb-6">
              Set <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_PRIVY_APP_ID</code> in your environment
              variables and redeploy.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                className="text-blue-700 underline font-medium"
                href="https://dashboard.privy.io/"
                target="_blank"
                rel="noreferrer"
              >
                Get Privy App ID
              </a>
              <Link className="text-slate-700 underline" href="/">
                Back home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <WalletWithPrivy />;
}
