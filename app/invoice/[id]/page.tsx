'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getInvoice } from '@/lib/api/invoices';
import type { Invoice } from '@/lib/supabase/types';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/components/Toast';

export default function InvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLink, setPayLink] = useState('');
  const [blinkUrl, setBlinkUrl] = useState('');
  const [lastStatus, setLastStatus] = useState<Invoice['status'] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  useEffect(() => {
    if (!invoice) return;
    if (lastStatus && lastStatus !== invoice.status) {
      toast(`Invoice state updated: ${statusLabel(invoice.status)}`, 'success');
    }
    setLastStatus(invoice.status);
  }, [invoice, lastStatus, toast]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadInvoice(true);
    }, 20000);
    return () => clearInterval(timer);
  }, [invoiceId]);

  useEffect(() => {
    if (invoice) {
      setPayLink(`${window.location.origin}/pay/${invoice.id}`);
      setBlinkUrl(`${window.location.origin}/api/actions/invoice/${invoiceId}`);
    }
  }, [invoice, invoiceId]);

  const loadInvoice = async (silent = false) => {
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      if (!silent) {
        console.error('Error loading invoice:', error);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast(`${label} copied!`, 'success');
    });
  };

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
          <div className="text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-12 max-w-sm">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-text">Invoice Not Found</h1>
            <p className="text-gray-400 text-sm mb-6">The invoice you&apos;re looking for doesn&apos;t exist or was removed.</p>
            <Link href="/" className="btn-primary text-sm py-2.5 inline-block">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (invoice.status === 'released') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-xl w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute w-2 h-3 rounded-sm animate-confetti"
                  style={{
                    left: `${(i * 17) % 100}%`,
                    top: `${-8 - (i % 5) * 8}px`,
                    backgroundColor: i % 3 === 0 ? '#0055FF' : i % 3 === 1 ? '#10B981' : '#F59E0B',
                    animationDelay: `${(i % 8) * 0.12}s`,
                    animationDuration: `${2.6 + (i % 4) * 0.25}s`,
                  }}
                />
              ))}
            </div>

            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-text mb-2">Payment Successful</h1>
            <p className="text-gray-500 text-sm mb-6">
              Funds were released successfully.
            </p>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-8">
              <p className="text-xs text-emerald-700 mb-1">Invoice ID</p>
              <code className="text-xs font-mono text-emerald-800 break-all">{invoice.id}</code>
              <p className="mt-3 text-sm font-semibold text-emerald-800">
                {Number(invoice.amount_usdc).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                href="/wallet"
                className="w-full bg-primary text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-blue-600 transition-colors"
              >
                View Wallet
              </Link>
              <Link
                href="/"
                className="w-full border-2 border-gray-200 text-gray-700 py-3.5 rounded-2xl font-semibold text-sm hover:border-primary hover:text-primary transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    created: { label: 'Awaiting Payment', class: 'bg-gray-100 text-gray-700' },
    funded: { label: 'Funded — In Escrow', class: 'bg-amber-100 text-amber-700' },
    approvals: { label: 'Approvals Complete', class: 'bg-blue-100 text-blue-700' },
    released: { label: 'Released — Paid', class: 'bg-emerald-100 text-emerald-700' },
    disputed: { label: 'Disputed', class: 'bg-red-100 text-red-700' },
  };

  const cfg = statusConfig[invoice.status];
  const showReleaseAction = invoice.status === 'funded' || invoice.status === 'approvals';
  const showPaymentActions = invoice.status === 'created';
  const hasTransparencySignature = Boolean(invoice.transaction_transparency_signature);
  const solanaCluster =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.includes('devnet') ? 'devnet' : 'mainnet';
  const paymentExplorerUrl = invoice.payment_tx_signature
    ? `https://solscan.io/tx/${invoice.payment_tx_signature}?cluster=${solanaCluster}`
    : null;
  const releaseExplorerUrl = invoice.release_tx_signature
    ? `https://solscan.io/tx/${invoice.release_tx_signature}?cluster=${solanaCluster}`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link href="/wallet" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Wallet
          </Link>

          {/* Success header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-6"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-text">{titleForStatus(invoice.status)}</h1>
                </div>
                <p className="text-gray-500 text-sm">Share the pay link below with your client.</p>
              </div>
              <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.class}`}>
                {cfg.label}
              </span>
            </div>

            {/* Invoice details */}
            <div className="space-y-3 bg-gray-50 rounded-2xl p-5 mb-6">
              <Row label="Invoice ID">
                <code className="text-xs font-mono text-gray-500 break-all">{invoice.id}</code>
              </Row>
              <Row label="Amount">
                <span className="text-xl font-bold text-primary">
                  {Number(invoice.amount_usdc).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                </span>
              </Row>
              {invoice.client_name && <Row label="Client"><span className="font-medium text-text">{invoice.client_name}</span></Row>}
              <Row label="Vault Address">
                <code className="text-xs font-mono text-gray-400 break-all">{invoice.vault_address || 'Not initialized'}</code>
              </Row>
            </div>

            {hasTransparencySignature && (
              <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-900">Transaction Transparency Signature</h3>
                    <p className="mt-1 text-xs text-indigo-700">
                      Cryptographic fingerprint for payment/release transaction authenticity.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        invoice.transaction_transparency_signature || '',
                        'Transparency signature'
                      )
                    }
                    className="px-3 py-2 rounded-xl border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors shrink-0"
                  >
                    Copy Signature
                  </button>
                </div>
                <code className="mt-3 block text-[11px] font-mono text-indigo-800 break-all">
                  {invoice.transaction_transparency_signature}
                </code>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {paymentExplorerUrl && (
                    <a
                      href={paymentExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      View payment tx
                    </a>
                  )}
                  {releaseExplorerUrl && (
                    <a
                      href={releaseExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      View release tx
                    </a>
                  )}
                  {invoice.transaction_transparency_generated_at && (
                    <span className="text-[11px] text-indigo-700">
                      Generated: {new Date(invoice.transaction_transparency_generated_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {showPaymentActions && (
              <>
                {/* Pay link */}
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-2">Pay Link</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={payLink}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-white font-mono text-xs text-gray-500 outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(payLink, 'Pay link')}
                      className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">Share this link with your client so they can pay with card or crypto.</p>
                </div>

                {/* Blink URL */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-2">
                    Solana Blink URL
                    <span className="ml-2 text-xs text-gray-400 font-normal">(for wallet-native payment, no browser needed)</span>
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={blinkUrl}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-white font-mono text-xs text-gray-500 outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(blinkUrl, 'Blink URL')}
                      className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">Works in X, Backpack, and other Blink-aware applications.</p>
                </div>
              </>
            )}

            {showReleaseAction && (
              <div className="mt-5 p-4 rounded-2xl border border-blue-200 bg-blue-50 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-800">Funds are in escrow</p>
                  <p className="text-xs text-blue-700 mt-0.5">Continue to release flow for approvals and payout.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/support?invoiceId=${invoice.id}`}
                    className="px-3 py-2 rounded-xl border border-blue-300 text-blue-800 text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Raise Dispute
                  </Link>
                  <Link
                    href={`/release/${invoice.id}`}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                  >
                    Go to Release
                  </Link>
                </div>
              </div>
            )}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex gap-3"
          >
            {showPaymentActions && (
              <Link
                href={payLink || '#'}
                className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all text-center shadow-md shadow-primary/20"
              >
                Open Pay Link →
              </Link>
            )}
            {showReleaseAction && (
              <Link
                href={`/release/${invoice.id}`}
                className="flex-1 border-2 border-primary text-primary py-3.5 rounded-2xl font-semibold text-sm hover:bg-primary/5 transition-all text-center"
              >
                Open Release →
              </Link>
            )}
            <Link
              href="/create"
              className="flex-1 border-2 border-gray-200 text-gray-700 py-3.5 rounded-2xl font-semibold text-sm hover:border-primary hover:text-primary transition-all text-center"
            >
              Create Another
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: Invoice['status']): string {
  switch (status) {
    case 'created': return 'Awaiting Payment';
    case 'funded': return 'Funded — In Escrow';
    case 'approvals': return 'Approvals Complete';
    case 'released': return 'Released — Paid';
    case 'disputed': return 'Disputed';
    default: return status;
  }
}

function titleForStatus(status: Invoice['status']): string {
  switch (status) {
    case 'created': return 'Invoice Created';
    case 'funded': return 'Invoice Funded';
    case 'approvals': return 'Awaiting Release';
    case 'released': return 'Payment Successful';
    case 'disputed': return 'Invoice Disputed';
    default: return 'Invoice';
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 shrink-0 pt-0.5">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
