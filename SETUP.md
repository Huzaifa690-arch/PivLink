# PivLink Setup Guide

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Rust** - [Install](https://www.rust-lang.org/tools/install)
3. **Anchor CLI** - Install with: `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force`
4. **Solana CLI** - [Install](https://docs.solana.com/cli/install-solana-cli-tools)
5. **Supabase Account** - [Sign up](https://supabase.com)
6. **Privy Account** - [Sign up](https://dashboard.privy.io/) for embedded wallet authentication and payment processing

## Step-by-Step Setup

### 1. Install Dependencies

**If `npm install` fails** with an error about `yarn` or `@stellar/stellar-sdk`:

- **Option A (recommended):** Install Yarn, then run install again:
  ```bash
  npm install -g yarn
  npm install
  ```
- **Option B:** Skip postinstall scripts (install usually still works):
  ```bash
  npm install --ignore-scripts
  ```

**Otherwise**, run:

```bash
npm install
```

### 2. Setup Solana Wallet

```bash
# Generate a new keypair (if you don't have one)
solana-keygen new

# Set to devnet
solana config set --url devnet

# Get some SOL for testing
solana airdrop 2
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your values:

- **Supabase**: Get your URL and keys from your Supabase project settings
- **Program ID**: Will be generated after building/deploying the Anchor program
- **USDC Mint**: 
  - Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (test USDC)
  - Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (real USDC)
- **Treasury Wallet**: Your wallet address that will receive the 1% fee
- **Privy App ID** (required): For embedded wallet authentication and payment processing, create an app at [Privy Dashboard](https://dashboard.privy.io/), copy your App ID, and set `NEXT_PUBLIC_PRIVY_APP_ID` in `.env`. This enables email-based login, automatic Solana wallet creation, and card payment processing.
- **Stripe Crypto Onramp** (mainnet card payments): Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_CRYPTO_ONRAMP_VERSION` from your [Stripe Dashboard](https://dashboard.stripe.com/). Configure the webhook endpoint `https://your-domain.com/api/stripe/webhooks/onramp` for `crypto.onramp_session.*` events. Use feature flags in `.env.example` to choose Stripe vs Privy/Blink fallbacks.
- **Hot Wallet**: Generate a new keypair for V1 release signing:
  ```bash
  solana-keygen new -o hot-wallet.json
  # Get private key in base58:
  solana-keygen pubkey hot-wallet.json --outfile /dev/stdout
  ```

### 4. Setup Database

#### Option A: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

#### Option B: Manual SQL Execution

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Execute the SQL

### 5. Build & Deploy Smart Contract

```bash
# Build the Anchor program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get your program ID
anchor keys list

# Update NEXT_PUBLIC_PROGRAM_ID in .env with the program ID
```

### 6. Update Program ID

After deploying, update the program ID in:

1. `.env` - `NEXT_PUBLIC_PROGRAM_ID`
2. `programs/pivlink/src/lib.rs` - Replace `REPLACE_WITH_YOUR_PROGRAM_ID`
3. `Anchor.toml` - Update `[programs.devnet]` section

Then rebuild:

```bash
anchor build
anchor deploy --provider.cluster devnet
```

### 7. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Testing the Flow

1. **Create Invoice**:
   - Sign in with email using Privy (creates embedded Solana wallet automatically)
   - Go to `/create`
   - Fill in invoice details
   - Click "Create Invoice"
   - **Note**: You'll need to initialize the escrow contract client-side (TODO)

2. **Pay Invoice**:
   - Open the pay link (`/pay/[id]`)
   - Sign in with Privy if not already authenticated
   - Click "Pay with Card" to use Privy's card payment flow
   - Funds will be converted to USDC and sent to the vault PDA

3. **Check Funding**:
   - The system will automatically check vault balance
   - Status updates to "funded" when sufficient USDC is detected

4. **Release Funds**:
   - Go to `/release/[id]`
   - Enter release password
   - Backend will sign and send release transaction
   - Funds distributed: 99% to freelancer, 1% to treasury

## Important Notes

### V1 Limitations

- **Hot Wallet Required**: V1 uses a backend hot wallet to sign release transactions. This is acceptable because:
  - Funds are locked in the smart contract
  - Wallet can only call `release` instruction
  - Amounts are fixed on-chain

- **Manual Release Only**: V1 requires manual password-based release. V2 will add AI verification.

### Security Best Practices

1. **Hot Wallet Security**:
   - Store private key securely (use environment variables)
   - Rotate keys weekly
   - Limit wallet permissions
   - Use separate wallets for devnet/mainnet

2. **Environment Variables**:
   - Never commit `.env` to git
   - Use different keys for devnet/mainnet
   - Rotate API keys regularly

3. **Smart Contract**:
   - Audit before mainnet deployment
   - Test thoroughly on devnet
   - Verify USDC mint address
   - Test with small amounts first

## Troubleshooting

### "Program ID mismatch"
- Make sure you've updated the program ID in all locations
- Rebuild and redeploy

### "Insufficient funds"
- Make sure your wallet has SOL for transaction fees
- Get devnet SOL: `solana airdrop 2`

### "Vault not found"
- Ensure the contract has been initialized
- Check that invoice ID matches the one used in initialization

### Privy Payment Not Working
- Check your Privy App ID
- Verify you're authenticated with Privy
- Check browser console for errors
- Ensure your Privy app is configured for Solana and card payments

## Next Steps

- [ ] Implement client-side contract initialization
- [ ] Add Anchor IDL generation and import
- [ ] Implement `deposit_notification` call
- [ ] Add transaction status tracking
- [ ] Build admin dashboard
- [ ] Add email notifications
- [ ] Prepare for V2 features (AI verification, Stripe)
