# PivLink - The Global Financial Bridge

Borderless, instant, and secure payment infrastructure for the global workforce.

## Overview

PivLink enables freelancers to receive payments via USDC on Solana, with funds secured in smart contract escrow until work is verified. Clients can pay using credit cards (Visa/Mastercard) through Privy's payment processing, with no wallet required.

## Architecture

### Core Principle
**All money movement is on-chain, enforced by Solana smart contracts.**
Backend is orchestration + verification only.

### Tech Stack

- **Frontend**: Next.js 14 (App Router) with Tailwind CSS & Framer Motion
- **Blockchain**: Solana (Anchor Framework)
- **Smart Contract**: Rust/Anchor
- **Database**: Supabase (PostgreSQL)
- **Wallet & Payments**: Privy (Embedded Solana wallets + Card payment processing)
- **Hosting**: Vercel

## Project Structure

```
.
├── programs/
│   └── pivlink/          # Anchor smart contract
│       └── src/
│           ├── lib.rs    # Main program logic
│           ├── state.rs  # Escrow state struct
│           └── errors.rs # Custom errors
├── app/                  # Next.js app directory
│   ├── api/              # API routes
│   ├── create/           # Invoice creation page
│   ├── pay/[id]/         # Payment page
│   └── release/[id]/     # Release funds page
├── lib/
│   ├── solana/           # Solana utilities (PDA derivation, etc.)
│   ├── supabase/         # Supabase client & types
│   └── api/              # API client functions
└── supabase/
    └── migrations/       # Database migrations
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- Rust & Anchor CLI
- Solana CLI
- Supabase account

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy App ID (get from https://dashboard.privy.io/)
- `NEXT_PUBLIC_PROGRAM_ID` - Your deployed Anchor program ID
- `NEXT_PUBLIC_USDC_MINT` - USDC mint address (devnet or mainnet)
- `NEXT_PUBLIC_TREASURY_WALLET` - Treasury wallet address
- `HOT_WALLET_PRIVATE_KEY` - Hot wallet private key (base58) for V1 release signing

### 3. Setup Database

Run Supabase migrations:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute supabase/migrations/001_initial_schema.sql in Supabase dashboard
```

### 4. Build & Deploy Smart Contract

```bash
# Build
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update NEXT_PUBLIC_PROGRAM_ID in .env with the deployed program ID
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Smart Contract Instructions

### `initialize`
Creates a new escrow vault for an invoice.
- **Called by**: Freelancer
- **Inputs**: `invoice_id` (UUID bytes), `amount` (u64)
- **Actions**: Creates PDA vault, sets state to `AwaitingFunds`

### `deposit_notification`
Notifies contract that funds have been deposited.
- **Called by**: Anyone (permissionless)
- **Actions**: Checks vault balance, updates state to `Funded` if sufficient

### `release`
Releases funds from escrow.
- **Called by**: Authorized releaser (V1: Backend hot wallet)
- **Actions**: Transfers 99% to freelancer, 1% to treasury, closes vault

## Flow

1. **Freelancer** signs in with Privy → Embedded Solana wallet created → Creates invoice → Backend stores metadata → Contract `initialize` called
2. **Client** opens pay link → Signs in with Privy → Pays with card via Privy → USDC purchased and sent to vault PDA
3. **Funding Detection** → `deposit_notification` called → Status updated to `funded`
4. **Release** → Client enters password → Backend verifies → Contract `release` called → Funds distributed to freelancer's Privy wallet

## Security Notes

- V1 uses a hot wallet for release signing (acceptable because funds are locked in contract)
- Release password is hashed with bcrypt
- All amounts verified on-chain
- USDC mint address explicitly checked
- One vault per invoice enforced by PDA

## V2 Roadmap

- AI verification mode (5% fee)
- Stripe Crypto Onramp (card → USDC → escrow vault; Privy/Blink fallbacks)
- Client wallet signing (replaces hot wallet)
- Dispute resolution system

## License

MIT
