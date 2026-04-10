use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

mod errors;
mod state;

use errors::*;
use state::*;

declare_id!("CrkwL2RAcGE7e3zoeHa1b1pNLbXX9B6X1kTcMJTd27BJ");

#[program]
pub mod pivlink {
    use super::*;

    /// Initialize a new escrow vault for an invoice
    pub fn initialize(
        ctx: Context<Initialize>,
        invoice_id: [u8; 16],
        amount: u64,
        freelancer: Pubkey,
        client: Pubkey,
        deadline: i64,
        platform_fee_bps: u16,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(amount > 0, EscrowError::InvalidAmount);

        let clock = Clock::get()?;
        require!(deadline > clock.unix_timestamp, EscrowError::InvalidDeadline);

        escrow.invoice_id = invoice_id;
        escrow.freelancer = freelancer;
        escrow.client = client;
        escrow.arbitrator = ctx.accounts.arbitrator.key();
        escrow.amount = amount;
        escrow.platform_fee_bps = platform_fee_bps;
        escrow.state = EscrowState::AwaitingFunds;
        escrow.deadline = deadline;
        escrow.client_approved = false;
        escrow.freelancer_approved = false;
        escrow.bump = ctx.bumps.escrow;

        Ok(())
    }

    pub fn deposit_notification(ctx: Context<DepositNotification>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;

        require!(escrow.state == EscrowState::AwaitingFunds, EscrowError::InvalidState);

        let vault_balance = ctx.accounts.vault.amount;
        require!(vault_balance >= escrow.amount, EscrowError::InsufficientFunds);

        let escrow_mut = &mut ctx.accounts.escrow;
        escrow_mut.state = EscrowState::Funded;
        escrow_mut.client_approved = false;
        escrow_mut.freelancer_approved = false;

        Ok(())
    }

    pub fn approve_client(ctx: Context<ApproveClient>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Funded, EscrowError::InvalidState);
        require_keys_eq!(ctx.accounts.client.key(), escrow.client, EscrowError::Unauthorized);
        escrow.client_approved = true;
        Ok(())
    }

    pub fn approve_freelancer(ctx: Context<ApproveFreelancer>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Funded, EscrowError::InvalidState);
        require_keys_eq!(
            ctx.accounts.freelancer.key(),
            escrow.freelancer,
            EscrowError::Unauthorized
        );
        escrow.freelancer_approved = true;
        Ok(())
    }

    pub fn release(ctx: Context<Release>) -> Result<()> {
        {
            let escrow = &ctx.accounts.escrow;

            require!(escrow.state == EscrowState::Funded, EscrowError::InvalidState);
            require!(
                escrow.client_approved && escrow.freelancer_approved,
                EscrowError::MissingApprovals
            );
            require!(
                ctx.accounts.vault.mint == ctx.accounts.usdc_mint.key(),
                EscrowError::InvalidMint
            );

            let total_amount = escrow.amount;
            let fee = ((total_amount as u128 * escrow.platform_fee_bps as u128) / 10_000) as u64;
            let payout = total_amount
                .checked_sub(fee)
                .ok_or(EscrowError::InvalidAmount)?;

            let signer_seeds: &[&[&[u8]]] = &[&[b"pivlink", &escrow.invoice_id, &[escrow.bump]]];

            token::transfer(ctx.accounts.transfer_fee_ctx().with_signer(signer_seeds), fee)?;
            token::transfer(
                ctx.accounts
                    .transfer_freelancer_ctx()
                    .with_signer(signer_seeds),
                payout,
            )?;
            token::close_account(ctx.accounts.close_ctx().with_signer(signer_seeds))?;
        }

        let escrow = &mut ctx.accounts.escrow;
        escrow.state = EscrowState::Released;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(invoice_id: [u8; 16])]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = arbitrator,
        space = 8 + Escrow::LEN,
        seeds = [b"pivlink", invoice_id.as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        init,
        payer = arbitrator,
        token::mint = usdc_mint,
        token::authority = escrow,
        seeds = [b"vault", invoice_id.as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub arbitrator: Signer<'info>,

    /// CHECK: Freelancer wallet address stored in escrow state.
    pub freelancer: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositNotification<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"vault", &escrow.invoice_id],
        bump = escrow.bump
    )]
    pub vault: Account<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"vault", &escrow.invoice_id],
        bump = escrow.bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub freelancer_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_token: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    /// CHECK: Freelancer account (for closing vault destination)
    #[account(mut)]
    pub freelancer: AccountInfo<'info>,

    /// Relayer signer can execute release once both approvals exist.
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ApproveClient<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    pub client: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveFreelancer<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    pub freelancer: Signer<'info>,
}

impl<'info> Release<'info> {
    pub fn transfer_fee_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.vault.to_account_info(),
            to: self.treasury_token.to_account_info(),
            authority: self.escrow.to_account_info(),
        };
        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn transfer_freelancer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.vault.to_account_info(),
            to: self.freelancer_token.to_account_info(),
            authority: self.escrow.to_account_info(),
        };
        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn close_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.freelancer.to_account_info(),
            authority: self.escrow.to_account_info(),
        };
        CpiContext::new(cpi_program, cpi_accounts)
    }
}