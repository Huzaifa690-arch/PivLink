import type { OnrampStatus } from '@/lib/supabase/types';
import { getStripeDestinationNetwork } from '@/lib/payments/network';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

export interface StripeOnrampSession {
  id: string;
  object: string;
  client_secret: string;
  status: string;
  destination_amount?: string | null;
  destination_currency?: string | null;
  destination_network?: string | null;
  transaction_id?: string | null;
  last_error?: { code?: string; message?: string } | null;
  metadata?: Record<string, string>;
}

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return key;
}

function getStripeApiVersion(): string {
  return process.env.STRIPE_CRYPTO_ONRAMP_VERSION || '2026-01-28.clover';
}

async function stripeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getStripeSecretKey()}`,
    'Stripe-Version': getStripeApiVersion(),
  };

  let url = `${STRIPE_API_BASE}${path}`;
  let body: string | undefined;

  if (method === 'GET' && params) {
    const qs = new URLSearchParams(params);
    url += `?${qs.toString()}`;
  } else if (method === 'POST' && params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(params).toString();
  }

  const response = await fetch(url, { method, headers, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message ||
      `Stripe API error (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function mapStripeOnrampStatus(stripeStatus: string): OnrampStatus {
  const normalized = stripeStatus.toLowerCase();
  if (normalized === 'fulfillment_complete' || normalized === 'complete' || normalized === 'fulfilled') {
    return 'fulfilled';
  }
  if (normalized === 'expired') return 'expired';
  if (normalized === 'failed' || normalized === 'rejected') return 'failed';
  if (
    normalized === 'processing' ||
    normalized === 'fulfillment_processing' ||
    normalized === 'pending'
  ) {
    return 'processing';
  }
  if (
    normalized === 'requires_payment_method' ||
    normalized === 'requires_confirmation' ||
    normalized === 'requires_action'
  ) {
    return 'requires_action';
  }
  return 'created';
}

export function isStripeSessionTerminal(status: OnrampStatus): boolean {
  return status === 'fulfilled' || status === 'failed' || status === 'expired';
}

export async function createOnrampSession(params: {
  invoiceId: string;
  destinationAmountUsdc: number;
  walletAddress: string;
  customerIp: string;
}): Promise<StripeOnrampSession> {
  const network = getStripeDestinationNetwork();
  const amount = Number(params.destinationAmountUsdc).toFixed(2);

  return stripeRequest<StripeOnrampSession>('POST', '/crypto/onramp_sessions', {
    destination_currency: 'usdc',
    destination_network: network,
    destination_amount: amount,
    [`wallet_addresses[${network}]`]: params.walletAddress,
    lock_wallet_address: 'true',
    customer_ip_address: params.customerIp,
    'metadata[invoice_id]': params.invoiceId,
  });
}

export async function getOnrampSession(sessionId: string): Promise<StripeOnrampSession> {
  return stripeRequest<StripeOnrampSession>('GET', `/crypto/onramp_sessions/${sessionId}`);
}

export function getPublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured');
  return key;
}

export function verifyStripeConfigured(): { ok: boolean; message: string } {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, message: 'STRIPE_SECRET_KEY missing' };
  }
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return { ok: false, message: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing' };
  }
  return { ok: true, message: 'Stripe keys configured' };
}
