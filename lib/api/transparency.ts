import { createHash } from 'crypto';
import { getSupabase } from '@/lib/supabase/client';
import type { Invoice } from '@/lib/supabase/types';

interface TransparencyPayload {
  version: number;
  invoice_id: string;
  freelancer_wallet: string;
  client_name: string | null;
  amount_usdc: string;
  payment_tx_signature: string | null;
  release_tx_signature: string | null;
  workflow_state: string | null;
  status: string;
}

function toPayload(invoice: Invoice): TransparencyPayload {
  return {
    version: 1,
    invoice_id: invoice.id,
    freelancer_wallet: invoice.freelancer_wallet,
    client_name: invoice.client_name ?? null,
    amount_usdc: String(invoice.amount_usdc),
    payment_tx_signature: invoice.payment_tx_signature ?? null,
    release_tx_signature: invoice.release_tx_signature ?? null,
    workflow_state: invoice.workflow_state ?? null,
    status: invoice.status,
  };
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export async function refreshInvoiceTransparencySignature(invoice: Invoice): Promise<string> {
  const payload = toPayload(invoice);
  const signature = sha256Hex(JSON.stringify(payload));
  const supabase = getSupabase();

  const { error } = await supabase
    .from('invoices')
    .update({
      transaction_transparency_signature: signature,
      transaction_transparency_payload: payload,
      transaction_transparency_generated_at: new Date().toISOString(),
    })
    .eq('id', invoice.id);

  if (error) {
    throw new Error(`Failed to refresh transaction transparency signature: ${error.message}`);
  }

  return signature;
}
