import { NextRequest, NextResponse } from 'next/server';
import { requirePrivyRoles } from '@/lib/api/authz';
import {
  getInvoiceByOnrampSession,
  updateInvoiceOnramp,
} from '@/lib/api/invoices';
import { finalizeInvoiceFunding } from '@/lib/payments/finalize-funding';
import {
  getOnrampSession,
  isStripeSessionTerminal,
  mapStripeOnrampStatus,
} from '@/lib/stripe/onramp';

async function syncSessionToInvoice(sessionId: string) {
  const session = await getOnrampSession(sessionId);
  const mappedStatus = mapStripeOnrampStatus(session.status);
  const invoice = await getInvoiceByOnrampSession(sessionId);

  if (invoice) {
    const updates: Parameters<typeof updateInvoiceOnramp>[1] = {
      onramp_status: mappedStatus,
    };

    if (session.transaction_id) {
      updates.onramp_destination_tx = session.transaction_id;
      updates.payment_tx_signature = session.transaction_id;
      updates.payment_tx_timestamp = new Date().toISOString();
    }

    if (session.last_error?.code) updates.onramp_error_code = session.last_error.code;
    if (session.last_error?.message) updates.onramp_error_message = session.last_error.message;

    await updateInvoiceOnramp(invoice.id, updates);

    if (mappedStatus === 'fulfilled') {
      try {
        await finalizeInvoiceFunding(invoice.id);
      } catch (err) {
        console.warn('Finalize funding after onramp poll failed:', err);
      }
    }
  }

  return {
    sessionId: session.id,
    status: mappedStatus,
    stripeStatus: session.status,
    transactionId: session.transaction_id ?? null,
    terminal: isStripeSessionTerminal(mappedStatus),
    invoiceId: invoice?.id ?? null,
    workflowState: invoice?.workflow_state ?? null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authz = await requirePrivyRoles(request, ['user', 'admin', 'support']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const payload = await syncSessionToInvoice(params.sessionId);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Stripe onramp status error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch on-ramp session status' },
      { status: 500 }
    );
  }
}
