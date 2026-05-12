use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod underwriting {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn anchor_decision(
        ctx: Context<AnchorDecision>,
        decision_id: String,
        borrower_pubkey: String,
        eligible: bool,
        risk_band: String,
        max_borrow_usd: String,
        collateral_ratio: String,
        reason: String,
        policy_version_hash: String,
    ) -> Result<()> {
        let decision = &mut ctx.accounts.decision;
        decision.decision_id = decision_id;
        decision.borrower_pubkey = borrower_pubkey;
        decision.eligible = eligible;
        decision.risk_band = risk_band;
        decision.max_borrow_usd = max_borrow_usd;
        decision.collateral_ratio = collateral_ratio;
        decision.reason = reason;
        decision.policy_version_hash = policy_version_hash;
        decision.timestamp = Clock::get()?.unix_timestamp;
        decision.authority = ctx.accounts.authority.key();

        Ok(())
    }

    pub fn verify_decision(
        ctx: Context<VerifyDecision>,
        decision_id: String,
    ) -> Result<()> {
        let decision = &ctx.accounts.decision;
        
        require!(
            decision.decision_id == decision_id,
            UnderwritingError::DecisionMismatch
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct AnchorDecision<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 256 + 256 + 1 + 50 + 50 + 50 + 256 + 512 + 8 + 32)]
    pub decision: Account<'info, Decision>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyDecision<'info> {
    pub decision: Account<'info, Decision>,
}

#[account]
pub struct Decision {
    pub decision_id: String,
    pub borrower_pubkey: String,
    pub eligible: bool,
    pub risk_band: String,
    pub max_borrow_usd: String,
    pub collateral_ratio: String,
    pub reason: String,
    pub policy_version_hash: String,
    pub timestamp: i64,
    pub authority: Pubkey,
}

#[error_code]
pub enum UnderwritingError {
    #[msg("Decision ID mismatch")]
    DecisionMismatch,
}
