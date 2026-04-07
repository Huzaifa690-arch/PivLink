import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { getEscrowPDA, getVaultPDA, uuidToBytes, getProgramId, getUsdcMint } from '@/lib/solana/utils';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

export interface InitializeEscrowParams {
  invoiceId: string;
  amount: number; // USDC amount
  freelancerWallet: PublicKey;
  clientWallet: PublicKey;
  connection: Connection;
  hotWallet: Keypair;
}

/**
 * Initialize escrow contract on devnet
 * Called from backend with hot wallet
 * Creates the escrow state account and vault token account
 */
export async function initializeEscrow(params: InitializeEscrowParams): Promise<string> {
  const { invoiceId, amount, freelancerWallet, clientWallet, connection, hotWallet } = params;

  const programId = getProgramId();
  const usdcMint = getUsdcMint();
  const invoiceBytes = uuidToBytes(invoiceId);

  // Derive PDAs
  const [escrowPDA] = await getEscrowPDA(invoiceBytes, programId);
  const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);

  // Provider for signing
  const wallet = {
    publicKey: hotWallet.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(hotWallet);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach((t) => t.partialSign(hotWallet));
      return txs;
    },
  };

  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: 'confirmed',
  });

  try {
    // Get program IDL dynamically
    const idl = await Program.fetchIdl(programId, provider);
    if (!idl) throw new Error('Failed to fetch program IDL');

    const program = new Program(idl, provider);

    // Calculate decimals and raw amount
    const mintInfo = await connection.getParsedAccountInfo(usdcMint);
    const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 6;
    const amountRaw = new BN(Math.floor(amount * Math.pow(10, decimals)));

    // Deadline: 30 days from now
    const deadline = new BN(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

    // Build initialize instruction
    const tx = await program.methods
      .initialize(
        invoiceBytes,
        amountRaw,
        clientWallet, // client
        deadline,
        500 // 5% platform fee
      )
      .accounts({
        escrow: escrowPDA,
        vault: vaultPDA,
        usdcMint: usdcMint,
        arbitrator: hotWallet.publicKey, // Backend is the arbitrator
        freelancer: hotWallet.publicKey, // Freelancer signer (backend uses hot wallet)
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([hotWallet])
      .rpc({ commitment: 'confirmed' });

    console.log('Escrow initialized:', tx);
    return tx;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize escrow: ${msg}`);
  }
}

/**
 * Check if escrow is already initialized
 */
export async function isEscrowInitialized(invoiceId: string, connection: Connection): Promise<boolean> {
  try {
    const programId = getProgramId();
    const invoiceBytes = uuidToBytes(invoiceId);
    const [escrowPDA] = await getEscrowPDA(invoiceBytes, programId);

    const account = await connection.getAccountInfo(escrowPDA);
    return account !== null;
  } catch {
    return false;
  }
}

/**
 * Call deposit_notification instruction (permissionless)
 */
export async function notifyDeposit(
  invoiceId: string,
  connection: Connection,
  wallet: Keypair
): Promise<string> {
  const programId = getProgramId();
  const invoiceBytes = uuidToBytes(invoiceId);

  const [escrowPDA] = await getEscrowPDA(invoiceBytes, programId);
  const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);

  const keypairWallet = {
    publicKey: wallet.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(wallet);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach((t) => t.partialSign(wallet));
      return txs;
    },
  };

  const provider = new AnchorProvider(connection, keypairWallet as any, {
    commitment: 'confirmed',
  });

  try {
    const idl = await Program.fetchIdl(programId, provider);
    if (!idl) throw new Error('Failed to fetch program IDL');

    const program = new Program(idl, provider);

    const tx = await program.methods
      .depositNotification()
      .accounts({
        escrow: escrowPDA,
        vault: vaultPDA,
      })
      .signers([wallet])
      .rpc({ commitment: 'confirmed' });

    console.log('Deposit notification sent:', tx);
    return tx;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to notify deposit: ${msg}`);
  }
}

/**
 * Call release instruction (backend hot wallet as releaser)
 */
export async function releaseEscrow(invoiceId: string, connection: Connection, hotWallet: Keypair): Promise<string> {
  // NOTE: This requires the client wallet to sign (currently not supported in backend flow)
  // For now, this is a placeholder
  throw new Error('Release instruction requires client signature. Implement frontend-based release flow.');
}
