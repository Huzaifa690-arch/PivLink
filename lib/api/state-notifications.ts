import type { InvoiceWorkflowState } from '@/lib/api/invoices';
import { getSupabase } from '@/lib/supabase/client';

export async function sendStateChangeNotification(params: {
  invoiceId: string;
  fromState: InvoiceWorkflowState;
  toState: InvoiceWorkflowState;
}): Promise<void> {
  const webhookUrl = process.env.STATE_CHANGE_WEBHOOK_URL;
  if (!webhookUrl) return;

  const supabase = getSupabase();
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(
      'id, amount_usdc, client_name, freelancer_wallet, status, workflow_state, payment_provider, onramp_destination_tx, onramp_status, onramp_session_id'
    )
    .eq('id', params.invoiceId)
    .single();
  if (error || !invoice) {
    throw new Error(error?.message || 'Invoice not found for state notification');
  }
  const payload = {
    type: 'invoice.state.changed',
    occurredAt: new Date().toISOString(),
    invoice: {
      id: invoice.id,
      amount_usdc: invoice.amount_usdc,
      client_name: invoice.client_name ?? null,
      freelancer_wallet: invoice.freelancer_wallet,
      status: invoice.status,
      workflow_state: invoice.workflow_state,
      payment_provider: (invoice as { payment_provider?: string | null }).payment_provider ?? null,
      onramp_status: (invoice as { onramp_status?: string | null }).onramp_status ?? null,
      onramp_session_id: (invoice as { onramp_session_id?: string | null }).onramp_session_id ?? null,
      onramp_destination_tx: (invoice as { onramp_destination_tx?: string | null }).onramp_destination_tx ?? null,
    },
    transition: {
      from: params.fromState,
      to: params.toState,
    },
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
