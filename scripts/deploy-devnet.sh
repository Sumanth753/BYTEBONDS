#!/bin/bash

# This script deploys the ByteBonds program to Solana devnet

# Set config to use devnet
echo "Configuring Solana CLI to use devnet..."
solana config set --url devnet

# Check if we have enough SOL for deployment
BALANCE=$(solana balance | grep -o '[0-9.]*')
if (( $(echo "$BALANCE < 2" | bc -l) )); then
  echo "Insufficient balance for deployment. Requesting airdrop..."
  solana airdrop 2
  sleep 5
fi

# Build the Anchor program
echo "Building Anchor program..."
anchor build

# Deploy the program to devnet
echo "Deploying program to devnet..."
anchor deploy

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/bytebonds-keypair.json)
echo "Program deployed with ID: $PROGRAM_ID"

# Update the program ID in lib.rs and Anchor.toml
echo "Updating program ID in source files..."
sed -i "s/declare_id!(\"[^\"]*\")/declare_id!(\"$PROGRAM_ID\")/g" programs/bytebonds/src/lib.rs
sed -i "s/bytebonds = \"[^\"]*\"/bytebonds = \"$PROGRAM_ID\"/g" Anchor.toml

# Build again with the updated program ID
echo "Rebuilding with updated program ID..."
anchor build

# Deploy again with the updated program ID
echo "Redeploying program..."
anchor deploy

echo "Deployment complete! The ByteBonds program is now deployed to Solana devnet."
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Next steps:"
echo "1. Update the PROGRAM_ID in lib/program.ts with the new program ID"
echo "2. Build and deploy the frontend"
