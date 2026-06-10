import { Connection } from '@solana/web3.js';
import { notifyDeposit } from '@/lib/api/contract';
import { getInvoice, updateInvoiceOnramp } from '@/lib/api/invoices';
import { reconcileInvoiceStateSafe } from '@/lib/api/reconciliation';
import { refreshInvoiceTransparencySignature } from '@/lib/api/transparency';
import { getVaultPDA, getProgramId, uuidToBytes } from '@/lib/solana/utils';
import { parseHotWalletKeypair } from '@/lib/solana/hot-wallet';

export interface FinalizeFundingResult {
  invoiceId: string;
  vaultBalanceRaw: string;
  expectedRaw: string;
  depositNotificationTx?: string | null;
  reconciled: boolean;
  workflowState: string;
  transparencySignature?: string;
}

export async function finalizeInvoiceFunding(invoiceId: string): Promise<FinalizeFundingResult> {
  const invoice = await getInvoice(invoiceId);
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );

  const programId = getProgramId();
  const invoiceBytes = uuidToBytes(invoiceId);
  const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);
  const expectedRaw = BigInt(Math.floor(Number(invoice.amount_usdc) * 1_000_000));

  let vaultBalanceRaw = 0n;
  const vaultAccount = await connection.getAccountInfo(vaultPDA);
  if (vaultAccount) {
    const balance = await connection.getTokenAccountBalance(vaultPDA);
    vaultBalanceRaw = BigInt(balance.value.amount);
  }

  let depositNotificationTx = invoice.deposit_notification_tx ?? null;
  if (vaultBalanceRaw >= expectedRaw && !depositNotificationTx) {
    const hotWalletPrivateKey = process.env.HOT_WALLET_PRIVATE_KEY;
    if (!hotWalletPrivateKey) {
      throw new Error('Hot wallet not configured on server');
    }
    const hotWallet = parseHotWalletKeypair(hotWalletPrivateKey);
    depositNotificationTx = await notifyDeposit(invoiceId, connection, hotWallet);
    await updateInvoiceOnramp(invoiceId, {
      deposit_notification_tx: depositNotificationTx,
    });
  }

  const reconcile = await reconcileInvoiceStateSafe(invoiceId);
  const refreshedInvoice = await getInvoice(invoiceId);

  if (
    reconcile.transitioned &&
    (reconcile.nextState === 'funded' || reconcile.nextState === 'approvals') &&
    !refreshedInvoice.funded_at
  ) {
    await updateInvoiceOnramp(invoiceId, { funded_at: new Date().toISOString() });
  }

  const transparencySignature = await refreshInvoiceTransparencySignature(refreshedInvoice);

  return {
    invoiceId,
    vaultBalanceRaw: vaultBalanceRaw.toString(),
    expectedRaw: expectedRaw.toString(),
    depositNotificationTx,
    reconciled: reconcile.transitioned,
    workflowState: reconcile.nextState,
    transparencySignature,
  };
}
