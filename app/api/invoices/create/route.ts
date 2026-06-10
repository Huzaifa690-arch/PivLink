import { NextRequest, NextResponse } from 'next/server';
import { createInvoice, updateInvoiceVault } from '@/lib/api/invoices';
import { getVaultPDA, uuidToBytes, getProgramId, isValidSolanaPublicKey } from '@/lib/solana/utils';
import { getPrivyTokenFromRequest, verifyPrivyAccessToken } from '@/lib/privy-server';
import { requireKycSubmitted } from '@/lib/api/kyc';

export async function POST(request: NextRequest) {
  try {
    // When Privy App ID is set, require and verify Bearer token (production)
    const token = getPrivyTokenFromRequest(request);
    if (process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      if (!token) {
        return NextResponse.json(
          { error: 'Authorization required. Please sign in again.' },
          { status: 401 }
        );
      }
      try {
        await verifyPrivyAccessToken(token);
      } catch {
        return NextResponse.json(
          { error: 'Invalid or expired session. Please sign in again.' },
          { status: 401 }
        );
      }
    }

    const { freelancerWallet, clientName, amountUsdc, releasePassword } = await request.json();

    if (!freelancerWallet || !amountUsdc || !releasePassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      const gate = await requireKycSubmitted(freelancerWallet);
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
      }
    }

    // Create invoice in database (no Solana required)
    const invoice = await createInvoice({
      freelancerWallet,
      clientName,
      amountUsdc,
      releasePassword,
    });

    const programIdEnv = process.env.NEXT_PUBLIC_PROGRAM_ID;
    const usdcMintEnv = process.env.NEXT_PUBLIC_USDC_MINT;
    const useSolana =
      programIdEnv &&
      isValidSolanaPublicKey(programIdEnv) &&
      usdcMintEnv &&
      isValidSolanaPublicKey(usdcMintEnv);

    let vaultAddress: string;

    if (useSolana) {
      const programId = getProgramId();
      const invoiceBytes = uuidToBytes(invoice.id);
      const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);
      vaultAddress = vaultPDA.toBase58();
      await updateInvoiceVault(invoice.id, vaultAddress);
    } else {
      // Already set in createInvoice as off-chain-<id>
      vaultAddress = invoice.vault_address;
    }

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        vault_address: vaultAddress,
      },
      message: useSolana
        ? 'Invoice created. Please initialize the escrow contract with your wallet.'
        : 'Invoice created. Amount is in USDC (tracked in-app; no on-chain escrow).',
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
