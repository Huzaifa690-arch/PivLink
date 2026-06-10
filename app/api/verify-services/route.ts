import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection } from '@solana/web3.js';

type CheckResult = { ok: boolean; message: string };

/**
 * Verify all service configurations.
 * GET /api/verify-services
 * Returns a report (no secrets exposed).
 */
export async function GET() {
  const results: Record<string, CheckResult> = {};
  let allOk = true;

  // 1. Supabase
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isPlaceholder =
      !url ||
      !key ||
      url.includes('your_supabase') ||
      url.includes('your_') ||
      key.includes('your_');

    if (isPlaceholder) {
      results.supabase = { ok: false, message: 'Missing or placeholder env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)' };
      allOk = false;
    } else {
      const supabase = createClient(url, key);
      const { data, error } = await supabase.from('invoices').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          results.supabase = { ok: false, message: 'invoices table does not exist. Run Supabase migrations.' };
        } else {
          results.supabase = { ok: false, message: `Supabase error: ${error.message}` };
        }
        allOk = false;
      } else {
        results.supabase = { ok: true, message: 'Connected. invoices table exists.' };
      }
    }
  } catch (e: any) {
    results.supabase = { ok: false, message: `Supabase check failed: ${e?.message || String(e)}` };
    allOk = false;
  }

  // 2. Privy
  try {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    if (!appId || appId.includes('your_')) {
      results.privy = { ok: false, message: 'Missing or placeholder NEXT_PUBLIC_PRIVY_APP_ID' };
      allOk = false;
    } else {
      const jwksUrl = process.env.PRIVY_JWKS_URI ?? `https://auth.privy.io/api/v1/apps/${appId}/jwks.json`;
      const res = await fetch(jwksUrl, { cache: 'no-store' });
      if (!res.ok) {
        results.privy = { ok: false, message: `JWKS unreachable (${res.status})` };
        allOk = false;
      } else {
        results.privy = { ok: true, message: 'App ID set. JWKS reachable.' };
      }
    }
  } catch (e: any) {
    results.privy = { ok: false, message: `Privy check failed: ${e?.message || String(e)}` };
    allOk = false;
  }

  // 3. Solana RPC
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const conn = new Connection(rpcUrl, 'confirmed');
    const version = await conn.getVersion();
    results.solanaRpc = { ok: true, message: `RPC OK (${rpcUrl.includes('mainnet') ? 'mainnet' : 'devnet'})` };
  } catch (e: any) {
    results.solanaRpc = { ok: false, message: `Solana RPC failed: ${e?.message || String(e)}` };
    allOk = false;
  }

  // 4. Solana program / USDC (advisory; required for invoice creation)
  try {
    const programId = process.env.NEXT_PUBLIC_PROGRAM_ID;
    const usdcMint = process.env.NEXT_PUBLIC_USDC_MINT;
    const treasury = process.env.NEXT_PUBLIC_TREASURY_WALLET;
    const hasPlaceholders =
      !programId ||
      programId.includes('REPLACE') ||
      !usdcMint ||
      usdcMint.includes('your_') ||
      !treasury ||
      treasury.includes('your_');

    if (hasPlaceholders) {
      results.solanaConfig = {
        ok: false,
        message: 'PROGRAM_ID, USDC_MINT, or TREASURY_WALLET missing or placeholder. Set after deploying the Anchor program.',
      };
      // Don't fail overall ok; core services (supabase, privy, rpc) are sufficient for basic setup
    } else {
      results.solanaConfig = { ok: true, message: 'Program ID, USDC mint, and treasury configured.' };
    }
  } catch (e: any) {
    results.solanaConfig = { ok: false, message: `Config check failed: ${e?.message || String(e)}` };
  }

  // 5. Stripe Crypto Onramp (advisory when disabled)
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const webhook = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeEnabled = process.env.NEXT_PUBLIC_ENABLE_STRIPE_ONRAMP === 'true';

    if (!stripeEnabled) {
      results.stripeOnramp = { ok: true, message: 'Stripe on-ramp disabled by feature flag.' };
    } else if (!secret || !publishable || secret.includes('your_') || publishable.includes('your_')) {
      results.stripeOnramp = {
        ok: false,
        message: 'Stripe on-ramp enabled but STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing.',
      };
    } else {
      const res = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions?limit=1', {
        headers: {
          Authorization: `Bearer ${secret}`,
          'Stripe-Version':
            process.env.STRIPE_CRYPTO_ONRAMP_VERSION || '2026-01-28.clover',
        },
        cache: 'no-store',
      });
      if (!res.ok && res.status !== 404) {
        results.stripeOnramp = {
          ok: false,
          message: `Stripe crypto on-ramp API unreachable (${res.status}).`,
        };
      } else {
        results.stripeOnramp = {
          ok: true,
          message: webhook
            ? 'Stripe keys configured. Webhook secret set.'
            : 'Stripe keys configured. STRIPE_WEBHOOK_SECRET not set (webhooks will fail).',
        };
      }
    }
  } catch (e: any) {
    results.stripeOnramp = { ok: false, message: `Stripe check failed: ${e?.message || String(e)}` };
  }

  return NextResponse.json({
    ok: allOk,
    results,
    summary: allOk
      ? 'All services configured and reachable.'
      : 'Some checks failed. Review results above.',
  });
}
