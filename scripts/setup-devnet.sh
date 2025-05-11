#!/bin/bash

# This script sets up the ByteBonds project for local development

# Start the Solana test validator
echo "Starting Solana test validator..."
solana-test-validator --reset &
VALIDATOR_PID=$!

# Wait for validator to start
sleep 5

# Set config to use localhost
echo "Configuring Solana CLI to use localhost..."
solana config set --url localhost

# Build the Anchor program
echo "Building Anchor program..."
anchor build

# Deploy the program to localhost
echo "Deploying program to localhost..."
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

echo "Setup complete! The ByteBonds program is now deployed to your local Solana validator."
echo "Program ID: $PROGRAM_ID"
echo ""
echo "To run tests: anchor test"
echo "To stop the validator: kill $VALIDATOR_PID"
