const anchor = require("@project-serum/anchor")
const { SystemProgram } = anchor.web3
const assert = require("assert")

describe("bytebonds", () => {
  // Configure the client to use the devnet cluster
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Bytebonds

  // Generate keypairs for our test
  const freelancer = anchor.web3.Keypair.generate()
  const investor = anchor.web3.Keypair.generate()

  // Bond account keypair
  const bond = anchor.web3.Keypair.generate()

  // Investment account keypair
  const investment = anchor.web3.Keypair.generate()

  it("Initialize test state", async () => {
    // Airdrop SOL to our test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(freelancer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
    )

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(investor.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
    )
  })

  it("Creates a bond", async () => {
    // Bond parameters
    const amount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL) // 1 SOL
    const duration = 12 // 12 months
    const interestRate = 10 // 10%
    const incomeProof = "https://example.com/income-proof.pdf"
    const description = "Web developer seeking funding for new equipment to increase productivity."

    await program.rpc.createBond(amount, duration, interestRate, incomeProof, description, {
      accounts: {
        freelancer: freelancer.publicKey,
        bond: bond.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [freelancer, bond],
    })

    // Fetch the bond account and verify its data
    const bondAccount = await program.account.bond.fetch(bond.publicKey)
    assert.equal(bondAccount.freelancer.toString(), freelancer.publicKey.toString())
    assert.equal(bondAccount.amount.toString(), amount.toString())
    assert.equal(bondAccount.duration, duration)
    assert.equal(bondAccount.interestRate, interestRate)
    assert.equal(bondAccount.funded.toString(), "0")
    assert.equal(bondAccount.status.open !== undefined, true)
    assert.equal(bondAccount.incomeProof, incomeProof)
    assert.equal(bondAccount.description, description)
  })

  it("Invests in a bond", async () => {
    // Investment amount
    const investmentAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL) // 0.5 SOL

    // Get freelancer's initial balance
    const initialFreelancerBalance = await provider.connection.getBalance(freelancer.publicKey)

    await program.rpc.invest(investmentAmount, {
      accounts: {
        investor: investor.publicKey,
        bond: bond.publicKey,
        freelancerAccount: freelancer.publicKey,
        investment: investment.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [investor, investment],
    })

    // Fetch the bond account and verify its updated data
    const bondAccount = await program.account.bond.fetch(bond.publicKey)
    assert.equal(bondAccount.funded.toString(), investmentAmount.toString())

    // Fetch the investment account and verify its data
    const investmentAccount = await program.account.investment.fetch(investment.publicKey)
    assert.equal(investmentAccount.investor.toString(), investor.publicKey.toString())
    assert.equal(investmentAccount.bond.toString(), bond.publicKey.toString())
    assert.equal(investmentAccount.amount.toString(), investmentAmount.toString())

    // Verify that the freelancer received the SOL
    const finalFreelancerBalance = await provider.connection.getBalance(freelancer.publicKey)
    assert.equal(
      finalFreelancerBalance - initialFreelancerBalance,
      investmentAmount.toNumber(),
      "Freelancer did not receive the correct amount of SOL",
    )
  })
})
