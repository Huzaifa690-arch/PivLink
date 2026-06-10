export type SolanaNetwork = 'mainnet' | 'devnet';

export function getSolanaNetwork(): SolanaNetwork {
  const explicit = process.env.NEXT_PUBLIC_SOLANA_NETWORK?.toLowerCase();
  if (explicit === 'mainnet' || explicit === 'devnet') return explicit;

  const rpc = (process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '').toLowerCase();
  if (rpc.includes('mainnet')) return 'mainnet';
  return 'devnet';
}

export function isMainnet(): boolean {
  return getSolanaNetwork() === 'mainnet';
}

export function getStripeDestinationNetwork(): 'solana' {
  return 'solana';
}
