use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

declare_id!("9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP");

#[program]
pub mod bytebonds {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Program initialized");
        Ok(())
    }

    // Create a new bond using PDA
    pub fn create_bond(
        ctx: Context<CreateBond>,
        bond_seed: u64,
        amount: u64,
        duration: u8,
        interest_rate: u8,
        income_proof: String,
        description: String,
        repayment_type: RepaymentType, // New parameter for repayment type
    ) -> Result<()> {
        msg!("Creating bond with amount: {}, duration: {}, interest_rate: {}, repayment_type: {:?}", 
             amount, duration, interest_rate, repayment_type);
        
        let bond = &mut ctx.accounts.bond;
        let freelancer = &ctx.accounts.freelancer;
        
        // Validate inputs with more detailed errors
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(duration > 0 && duration <= 60, ErrorCode::InvalidDuration);
        require!(interest_rate > 0 && interest_rate <= 50, ErrorCode::InvalidInterestRate);
        
        // Validate string lengths
        require!(income_proof.len() <= 200, ErrorCode::StringTooLong);
        require!(description.len() <= 500, ErrorCode::StringTooLong);
        
        msg!("All validations passed, initializing bond data");
        
        // Initialize bond
        bond.freelancer = freelancer.key();
        bond.amount = amount;
        bond.duration = duration;
        bond.interest_rate = interest_rate;
        bond.funded = 0;
        bond.status = BondStatus::Open;
        bond.income_proof = income_proof;
        bond.description = description;
        bond.created_at = Clock::get()?.unix_timestamp;
        bond.bond_seed = bond_seed;
        bond.bump = ctx.bumps.bond;
        bond.repayment_type = repayment_type;
        
        // Emit an event for indexing
        emit!(BondCreatedEvent {
            bond: bond.key(),
            freelancer: freelancer.key(),
            amount,
            duration,
            interest_rate,
            repayment_type,
        });
        
        msg!("Bond created successfully");
        Ok(())
    }

    // Invest in a bond
    pub fn invest(ctx: Context<Invest>, amount: u64) -> Result<()> {
        msg!("Investing {} in bond {}", amount, ctx.accounts.bond.key());
        
        let bond = &mut ctx.accounts.bond;
        let investor = &ctx.accounts.investor;
        
        // Check if bond is open for investment
        require!(bond.status == BondStatus::Open, ErrorCode::BondNotOpen);
        
        // Check if investment amount is valid
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(bond.funded + amount <= bond.amount, ErrorCode::BondOverfunded);
        
        msg!("Transferring {} SOL from investor to freelancer", amount);
        
        // Transfer SOL from investor to freelancer
        let transfer_instruction = system_instruction::transfer(
            &investor.key(),
            &bond.freelancer,
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                investor.to_account_info(),
                ctx.accounts.freelancer_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        // Update bond funded amount
        bond.funded += amount;
        
        // Create investment record
        let investment = &mut ctx.accounts.investment;
        investment.investor = investor.key();
        investment.bond = bond.key();
        investment.amount = amount;
        investment.created_at = Clock::get()?.unix_timestamp;
        
        // Check if bond is fully funded
        if bond.funded == bond.amount {
            msg!("Bond is now fully funded");
            bond.status = BondStatus::Funded;
            
            // Create repayment schedule based on repayment type
            if bond.repayment_type == RepaymentType::Installments {
                msg!("Creating installment repayment schedule");
                // Logic to create monthly repayments would go here
                // This would involve creating multiple Repayment accounts
            }
        }
        
        // Emit an event for indexing
        emit!(InvestmentEvent {
            investment: investment.key(),
            bond: bond.key(),
            investor: investor.key(),
            amount,
        });
        
        msg!("Investment completed successfully");
        Ok(())
    }

    // Make a repayment
    pub fn make_repayment(ctx: Context<MakeRepayment>, repayment_id: u64, amount: u64) -> Result<()> {
        msg!("Making repayment of {} for repayment ID {}", amount, repayment_id);
        
        let repayment = &mut ctx.accounts.repayment;
        let bond = &mut ctx.accounts.bond;
        let freelancer = &ctx.accounts.freelancer;
        
        // Check if repayment is pending
        require!(repayment.status == RepaymentStatus::Pending, ErrorCode::RepaymentNotPending);
        
        // Check if amount is correct
        require!(amount == repayment.amount, ErrorCode::InvalidAmount);
        
        msg!("Transferring {} SOL from freelancer to investor", amount);
        
        // Transfer SOL from freelancer to investor
        let transfer_instruction = system_instruction::transfer(
            &freelancer.key(),
            &repayment.investor,
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                freelancer.to_account_info(),
                ctx.accounts.investor_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        // Update repayment status
        repayment.status = RepaymentStatus::Paid;
        repayment.paid_at = Some(Clock::get()?.unix_timestamp);
        
        // Check if all repayments are completed
        // This would require fetching all repayments for this bond and checking their status
        // For simplicity, we'll just update the bond status if this is a lump sum payment
        if bond.repayment_type == RepaymentType::LumpSum {
            bond.status = BondStatus::Completed;
        }
        
        // Emit an event for indexing
        emit!(RepaymentEvent {
            repayment: repayment.key(),
            bond: bond.key(),
            amount,
        });
        
        msg!("Repayment completed successfully");
        Ok(())
    }

    // Create a repayment plan
    pub fn create_repayment_plan(ctx: Context<CreateRepaymentPlan>, installments: u8) -> Result<()> {
        msg!("Creating repayment plan with {} installments for bond {}", 
             installments, ctx.accounts.bond.key());
        
        let bond = &mut ctx.accounts.bond;
        let freelancer = &ctx.accounts.freelancer;
        
        // Ensure the bond is funded
        require!(bond.status == BondStatus::Funded, ErrorCode::BondNotFunded);
        
        // Ensure the freelancer is the owner of the bond
        require!(bond.freelancer == freelancer.key(), ErrorCode::NotBondOwner);
        
        // Ensure the repayment type is installments
        require!(bond.repayment_type == RepaymentType::Installments, ErrorCode::InvalidRepaymentType);
        
        // Ensure the number of installments is valid
        require!(installments > 0 && installments <= bond.duration, ErrorCode::InvalidInstallments);
        
        // Update bond with repayment plan details
        bond.installments = installments;
        bond.status = BondStatus::Repaying;
        
        // Emit an event for the repayment plan
        emit!(RepaymentPlanCreatedEvent {
            bond: bond.key(),
            freelancer: freelancer.key(),
            installments,
        });
        
        msg!("Repayment plan created successfully");
        Ok(())
    }

    // Make a lump sum repayment
    pub fn make_lump_sum_repayment(ctx: Context<MakeLumpSumRepayment>) -> Result<()> {
        msg!("Making lump sum repayment for bond {}", ctx.accounts.bond.key());
        
        let bond = &mut ctx.accounts.bond;
        let freelancer = &ctx.accounts.freelancer;
        
        // Ensure the bond is funded
        require!(bond.status == BondStatus::Funded, ErrorCode::BondNotFunded);
        
        // Ensure the freelancer is the owner of the bond
        require!(bond.freelancer == freelancer.key(), ErrorCode::NotBondOwner);
        
        // Calculate total repayment amount (principal + interest)
        let interest = (bond.amount as u128 * bond.interest_rate as u128 / 100) as u64;
        let total_amount = bond.amount + interest;
        
        msg!("Transferring {} SOL from freelancer to investor", total_amount);
        
        // Get the investor from the first investment (simplified)
        // In a real implementation, you would need to handle multiple investors
        let investment = &ctx.accounts.investment;
        
        // Transfer SOL from freelancer to investor
        let transfer_instruction = system_instruction::transfer(
            &freelancer.key(),
            &investment.investor,
            total_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                freelancer.to_account_info(),
                ctx.accounts.investor_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        // Update bond status
        bond.status = BondStatus::Completed;
        
        // Emit an event for the lump sum repayment
        emit!(LumpSumRepaymentEvent {
            bond: bond.key(),
            freelancer: freelancer.key(),
            amount: total_amount,
        });
        
        msg!("Lump sum repayment completed successfully");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
#[instruction(bond_seed: u64)]
pub struct CreateBond<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    
    #[account(
        init,
        payer = freelancer,
        space = 8 + Bond::SPACE,
        seeds = [b"bond", freelancer.key().as_ref(), &bond_seed.to_le_bytes()],
        bump
    )]
    pub bond: Account<'info, Bond>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Invest<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    
    #[account(mut)]
    pub bond: Account<'info, Bond>,
    
    /// CHECK: This is the freelancer's account that will receive the SOL
    #[account(mut, constraint = freelancer_account.key() == bond.freelancer @ ErrorCode::InvalidFreelancer)]
    pub freelancer_account: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = investor,
        space = 8 + Investment::SPACE
    )]
    pub investment: Account<'info, Investment>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeRepayment<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    
    #[account(
        mut,
        constraint = bond.freelancer == freelancer.key() @ ErrorCode::NotBondOwner
    )]
    pub bond: Account<'info, Bond>,
    
    #[account(
        mut,
        constraint = repayment.bond == bond.key() @ ErrorCode::InvalidRepayment,
    )]
    pub repayment: Account<'info, Repayment>,
    
    /// CHECK: This is the investor's account that will receive the repayment
    #[account(mut, constraint = investor_account.key() == repayment.investor @ ErrorCode::InvalidInvestor)]
    pub investor_account: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateRepaymentPlan<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    
    #[account(
        mut,
        constraint = bond.freelancer == freelancer.key() @ ErrorCode::NotBondOwner
    )]
    pub bond: Account<'info, Bond>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeLumpSumRepayment<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    
    #[account(
        mut,
        constraint = bond.freelancer == freelancer.key() @ ErrorCode::NotBondOwner
    )]
    pub bond: Account<'info, Bond>,
    
    #[account(
        constraint = investment.bond == bond.key() @ ErrorCode::InvalidInvestment,
    )]
    pub investment: Account<'info, Investment>,
    
    /// CHECK: This is the investor's account that will receive the repayment
    #[account(mut, constraint = investor_account.key() == investment.investor @ ErrorCode::InvalidInvestor)]
    pub investor_account: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Bond {
    pub freelancer: Pubkey,
    pub amount: u64,
    pub duration: u8,
    pub interest_rate: u8,
    pub funded: u64,
    pub status: BondStatus,
    pub income_proof: String,
    pub description: String,
    pub created_at: i64,
    pub bond_seed: u64,
    pub bump: u8,
    pub repayment_type: RepaymentType,
    pub installments: u8,
}

impl Bond {
    // More precise space calculation
    pub const SPACE: usize = 
        32 +  // freelancer (Pubkey)
        8 +   // amount (u64)
        1 +   // duration (u8)
        1 +   // interest_rate (u8)
        8 +   // funded (u64)
        1 +   // status (enum - 1 byte for discriminator)
        4 + 200 +  // income_proof (String - 4 bytes for length + max 200 chars)
        4 + 500 +  // description (String - 4 bytes for length + max 500 chars)
        8 +   // created_at (i64)
        8 +   // bond_seed (u64)
        1 +   // bump (u8)
        1 +   // repayment_type (enum - 1 byte for discriminator)
        1 +   // installments (u8)
        32;   // extra padding for safety
}

#[account]
pub struct Investment {
    pub investor: Pubkey,
    pub bond: Pubkey,
    pub amount: u64,
    pub created_at: i64,
}

impl Investment {
    pub const SPACE: usize = 
        32 +  // investor (Pubkey)
        32 +  // bond (Pubkey)
        8 +   // amount (u64)
        8 +   // created_at (i64)
        32;   // extra padding for safety
}

#[account]
pub struct Repayment {
    pub bond: Pubkey,
    pub investor: Pubkey,
    pub amount: u64,
    pub due_date: i64,
    pub status: RepaymentStatus,
    pub created_at: i64,
    pub paid_at: Option<i64>,
    pub installment_number: u8,
}

impl Repayment {
    pub const SPACE: usize = 
        32 +  // bond (Pubkey)
        32 +  // investor (Pubkey)
        8 +   // amount (u64)
        8 +   // due_date (i64)
        1 +   // status (enum - 1 byte for discriminator)
        8 +   // created_at (i64)
        9 +   // paid_at (Option<i64> - 1 byte for Option discriminator + 8 bytes for i64)
        1 +   // installment_number (u8)
        32;   // extra padding for safety
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum BondStatus {
    Open,
    Funded,
    Repaying,
    Completed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum RepaymentStatus {
    Pending,
    Paid,
    Overdue,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum RepaymentType {
    LumpSum,
    Installments,
}

#[event]
pub struct BondCreatedEvent {
    pub bond: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
    pub duration: u8,
    pub interest_rate: u8,
    pub repayment_type: RepaymentType,
}

#[event]
pub struct InvestmentEvent {
    pub investment: Pubkey,
    pub bond: Pubkey,
    pub investor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RepaymentEvent {
    pub repayment: Pubkey,
    pub bond: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RepaymentPlanCreatedEvent {
    pub bond: Pubkey,
    pub freelancer: Pubkey,
    pub installments: u8,
}

#[event]
pub struct LumpSumRepaymentEvent {
    pub bond: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Bond is not open for investment")]
    BondNotOpen,
    #[msg("Bond is not funded")]
    BondNotFunded,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid duration")]
    InvalidDuration,
    #[msg("Invalid interest rate")]
    InvalidInterestRate,
    #[msg("Bond would be overfunded")]
    BondOverfunded,
    #[msg("Repayment is not pending")]
    RepaymentNotPending,
    #[msg("String too long")]
    StringTooLong,
    #[msg("Invalid freelancer account")]
    InvalidFreelancer,
    #[msg("Invalid investor account")]
    InvalidInvestor,
    #[msg("Invalid repayment account")]
    InvalidRepayment,
    #[msg("Invalid investment account")]
    InvalidInvestment,
    #[msg("Not the bond owner")]
    NotBondOwner,
    #[msg("Invalid repayment type")]
    InvalidRepaymentType,
    #[msg("Invalid number of installments")]
    InvalidInstallments,
}
