use anchor_lang::prelude::*;

#[account]
pub struct Escrow {
    pub invoice_id: [u8; 16],
    pub freelancer: Pubkey,
    pub client: Pubkey,
    pub arbitrator: Pubkey,
    pub amount: u64,
    /// Platform fee in basis points (1% = 100 bps)
    pub platform_fee_bps: u16,
    pub state: EscrowState,
    /// Unix timestamp (seconds) after which funds can be auto-released
    pub deadline: i64,
    /// Explicit consent from client to release escrow.
    pub client_approved: bool,
    /// Explicit consent from freelancer to release escrow.
    pub freelancer_approved: bool,
    /// PDA bump for escrow seeds: ["pivlink", invoice_id]
    pub escrow_bump: u8,
    /// PDA bump for vault seeds: ["vault", invoice_id]
    pub vault_bump: u8,
}

impl Escrow {
    pub const LEN: usize =
        16 + // invoice_id
        32 + // freelancer
        32 + // client
        32 + // arbitrator
        8  + // amount
        2  + // platform_fee_bps
        1  + // state
        8  + // deadline
        1  + // client_approved
        1  + // freelancer_approved
        1  + // escrow_bump
        1;  // vault_bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowState {
    AwaitingFunds,
    Funded,
    Released,
    Refunded,
    Disputed,
}
