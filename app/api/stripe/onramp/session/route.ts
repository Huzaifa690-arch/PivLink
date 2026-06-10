import { NextRequest, NextResponse } from 'next/server';
import { requirePrivyRoles } from '@/lib/api/authz';
import { getInvoice, isActiveOnrampStatus, updateInvoiceOnramp } from '@/lib/api/invoices';
import { ensureEscrowInitialized } from '@/lib/payments/ensure-escrow';
import { getStripeOnrampMaxUsd, isStripeOnrampEnabled } from '@/lib/payments/config';
import {
  createOnrampSession,
  getOnrampSession,
  isStripeSessionTerminal,
  mapStripeOnrampStatus,
} from '@/lib/stripe/onramp';
import { logAuditEvent } from '@/lib/api/audit';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || '127.0.0.1';
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(request: NextRequest) {
  if (!isStripeOnrampEnabled()) {
    return NextResponse.json({ error: 'Stripe on-ramp is not enabled for this environment' }, { status: 403 });
  }

  const authz = await requirePrivyRoles(request, ['user', 'admin', 'support']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : '';
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
    }

    const invoice = await getInvoice(invoiceId);
    if (invoice.workflow_state !== 'created' && invoice.status !== 'created') {
      return NextResponse.json({ error: 'Invoice is not awaiting payment' }, { status: 409 });
    }

    const amount = Number(invoice.amount_usdc);
    const maxUsd = getStripeOnrampMaxUsd();
    if (amount > maxUsd) {
      return NextResponse.json(
        { error: `Invoice amount exceeds Stripe on-ramp cap ($${maxUsd})` },
        { status: 400 }
      );
    }

    if (invoice.onramp_session_id && isActiveOnrampStatus(invoice.onramp_status)) {
      try {
        const existing = await getOnrampSession(invoice.onramp_session_id);
        const mapped = mapStripeOnrampStatus(existing.status);
        if (!isStripeSessionTerminal(mapped)) {
          return NextResponse.json({
            sessionId: existing.id,
            clientSecret: existing.client_secret,
            status: mapped,
            reused: true,
          });
        }
      } catch {
        // Create a fresh session if the previous one cannot be retrieved.
      }
    }

    await ensureEscrowInitialized(invoiceId, authz.walletAddress);

    const refreshed = await getInvoice(invoiceId);
    const vaultAddress = refreshed.vault_address;
    if (!vaultAddress || vaultAddress.startsWith('off-chain-')) {
      return NextResponse.json({ error: 'Invoice vault is not configured for on-chain payment' }, { status: 400 });
    }

    const session = await createOnrampSession({
      invoiceId,
      destinationAmountUsdc: amount,
      walletAddress: vaultAddress,
      customerIp: getClientIp(request),
    });

    const mappedStatus = mapStripeOnrampStatus(session.status);
    await updateInvoiceOnramp(invoiceId, {
      payment_provider: 'stripe',
      onramp_provider: 'stripe',
      onramp_session_id: session.id,
      onramp_status: mappedStatus,
      onramp_fiat_amount: amount,
      onramp_fiat_currency: 'usd',
      onramp_error_code: null,
      onramp_error_message: null,
    });

    await logAuditEvent({
      eventType: 'stripe.onramp.session.created',
      invoiceId,
      actorWallet: authz.walletAddress,
      metadata: {
        sessionId: session.id,
        amountUsdc: amount,
        vaultAddress,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      clientSecret: session.client_secret,
      status: mappedStatus,
      reused: false,
    });
  } catch (error: any) {
    console.error('Stripe onramp session error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create Stripe on-ramp session' },
      { status: 500 }
    );
  }
}
