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
    .select('id, amount_usdc, client_name, freelancer_wallet, status, workflow_state')
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
