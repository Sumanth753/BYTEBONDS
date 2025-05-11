# ByteBonds - Production-Ready Solana dApp

ByteBonds is a decentralized finance (DeFi) application built on Solana that connects freelancers with inconsistent income to investors who provide upfront capital in exchange for future earnings.

## Features

- **Solana Devnet Integration**: Fully functional on Solana's devnet for testing before mainnet deployment
- **Phantom Wallet Support**: Seamless integration with Phantom wallet
- **Bond Creation**: Freelancers can create bonds with customizable parameters
- **Investment System**: Investors can browse and purchase bonds using SOL
- **Repayment Tracking**: Track and manage bond repayments

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Solana CLI tools
- Anchor framework
- Phantom wallet browser extension

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/bytebonds.git
cd bytebonds
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
yarn install
\`\`\`

3. Set up your Solana wallet:
\`\`\`bash
solana-keygen new
\`\`\`

### Deploying the Smart Contract

1. Deploy the Anchor program to Solana devnet:
\`\`\`bash
./scripts/deploy-devnet.sh
\`\`\`

2. Update the `PROGRAM_ID` in `lib/program.ts` with the new program ID from the deployment.

### Running the Frontend

1. Start the development server:
\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

2. Open your browser and navigate to `http://localhost:3000`

## Smart Contract

The ByteBonds smart contract is built using the Anchor framework and includes the following main functions:

- `create_bond` - Create a new bond as a freelancer
- `invest` - Invest in a bond as an investor
- `make_repayment` - Make a repayment on a bond as a freelancer

## Testing

To run tests for the smart contract:

\`\`\`bash
anchor test
\`\`\`

## Deployment

To deploy the frontend to production:

\`\`\`bash
npm run build
npm run start
# or
yarn build
yarn start
\`\`\`

## Getting Devnet SOL

To get SOL on devnet for testing:

\`\`\`bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
\`\`\`

## License

This project is licensed under the MIT License - see the LICENSE file for details.
