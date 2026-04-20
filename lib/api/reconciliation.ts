import { Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import {
  getInvoice,
  markInvoiceReconcileFailure,
  markInvoiceReconcileSuccess,
  transitionInvoiceWorkflowState,
} from '@/lib/api/invoices';
import { getEscrowPDA, getProgramId, getVaultPDA, uuidToBytes } from '@/lib/solana/utils';

export interface ReconcileResult {
  invoiceId: string;
  previousState: string;
  nextState: string;
  vaultBalanceRaw: string;
  expectedRaw: string;
  clientApproved: boolean;
  freelancerApproved: boolean;
  transitioned: boolean;
}

export async function reconcileInvoiceState(invoiceId: string): Promise<ReconcileResult> {
  const invoice = await getInvoice(invoiceId);
  const previousState = invoice.workflow_state ?? invoice.status;

  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );
  const programId = getProgramId();
  const invoiceBytes = uuidToBytes(invoiceId);
  const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);
  const [escrowPDA] = await getEscrowPDA(invoiceBytes, programId);
  const expectedRaw = BigInt(Math.floor(Number(invoice.amount_usdc) * 1_000_000));

  let vaultBalanceRaw = 0n;
  const vaultAccount = await connection.getAccountInfo(vaultPDA);
  if (vaultAccount) {
    const balance = await connection.getTokenAccountBalance(vaultPDA);
    vaultBalanceRaw = BigInt(balance.value.amount);
  }

  let clientApproved = false;
  let freelancerApproved = false;
  try {
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: escrowPDA,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      } as any,
      { commitment: 'confirmed' }
    );
    const idl = await Program.fetchIdl(programId, provider);
    if (idl) {
      const program = new Program(idl as any, provider as any);
      const escrow = await (program.account as any).escrow.fetch(escrowPDA);
      clientApproved = Boolean(escrow?.clientApproved);
      freelancerApproved = Boolean(escrow?.freelancerApproved);
    }
  } catch {
    // Escrow may not be initialized yet; keep defaults.
  }

  let nextState = previousState;
  let transitioned = false;

  if (invoice.status === 'released' || invoice.workflow_state === 'released') {
    nextState = 'released';
  } else if (vaultBalanceRaw >= expectedRaw) {
    nextState = clientApproved && freelancerApproved ? 'approvals' : 'funded';
  } else {
    nextState = 'created';
  }

  if (nextState !== previousState) {
    const allowedFrom =
      nextState === 'created' ? ['created', 'funded'] :
      nextState === 'funded' ? ['created', 'funded'] :
      nextState === 'approvals' ? ['funded', 'approvals'] :
      ['approvals', 'released'];
    transitioned = await transitionInvoiceWorkflowState(
      invoiceId,
      allowedFrom as any,
      nextState as any
    );
  }

  await markInvoiceReconcileSuccess(invoiceId);

  return {
    invoiceId,
    previousState,
    nextState,
    vaultBalanceRaw: vaultBalanceRaw.toString(),
    expectedRaw: expectedRaw.toString(),
    clientApproved,
    freelancerApproved,
    transitioned,
  };
}

export async function reconcileInvoiceStateSafe(invoiceId: string): Promise<ReconcileResult> {
  try {
    return await reconcileInvoiceState(invoiceId);
  } catch (err: any) {
    const message = err?.message || 'Unknown reconciliation error';
    await markInvoiceReconcileFailure(invoiceId, message);
    throw err;
  }
}
