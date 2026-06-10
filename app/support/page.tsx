'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Navbar } from '@/components/Navbar';
import { useSolanaAddress } from '@/lib/privy';
import { useToast } from '@/components/Toast';

type Ticket = {
  id: string;
  invoice_id?: string | null;
  category: string;
  status: string;
  subject: string;
  updated_at: string;
};

export default function SupportPage() {
  const search = useSearchParams();
  const invoiceIdFromQuery = search.get('invoiceId') || '';
  const wallet = useSolanaAddress();
  const { getAccessToken } = usePrivy();
  const { toast } = useToast();
  const [invoiceId, setInvoiceId] = useState(invoiceIdFromQuery);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('work_incomplete');
  const [details, setDetails] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const canSubmit = useMemo(() => Boolean(reason && details.trim()), [reason, details]);

  const loadTickets = async () => {
    if (!wallet) return;
    setLoadingTickets(true);
    try {
      const res = await fetch(`/api/support/tickets?wallet=${encodeURIComponent(wallet)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load tickets');
      setTickets(data.tickets ?? []);
    } catch (err: any) {
      toast(err?.message || 'Failed to load tickets', 'error');
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [wallet]);

  const submitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const targetInvoiceId = invoiceId.trim();
      const endpoint = targetInvoiceId
        ? `/api/invoices/${targetInvoiceId}/disputes?debug=1`
        : '/api/support/tickets';
      const body = targetInvoiceId
        ? {
            reason,
            details,
            raisedByWallet: wallet,
            requesterEmail: email || null,
          }
        : {
            invoiceId: null,
            requesterWallet: wallet,
            requesterEmail: email || null,
            subject: `Support request (${reason})`,
            description: details,
            category: reason,
            priority: 'normal',
          };

      const token = await getAccessToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.debug) {
          console.error('Dispute debug response:', data.debug);
        }
        const debugSuffix = data?.debug ? ` | debug: ${JSON.stringify(data.debug)}` : '';
        throw new Error((data?.error || 'Failed to submit support request') + debugSuffix);
      }
      toast('Support request submitted. Our team will investigate.', 'success');
      setDetails('');
      await loadTickets();
    } catch (err: any) {
      toast(err?.message || 'Failed to submit request', 'error');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-text mb-2">Support & Disputes</h1>
        <p className="text-gray-500 mb-8">Raise disputes for escrow/release issues and track support tickets.</p>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Open a dispute or ticket</h2>
            <form onSubmit={submitDispute} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Invoice ID (optional)</label>
                <input
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 5acfbd47-..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Contact email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Issue type</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-field">
                  <option value="work_incomplete">Work incomplete / dissatisfied</option>
                  <option value="payment_stuck">Payment stuck in escrow</option>
                  <option value="released_early">Payment released early</option>
                  <option value="dispute">General dispute</option>
                  <option value="other">Other support issue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Details</label>
                <textarea
                  rows={5}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="input-field resize-y"
                  placeholder="Describe what happened and what resolution you expect..."
                />
              </div>
              <button type="submit" disabled={!canSubmit} className="btn-primary">
                Submit
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-text mb-4">My support tickets</h2>
            {loadingTickets ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-gray-500">No tickets yet.</p>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="text-sm font-semibold text-text">{t.subject}</p>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{t.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">Category: {t.category}</p>
                    {t.invoice_id && <p className="text-xs text-gray-500 break-all">Invoice: {t.invoice_id}</p>}
                    <p className="text-xs text-gray-400 mt-1">Updated: {new Date(t.updated_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
