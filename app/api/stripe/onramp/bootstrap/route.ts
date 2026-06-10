import { NextRequest, NextResponse } from 'next/server';
import { requirePrivyRoles } from '@/lib/api/authz';
import { getPaymentMethodsForClient } from '@/lib/payments/config';
import { getPublishableKey, verifyStripeConfigured } from '@/lib/stripe/onramp';
import { getSolanaNetwork } from '@/lib/payments/network';

export async function GET(request: NextRequest) {
  const authz = await requirePrivyRoles(request, ['user', 'admin', 'support']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const stripeConfig = verifyStripeConfigured();
  const methods = getPaymentMethodsForClient();

  return NextResponse.json({
    publishableKey: stripeConfig.ok ? getPublishableKey() : null,
    network: getSolanaNetwork(),
    methods,
    stripeConfigured: stripeConfig.ok,
    stripeMessage: stripeConfig.message,
  });
}
