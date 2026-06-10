import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getInvoice,
  getInvoiceByOnrampSession,
  recordStripeOnrampEvent,
  updateInvoiceOnramp,
} from '@/lib/api/invoices';
import { finalizeInvoiceFunding } from '@/lib/payments/finalize-funding';
import { mapStripeOnrampStatus } from '@/lib/stripe/onramp';
import { logAuditEvent } from '@/lib/api/audit';

export const runtime = 'nodejs';

function getStripeWebhook(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secret);
}

async function processOnrampSessionObject(session: Record<string, unknown>, eventType: string) {
  const sessionId = typeof session.id === 'string' ? session.id : null;
  if (!sessionId) return;

  let invoice = await getInvoiceByOnrampSession(sessionId);
  if (!invoice) {
    const metadata = session.metadata as Record<string, string> | undefined;
    const invoiceId = metadata?.invoice_id;
    if (invoiceId) {
      try {
        invoice = await getInvoice(invoiceId);
      } catch {
        invoice = null;
      }
    }
  }

  const mappedStatus = mapStripeOnrampStatus(String(session.status ?? 'created'));
  const transactionId =
    typeof session.transaction_id === 'string'
      ? session.transaction_id
      : typeof session.destination_transaction_hash === 'string'
        ? session.destination_transaction_hash
        : null;

  if (invoice) {
    await updateInvoiceOnramp(invoice.id, {
      onramp_status: mappedStatus,
      onramp_destination_tx: transactionId,
      ...(transactionId ? { payment_tx_signature: transactionId } : {}),
      payment_tx_timestamp: transactionId ? new Date().toISOString() : invoice.payment_tx_timestamp,
      onramp_error_code:
        typeof (session.last_error as { code?: string } | undefined)?.code === 'string'
          ? (session.last_error as { code: string }).code
          : null,
      onramp_error_message:
        typeof (session.last_error as { message?: string } | undefined)?.message === 'string'
          ? (session.last_error as { message: string }).message
          : null,
    });

    if (mappedStatus === 'fulfilled') {
      try {
        await finalizeInvoiceFunding(invoice.id);
      } catch (err) {
        console.warn('Finalize funding from Stripe webhook failed:', err);
      }
    }

    await logAuditEvent({
      eventType: `stripe.webhook.${eventType}`,
      invoiceId: invoice.id,
      metadata: {
        sessionId,
        status: mappedStatus,
        transactionId,
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeWebhook();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const sessionId =
    typeof (event.data.object as { id?: string }).id === 'string'
      ? (event.data.object as { id: string }).id
      : null;

  const inserted = await recordStripeOnrampEvent({
    eventId: event.id,
    sessionId,
    eventType: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
  });

  if (!inserted) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type.startsWith('crypto.onramp_session.')) {
    await processOnrampSessionObject(event.data.object as unknown as Record<string, unknown>, event.type);
  }

  return NextResponse.json({ received: true });
}
