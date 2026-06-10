import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { initializeEscrow, isEscrowInitialized } from '@/lib/api/contract';
import { getInvoice } from '@/lib/api/invoices';
import { getSupabase } from '@/lib/supabase/client';
import { parseHotWalletKeypair } from '@/lib/solana/hot-wallet';

export interface EnsureEscrowResult {
  initialized: boolean;
  signature?: string;
  alreadyInitialized: boolean;
}

export async function ensureEscrowInitialized(
  invoiceId: string,
  clientWalletAddress?: string | null
): Promise<EnsureEscrowResult> {
  const invoice = await getInvoice(invoiceId);
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );

  const alreadyInitialized = await isEscrowInitialized(invoiceId, connection);
  if (alreadyInitialized) {
    if (!invoice.escrow_initialized) {
      const supabase = getSupabase();
      await supabase
        .from('invoices')
        .update({
          escrow_initialized: true,
          escrow_initialized_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);
    }
    return { initialized: true, alreadyInitialized: true };
  }

  const hotWalletPrivateKey = process.env.HOT_WALLET_PRIVATE_KEY;
  if (!hotWalletPrivateKey) {
    throw new Error('Hot wallet not configured on server');
  }

  const hotWallet = parseHotWalletKeypair(hotWalletPrivateKey);
  const clientWallet = clientWalletAddress?.trim()
    ? new PublicKey(clientWalletAddress.trim())
    : hotWallet.publicKey;

  const signature = await initializeEscrow({
    invoiceId,
    amount: Number(invoice.amount_usdc),
    freelancerWallet: new PublicKey(invoice.freelancer_wallet),
    clientWallet,
    connection,
    hotWallet,
  });

  const supabase = getSupabase();
  await supabase
    .from('invoices')
    .update({
      escrow_initialized: true,
      escrow_initialized_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  return { initialized: true, signature, alreadyInitialized: false };
}
