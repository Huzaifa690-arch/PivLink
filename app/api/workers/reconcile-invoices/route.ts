import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { reconcileInvoiceStateSafe } from '@/lib/api/reconciliation';

function isWorkerAuthorized(request: NextRequest): boolean {
  const expected = process.env.WORKER_CRON_SECRET;
  if (!expected) return false;
  const provided = request.headers.get('x-worker-secret') || '';
  return provided === expected;
}

function computeBackoffMs(attemptCount: number): number {
  const base = 30_000;
  const max = 15 * 60_000;
  return Math.min(base * Math.pow(2, Math.max(0, attemptCount - 1)), max);
}

export async function POST(request: NextRequest) {
  if (!isWorkerAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized worker call' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Number(body?.limit ?? 25), 100);
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: pendingOnramp, error: onrampError } = await supabase
    .from('invoices')
    .select('id, workflow_state, reconcile_attempt_count, reconcile_next_retry_at, onramp_status')
    .in('onramp_status', ['processing', 'fulfilled'])
    .eq('workflow_state', 'created')
    .or(`reconcile_next_retry_at.is.null,reconcile_next_retry_at.lte.${now}`)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (onrampError) {
    return NextResponse.json({ error: onrampError.message }, { status: 500 });
  }

  const { data: standardInvoices, error } = await supabase
    .from('invoices')
    .select('id, workflow_state, reconcile_attempt_count, reconcile_next_retry_at, onramp_status')
    .in('workflow_state', ['created', 'funded', 'approvals'])
    .or(`reconcile_next_retry_at.is.null,reconcile_next_retry_at.lte.${now}`)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type ReconcileInvoiceRow = {
    id: string;
    workflow_state: string;
    reconcile_attempt_count: number | null;
    reconcile_next_retry_at: string | null;
    onramp_status: string | null;
  };
  const merged = new Map<string, ReconcileInvoiceRow>();
  for (const inv of [...(pendingOnramp ?? []), ...(standardInvoices ?? [])]) {
    merged.set(inv.id, inv);
  }
  const invoices = Array.from(merged.values()).slice(0, limit);

  const results: Array<Record<string, unknown>> = [];
  for (const inv of invoices ?? []) {
    try {
      if (inv.onramp_status === 'fulfilled' && inv.workflow_state === 'created') {
        const { finalizeInvoiceFunding } = await import('@/lib/payments/finalize-funding');
        await finalizeInvoiceFunding(inv.id);
      }
      const result = await reconcileInvoiceStateSafe(inv.id);
      results.push({ invoiceId: inv.id, ok: true, result });
    } catch (err: any) {
      const currentAttempts = Number(inv.reconcile_attempt_count ?? 0) + 1;
      const delayMs = computeBackoffMs(currentAttempts);
      const nextRetry = new Date(Date.now() + delayMs).toISOString();
      await supabase
        .from('invoices')
        .update({
          reconcile_attempt_count: currentAttempts,
          reconcile_last_error: err?.message || 'Unknown reconcile error',
          reconcile_last_checked_at: new Date().toISOString(),
          reconcile_next_retry_at: nextRetry,
        })
        .eq('id', inv.id);
      results.push({
        invoiceId: inv.id,
        ok: false,
        error: err?.message || 'Unknown reconcile error',
        nextRetryAt: nextRetry,
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
