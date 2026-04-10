use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Invalid escrow state")]
    InvalidState,

    #[msg("Vault does not contain required funds")]
    InsufficientFunds,

    #[msg("Invalid USDC mint address")]
    InvalidMint,

    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Deadline must be in the future")]
    InvalidDeadline,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Both client and freelancer approvals are required")]
    MissingApprovals,
}
