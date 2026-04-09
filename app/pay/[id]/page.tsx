'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useFundWallet, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { getInvoice } from '@/lib/api/invoices';
import type { Invoice } from '@/lib/supabase/types';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/components/Toast';

export default function PayInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const { authenticated, ready } = usePrivy();
  const { wallets: mainWallets } = useWallets();
  const { wallets: solanaWallets, ready: solanaWalletsReady } = useSolanaWallets();
  const { fundWallet } = useFundWallet();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { toast } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaultAddress, setVaultAddress] = useState('');
  const [fundingWallet, setFundingWallet] = useState<any>(null);
  const [showPayAnyway, setShowPayAnyway] = useState(false);
  const [paymentModalClosed, setPaymentModalClosed] = useState(false);
  const [blinkPayLoading, setBlinkPayLoading] = useState(false);
  const [cardPayLoading, setCardPayLoading] = useState(false);
  const [blinkUrl, setBlinkUrl] = useState('');

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login');
      return;
    }
    loadInvoice();
  }, [invoiceId, ready, authenticated, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBlinkUrl(`${window.location.origin}/api/actions/invoice/${invoiceId}`);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!invoice || !vaultAddress) return;
    if (solanaWalletsReady && solanaWallets?.length > 0) {
      setFundingWallet(solanaWallets[0]);
      return;
    }
    const solanaFromMain = mainWallets.find((w: { type?: string; chainId?: string; walletClientType?: string }) => {
      if ((w as { type?: string }).type === 'solana') return true;
      const wt = w.walletClientType ?? '';
      if (wt !== 'privy' && wt !== 'privy-v2') return false;
      return (w.chainId ?? '').toLowerCase().startsWith('solana:');
    });
    if (solanaFromMain) setFundingWallet(solanaFromMain);
  }, [invoice, vaultAddress, solanaWalletsReady, solanaWallets, mainWallets]);

  useEffect(() => {
    if (!invoice || loading) return;
    const t = setTimeout(() => setShowPayAnyway(true), 3000);
    return () => clearTimeout(t);
  }, [invoice, loading]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data);
      setVaultAddress(data.vault_address || '');
    } catch {
      toast('Failed to load invoice.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFundWithCard = async () => {
    const walletAddress = fundingWallet?.address;
    if (!walletAddress) {
      toast('Wallet is still loading. Please refresh and try again.', 'warning');
      return;
    }
    if (!invoice) return;
    setCardPayLoading(true);
    try {
      await fundWallet({
        address: walletAddress,
        options: {
          amount: String(invoice.amount_usdc),
          asset: 'USDC',
          cluster: { name: process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' ? 'mainnet-beta' : 'devnet' },
          defaultFundingMethod: 'card',
        } as any,
      });
      setPaymentModalClosed(true);
    } catch (error: any) {
      console.error('Error opening funding modal:', error);
      toast('Could not open payment window. Please try again.', 'error');
    } finally {
      setCardPayLoading(false);
    }
  };

  const copyBlinkUrl = () => {
    if (!blinkUrl) return;
    navigator.clipboard.writeText(blinkUrl);
    toast('Blink URL copied!', 'success');
  };

  const handlePayWithBlink = async () => {
    const wallet = fundingWallet ?? solanaWallets?.[0];
    const walletAddress = wallet?.address;
    if (!wallet || !walletAddress) {
      toast('Connect or use your Solana wallet first.', 'warning');
      return;
    }
    if (!invoice) return;
    setBlinkPayLoading(true);
    try {
      const res = await fetch(`/api/actions/invoice/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: walletAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to build payment');

      const txBase64 = data?.transaction;
      if (!txBase64 || typeof txBase64 !== 'string') throw new Error('No transaction in response');

      const binary = atob(txBase64);
      const txBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) txBytes[i] = binary.charCodeAt(i);

      const txResult = await signAndSendTransaction({ transaction: txBytes, wallet, chain: 'solana:devnet' });
      
      const transactionSignature =
        typeof txResult === 'string' ? txResult :
        txResult instanceof Uint8Array ? bs58.encode(txResult) :
        txResult?.signature instanceof Uint8Array ? bs58.encode(txResult.signature) :
        typeof txResult?.signature === 'string' ? txResult.signature :
        undefined;

      if (transactionSignature) {
        try {
          await fetch(`/api/invoices/${invoiceId}/record-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction_signature: transactionSignature }),
          });
        } catch (recordError) {
          console.warn('Failed to record payment signature:', recordError);
        }
      } else {
        console.warn('Could not determine transaction signature from signAndSendTransaction result:', txResult);
      }

      setPaymentModalClosed(true);

      try {
        await fetch(`/api/invoices/${invoiceId}/check-funding`);
      } catch (checkError) {
        console.warn('Funding verification failed:', checkError);
      }

      toast('Payment sent!', 'success');
      router.push(`/pay/${invoiceId}/success`);
    } catch (err: any) {
      console.error('Blink pay error:', err);
      toast(err instanceof Error ? err.message : 'Payment failed. Ensure you have enough USDC.', 'error');
    } finally {
      setBlinkPayLoading(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Loading invoice…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center bg-white rounded-3xl border shadow-sm p-12 max-w-sm">
            <h1 className="text-2xl font-bold mb-2">Invoice Not Found</h1>
            <p className="text-gray-400 text-sm mb-6">This invoice doesn&apos;t exist or has been removed.</p>
            <Link href="/" className="btn-primary text-sm py-2.5 inline-block">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    created: { label: 'Awaiting Payment', class: 'bg-gray-100 text-gray-700' },
    funded: { label: 'Funded — In Escrow', class: 'bg-amber-100 text-amber-700' },
    released: { label: 'Released — Paid', class: 'bg-emerald-100 text-emerald-700' },
    disputed: { label: 'Disputed', class: 'bg-red-100 text-red-700' },
  };

  const cfg = statusConfig[invoice.status];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto w-full px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Invoice details */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7"
          >
            <h1 className="text-2xl font-bold text-text mb-6">Invoice Details</h1>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Amount</p>
                <p className="text-4xl font-bold text-primary">
                  {Number(invoice.amount_usdc).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-lg font-semibold text-gray-400 ml-2">USDC</span>
                </p>
              </div>
              {invoice.client_name && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Client</p>
                  <p className="font-semibold text-text">{invoice.client_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Status</p>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.class}`}>
                  {cfg.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Vault Address</p>
                <code className="text-xs font-mono text-gray-400 break-all leading-relaxed">{vaultAddress || '—'}</code>
              </div>
            </div>

            {/* Blink URL */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Solana Blink URL</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={blinkUrl}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 font-mono text-xs text-gray-400 outline-none"
                />
                <button
                  onClick={copyBlinkUrl}
                  className="px-3 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </motion.div>

          {/* Payment section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7"
          >
            <h2 className="text-2xl font-bold text-text mb-2">Complete Payment</h2>

            {paymentModalClosed ? (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-amber-800 font-semibold text-sm">Payment window closed</p>
                <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                  If you completed the purchase, USDC may take a few minutes to arrive. If you closed without paying, click &quot;Pay with Card&quot; again to retry.
                </p>
                <Link href={`/pay/${invoiceId}/success`} className="inline-block mt-3 text-primary font-medium text-xs hover:underline">
                  I completed payment → View next steps
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Pay with your credit or debit card. Funds will be converted to USDC and held securely in escrow until work is verified.
              </p>
            )}

            {fundingWallet || showPayAnyway ? (
              <div className="space-y-3">
                <button
                  onClick={handleFundWithCard}
                  disabled={cardPayLoading}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {cardPayLoading ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Processing…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> Pay with Card</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePayWithBlink}
                  disabled={blinkPayLoading || !fundingWallet}
                  className="w-full border-2 border-primary text-primary py-4 rounded-2xl font-semibold hover:bg-primary/5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {blinkPayLoading ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" /> Preparing…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Pay with USDC (Blink)</>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm font-medium">Preparing payment…</p>
                <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
              </div>
            )}

            <p className="mt-5 text-xs text-gray-400 text-center leading-relaxed">
              Payment powered by Privy (MoonPay). Your card will be charged in USD and converted to USDC on Solana.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
