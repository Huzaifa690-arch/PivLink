import { getSupabase } from '@/lib/supabase/client';

export async function logAuditEvent(params: {
  eventType: string;
  invoiceId?: string | null;
  ticketId?: string | null;
  disputeId?: string | null;
  actor?: string | null;
  actorWallet?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('activity_audit_events').insert({
    event_type: params.eventType,
    invoice_id: params.invoiceId ?? null,
    ticket_id: params.ticketId ?? null,
    dispute_id: params.disputeId ?? null,
    actor: params.actor ?? null,
    actor_wallet: params.actorWallet ?? null,
    metadata: params.metadata ?? {},
  });
  if (error) {
    throw new Error(`Failed to log audit event: ${error.message}`);
  }
}
