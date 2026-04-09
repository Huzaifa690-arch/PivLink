import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const HOT_WALLET_PREFIX = 'HOT_WALLET_PRIVATE_KEY=';

function normalizeSecret(rawSecret: string): string {
  let secret = rawSecret.trim();

  if (
    (secret.startsWith('"') && secret.endsWith('"')) ||
    (secret.startsWith("'") && secret.endsWith("'"))
  ) {
    secret = secret.slice(1, -1).trim();
  }

  if (secret.startsWith(HOT_WALLET_PREFIX)) {
    secret = secret.slice(HOT_WALLET_PREFIX.length).trim();
  }

  return secret;
}

export function parseHotWalletKeypair(rawSecret: string): Keypair {
  const secret = normalizeSecret(rawSecret);

  try {
    return Keypair.fromSecretKey(bs58.decode(secret));
  } catch {
    // Continue with alternative formats.
  }

  try {
    const parsed = JSON.parse(secret);
    if (Array.isArray(parsed)) {
      const bytes = Uint8Array.from(parsed.map((n) => Number(n)));
      return Keypair.fromSecretKey(bytes);
    }
  } catch {
    // Not a JSON array format.
  }

  if (secret.includes(',')) {
    try {
      const bytes = Uint8Array.from(secret.split(',').map((part) => Number(part.trim())));
      return Keypair.fromSecretKey(bytes);
    } catch {
      // Not a CSV numeric array format.
    }
  }

  throw new Error(
    'HOT_WALLET_PRIVATE_KEY is invalid. Use base58 or a JSON array of 64 bytes.'
  );
}
