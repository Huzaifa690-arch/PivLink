'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Navbar } from '@/components/Navbar';

type KycRow = {
  wallet_address: string;
  full_name: string;
  date_of_birth: string;
  country: string;
  id_type: string;
  id_number: string;
  id_document_path?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
};

type OnrampInvoiceRow = {
  id: string;
  amount_usdc: number;
  status: string;
  workflow_state: string;
  payment_provider?: string | null;
  onramp_session_id?: string | null;
  onramp_status?: string | null;
  onramp_destination_tx?: string | null;
  onramp_error_message?: string | null;
  reconcile_last_error?: string | null;
  reconcile_attempt_count?: number | null;
  funded_at?: string | null;
  updated_at: string;
};

type AdminData = {
  events: Array<any>;
  tickets: Array<any>;
  disputes: Array<any>;
  kyc: Array<KycRow>;
  onrampInvoices: Array<OnrampInvoiceRow>;
  onrampEvents: Array<any>;
};

export default function AdminPage() {
  const { getAccessToken } = usePrivy();
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminData | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = { 'x-admin-secret': secret };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/admin/activity', {
        headers,
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load admin activity');
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const reviewKyc = async (wallet: string, action: 'approve' | 'reject') => {
    let reason: string | null = null;
    if (action === 'reject') {
      reason = window.prompt('Rejection reason (visible to the user):') || '';
      if (!reason.trim()) return;
    }
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'x-admin-secret': secret,
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/admin/kyc/${encodeURIComponent(wallet)}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, reason: reason ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update KYC');
      await loadAdminData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update KYC');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-text mb-2">Admin Activity Panel</h1>
        <p className="text-gray-500 mb-6">Track disputes, tickets, and audit events.</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <label className="block text-sm text-gray-600 mb-2">Admin secret</label>
          <div className="flex gap-3">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="input-field"
              placeholder="Enter ADMIN_PANEL_SECRET"
            />
            <button onClick={loadAdminData} className="btn-primary" disabled={!secret || loading}>
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        {data && (
          <>
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <Panel title={`Tickets (${data.tickets.length})`}>
                {data.tickets.map((t) => (
                  <div key={t.id} className="border border-gray-100 rounded-lg p-3 mb-2">
                    <p className="text-sm font-semibold">{t.subject}</p>
                    <p className="text-xs text-gray-500">{t.status} • {t.category}</p>
                    {t.invoice_id && <p className="text-xs text-gray-500 break-all">{t.invoice_id}</p>}
                  </div>
                ))}
              </Panel>
              <Panel title={`Disputes (${data.disputes.length})`}>
                {data.disputes.map((d) => (
                  <div key={d.id} className="border border-gray-100 rounded-lg p-3 mb-2">
                    <p className="text-sm font-semibold">{d.reason}</p>
                    <p className="text-xs text-gray-500">{d.status}</p>
                    <p className="text-xs text-gray-500 break-all">{d.invoice_id}</p>
                  </div>
                ))}
              </Panel>
              <Panel title={`Audit Events (${data.events.length})`}>
                {data.events.map((e) => (
                  <div key={e.id} className="border border-gray-100 rounded-lg p-3 mb-2">
                    <p className="text-sm font-semibold">{e.event_type}</p>
                    <p className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</p>
                    {e.invoice_id && <p className="text-xs text-gray-500 break-all">{e.invoice_id}</p>}
                  </div>
                ))}
              </Panel>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Panel title={`Stripe Onramp Invoices (${data.onrampInvoices?.length ?? 0})`}>
                {(data.onrampInvoices ?? []).map((inv) => (
                  <div key={inv.id} className="border border-gray-100 rounded-lg p-3 mb-2">
                    <p className="text-sm font-semibold break-all">{inv.id}</p>
                    <p className="text-xs text-gray-500">
                      {inv.onramp_status ?? 'unknown'} • {inv.workflow_state} • {inv.payment_provider ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${Number(inv.amount_usdc).toFixed(2)} USDC
                      {inv.funded_at ? ` • funded ${new Date(inv.funded_at).toLocaleString()}` : ''}
                    </p>
                    {inv.onramp_session_id && (
                      <p className="text-xs text-gray-400 break-all">session: {inv.onramp_session_id}</p>
                    )}
                    {inv.onramp_destination_tx && (
                      <p className="text-xs text-gray-400 break-all">tx: {inv.onramp_destination_tx}</p>
                    )}
                    {inv.onramp_error_message && (
                      <p className="text-xs text-red-500 mt-1">{inv.onramp_error_message}</p>
                    )}
                    {inv.reconcile_last_error && (
                      <p className="text-xs text-amber-600 mt-1">reconcile: {inv.reconcile_last_error}</p>
                    )}
                  </div>
                ))}
              </Panel>
              <Panel title={`Stripe Webhook Events (${data.onrampEvents?.length ?? 0})`}>
                {(data.onrampEvents ?? []).map((ev) => (
                  <div key={ev.event_id} className="border border-gray-100 rounded-lg p-3 mb-2">
                    <p className="text-sm font-semibold">{ev.event_type}</p>
                    <p className="text-xs text-gray-500">{new Date(ev.received_at).toLocaleString()}</p>
                    {ev.invoice_id && <p className="text-xs text-gray-400 break-all">{ev.invoice_id}</p>}
                    {ev.session_id && <p className="text-xs text-gray-400 break-all">session: {ev.session_id}</p>}
                  </div>
                ))}
              </Panel>
            </div>

            <Panel title={`KYC Submissions (${data.kyc?.length ?? 0})`}>
              {(data.kyc ?? []).map((k) => (
                <div key={k.wallet_address} className="border border-gray-100 rounded-lg p-3 mb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {k.full_name}{' '}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          k.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : k.status === 'rejected'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {k.status}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {k.country} • {k.id_type} • DOB {k.date_of_birth?.slice(0, 10)}
                      </p>
                      <p className="text-xs text-gray-400 break-all">{k.wallet_address}</p>
                      {k.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">Reason: {k.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => reviewKyc(k.wallet_address, 'approve')}
                        className="text-xs px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        disabled={k.status === 'approved'}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reviewKyc(k.wallet_address, 'reject')}
                        className="text-xs px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                        disabled={k.status === 'rejected'}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </Panel>
          </>
        )}
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-4">
      <h2 className="text-lg font-semibold text-text mb-3">{title}</h2>
      <div className="max-h-[480px] overflow-auto">{children}</div>
    </section>
  );
}
