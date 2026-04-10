import { NextRequest } from 'next/server';
import {
  createPostResponse,
  createActionHeaders,
  type ActionGetResponse,
  type ActionError,
} from '@solana/actions';
import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  getMint,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { getInvoice } from '@/lib/api/invoices';
import { getUsdcMint, getProgramId, getVaultPDA, getEscrowPDA, uuidToBytes } from '@/lib/solana/utils';

const headers = createActionHeaders();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const invoice = await getInvoice(invoiceId);

    const origin = req.nextUrl.origin;
    const actionHref = `${origin}/api/actions/invoice/${invoiceId}`;

    const payload: ActionGetResponse = {
      type: 'action',
      title: 'PivLink – Pay invoice',
      icon: new URL('/favicon.ico', origin).toString(),
      description: `Pay ${invoice.amount_usdc} USDC to the freelancer for this invoice${invoice.client_name ? ` (${invoice.client_name})` : ''}.`,
      label: `Pay ${invoice.amount_usdc} USDC`,
      links: {
        actions: [
          {
            type: 'transaction' as const,
            label: `Pay ${invoice.amount_usdc} USDC`,
            href: actionHref,
          },
        ],
      },
    };

    return Response.json(payload, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invoice not found';
    const actionError: ActionError = { message };
    return Response.json(actionError, { status: 400, headers });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const body = await req.json();
    const accountStr = body?.account;
    if (!accountStr || typeof accountStr !== 'string') {
      const actionError: ActionError = { message: 'Missing or invalid "account" (payer public key)' };
      return Response.json(actionError, { status: 400, headers });
    }

    const payer = new PublicKey(accountStr);
    const invoice = await getInvoice(invoiceId);

    if (invoice.status === 'released') {
      const actionError: ActionError = { message: 'This invoice is already paid and released.' };
      return Response.json(actionError, { status: 400, headers });
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Step 1: Check if escrow is initialized; if not, initialize it
    const invoiceBytes = uuidToBytes(invoiceId);
    const programId = getProgramId();
    const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);

    // Check if vault exists on-chain
    const vaultAccount = await connection.getAccountInfo(vaultPDA);
    if (!vaultAccount) {
      // Vault doesn't exist; try to initialize
      try {
        const initializeUrl = new URL(req.url);
        initializeUrl.pathname = `/api/invoices/${invoiceId}/initialize`;

        const initRes = await fetch(initializeUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientWallet: payer.toBase58() }),
        });

        if (!initRes.ok) {
          const error = await initRes.text();
          console.error('Escrow initialization failed:', error);
          const actionError: ActionError = { message: `Escrow vault could not be created. Please try again or contact support: ${error}` };
          return Response.json(actionError, { status: 500, headers });
        }

        // Initialization succeeded; now wait a moment for blockchain confirmation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Verify vault now exists
        const vaultAccountAfterInit = await connection.getAccountInfo(vaultPDA);
        if (!vaultAccountAfterInit) {
          const actionError: ActionError = { message: 'Escrow vault still not found after initialization. Please wait a moment and try again.' };
          return Response.json(actionError, { status: 500, headers });
        }
      } catch (error: any) {
        console.error('Could not initialize escrow:', error);
        const actionError: ActionError = { message: `Could not initialize escrow: ${error?.message ?? String(error)}` };
        return Response.json(actionError, { status: 500, headers });
      }
    }

    // Step 2: Build the USDC transfer transaction
    const usdcMint = getUsdcMint();
    const [escrowPDA] = await getEscrowPDA(invoiceBytes, programId);

    const payerAta = await getAssociatedTokenAddress(usdcMint, payer);

    // Check if payer's token account exists; if not, create it
    const payerAtaAccount = await connection.getAccountInfo(payerAta);
    
    const mintInfo = await getMint(connection, usdcMint);
    const decimals = mintInfo.decimals;
    const amountRaw = BigInt(Math.floor(invoice.amount_usdc * 10 ** decimals));

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: payer,
      blockhash,
      lastValidBlockHeight,
    });

    // Add create-if-missing instruction for payer's token account
    if (!payerAtaAccount) {
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(
          payer,           // payer
          payerAta,        // associated token account to create
          payer,           // wallet owner
          usdcMint         // token mint
        )
      );
    }

    // Add the transfer instruction
    const transferIx = createTransferCheckedInstruction(
      payerAta,
      usdcMint,
      vaultPDA,
      payer,
      amountRaw,
      decimals
    );
    transaction.add(transferIx);

    // Add deposit_notification so the escrow state updates immediately
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: payer,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      } as any,
      { commitment: 'confirmed' }
    );

    const idl = await Program.fetchIdl(programId, provider);
    if (!idl) {
      throw new Error('Failed to fetch program IDL for deposit notification');
    }

    const program = new Program(idl as any, provider as any);
    const depositIx = await program.methods
      .depositNotification()
      .accounts({
        escrow: escrowPDA,
        vault: vaultPDA,
      })
      .instruction();

    transaction.add(depositIx);

    const payload = await createPostResponse({
      fields: {
        type: 'transaction',
        transaction,
        message: `Pay ${invoice.amount_usdc} USDC to invoice ${invoiceId.slice(0, 8)}… (PivLink).`,
      },
    });

    return Response.json(payload, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build payment transaction';
    const actionError: ActionError = { message };
    return Response.json(actionError, { status: 400, headers });
  }
}
