export type ClientPaymentBootstrap = {
  publishableKey: string | null;
  network: 'mainnet' | 'devnet';
  methods: {
    mode: 'stripe' | 'privy' | 'hybrid';
    stripe: boolean;
    privyCard: boolean;
    blink: boolean;
    stripeMaxUsd: number;
  };
  stripeConfigured: boolean;
};

export async function fetchPaymentBootstrap(accessToken?: string | null): Promise<ClientPaymentBootstrap> {
  const headers: HeadersInit = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch('/api/stripe/onramp/bootstrap', { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to load payment configuration');
  }
  return data;
}
