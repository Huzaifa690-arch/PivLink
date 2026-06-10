import { isMainnet } from '@/lib/payments/network';

export type PaymentProviderMode = 'stripe' | 'privy' | 'hybrid';

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return raw === 'true' || raw === '1';
}

export function getPaymentProviderMode(): PaymentProviderMode {
  const mode = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || 'hybrid').toLowerCase();
  if (mode === 'stripe' || mode === 'privy' || mode === 'hybrid') return mode;
  return 'hybrid';
}

export function isStripeOnrampEnabled(): boolean {
  if (!envFlag('NEXT_PUBLIC_ENABLE_STRIPE_ONRAMP', true)) return false;
  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return false;
  // Stripe on-ramp targets mainnet USDC in production; allow override for testing.
  if (envFlag('NEXT_PUBLIC_STRIPE_ALLOW_DEVNET', false)) return true;
  return isMainnet();
}

export function isPrivyCardFallbackEnabled(): boolean {
  return envFlag('NEXT_PUBLIC_ENABLE_PRIVY_CARD_FALLBACK', true);
}

export function isBlinkFallbackEnabled(): boolean {
  return envFlag('NEXT_PUBLIC_ENABLE_BLINK_FALLBACK', true);
}

export function getStripeOnrampMaxUsd(): number {
  const raw = Number(process.env.STRIPE_ONRAMP_MAX_USD ?? 250);
  return Number.isFinite(raw) && raw > 0 ? raw : 250;
}

export function getPaymentMethodsForClient() {
  const mode = getPaymentProviderMode();
  const stripeEnabled = isStripeOnrampEnabled();
  const privyEnabled = isPrivyCardFallbackEnabled();
  const blink = isBlinkFallbackEnabled();

  return {
    mode,
    stripe: stripeEnabled && mode !== 'privy',
    privyCard: privyEnabled && mode !== 'stripe',
    blink,
    stripeMaxUsd: getStripeOnrampMaxUsd(),
  };
}
