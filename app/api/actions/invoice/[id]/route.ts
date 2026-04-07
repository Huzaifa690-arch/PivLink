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
} from '@solana/spl-token';
import { getInvoice } from '@/lib/api/invoices';
import { getUsdcMint, getProgramId, getVaultPDA, uuidToBytes } from '@/lib/solana/utils';

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

    // Step 1: Ensure escrow is initialized on-chain
    try {
      const initializeUrl = new URL(req.url);
      initializeUrl.pathname = `/api/invoices/${invoiceId}/initialize`;
      
      const initRes = await fetch(initializeUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!initRes.ok) {
        const error = await initRes.text();
        console.warn('Escrow initialization warning:', error);
        // Don't fail payment request if initialization fails; it may already be initialized
      }
    } catch (error) {
      console.warn('Could not initialize escrow:', error);
      // Continue anyway; vault may already exist
    }

    // Step 2: Build the USDC transfer transaction
    const usdcMint = getUsdcMint();

    // Derive the vault PDA where funds will be held in escrow
    const invoiceBytes = uuidToBytes(invoiceId);
    const programId = getProgramId();
    const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);

    const payerAta = await getAssociatedTokenAddress(usdcMint, payer);

    const mintInfo = await getMint(connection, usdcMint);
    const decimals = mintInfo.decimals;
    const amountRaw = BigInt(Math.floor(invoice.amount_usdc * 10 ** decimals));

    const transferIx = createTransferCheckedInstruction(
      payerAta,
      usdcMint,
      vaultPDA,
      payer,
      amountRaw,
      decimals
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: payer,
      blockhash,
      lastValidBlockHeight,
    }).add(transferIx);

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
