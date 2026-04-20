'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Navbar } from '@/components/Navbar';

type AdminData = {
  events: Array<any>;
  tickets: Array<any>;
  disputes: Array<any>;
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
          <div className="grid lg:grid-cols-3 gap-6">
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
