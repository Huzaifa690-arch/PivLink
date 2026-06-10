/**
 * Smoke-check Stripe on-ramp configuration and payment feature flags.
 * Usage: node scripts/verify-stripe-rollout.mjs
 */
const checks = [];

function record(name, ok, message) {
  checks.push({ name, ok, message });
}

const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet').toLowerCase();
const stripeEnabled = process.env.NEXT_PUBLIC_ENABLE_STRIPE_ONRAMP === 'true';
const allowDevnet = process.env.NEXT_PUBLIC_STRIPE_ALLOW_DEVNET === 'true';
const hasStripeKeys =
  Boolean(process.env.STRIPE_SECRET_KEY) &&
  Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

record(
  'mainnet stripe path',
  network === 'mainnet' ? hasStripeKeys : true,
  network === 'mainnet'
    ? hasStripeKeys
      ? 'Mainnet with Stripe keys configured'
      : 'Mainnet requires STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
    : 'Devnet mode (Stripe optional)'
);

record(
  'devnet fallback rails',
  network === 'devnet'
    ? process.env.NEXT_PUBLIC_ENABLE_BLINK_FALLBACK !== 'false'
    : true,
  network === 'devnet'
    ? 'Blink fallback should remain enabled on devnet'
    : 'Not applicable on mainnet'
);

record(
  'stripe enabled policy',
  stripeEnabled ? network === 'mainnet' || allowDevnet : true,
  stripeEnabled
    ? network === 'mainnet' || allowDevnet
      ? 'Stripe flag enabled for this network'
      : 'Stripe enabled but blocked on devnet (set NEXT_PUBLIC_STRIPE_ALLOW_DEVNET=true to override)'
    : 'Stripe disabled by flag'
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? 'OK' : 'FAIL'} - ${c.name}: ${c.message}`);
}
process.exit(failed.length ? 1 : 0);
