#!/bin/bash
# deploy-contracts.sh — Deploy all StakeMind Soroban contracts in dependency order
set -e

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
ADMIN_KEY="${STELLAR_ADMIN_SECRET}"
ADMIN_PUBLIC_KEY="${STELLAR_ADMIN_PUBLIC_KEY}"

if [ -z "$ADMIN_KEY" ]; then
  echo "ERROR: STELLAR_ADMIN_SECRET not set"
  exit 1
fi

echo "=== Deploying StakeMind contracts to $NETWORK ==="

# 1. Goal Staking (no dependencies)
echo ""
echo "--- [1/3] Goal Staking ---"
GOAL_STAKING_WASM="comeback-contract/target/wasm32-unknown-unknown/release/goal_staking.wasm"
GOAL_STAKING_ID=$(stellar contract deploy \
  --wasm "$GOAL_STAKING_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oP 'C\w{55}')
echo "GoalStakingContract: $GOAL_STAKING_ID"

stellar contract invoke \
  --id "$GOAL_STAKING_ID" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  -- initialize --admin "$ADMIN_PUBLIC_KEY"

# 2. Group Escrow (receives forfeited stakes from GoalStaking)
echo ""
echo "--- [2/3] Group Escrow ---"
GROUP_ESCROW_WASM="comeback-contract/target/wasm32-unknown-unknown/release/group_escrow.wasm"
GROUP_ESCROW_ID=$(stellar contract deploy \
  --wasm "$GROUP_ESCROW_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oP 'C\w{55}')
echo "GroupEscrowContract: $GROUP_ESCROW_ID"

stellar contract invoke \
  --id "$GROUP_ESCROW_ID" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  -- initialize --admin "$ADMIN_PUBLIC_KEY"

# 3. Milestone (independent)
echo ""
echo "--- [3/3] Milestone ---"
MILESTONE_WASM="comeback-contract/target/wasm32-unknown-unknown/release/milestone.wasm"
MILESTONE_ID=$(stellar contract deploy \
  --wasm "$MILESTONE_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oP 'C\w{55}')
echo "MilestoneContract: $MILESTONE_ID"

stellar contract invoke \
  --id "$MILESTONE_ID" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  -- initialize --admin "$ADMIN_PUBLIC_KEY"

echo ""
echo "=============================================="
echo "  StakeMind Contract Deployment Complete"
echo "=============================================="
echo ""
echo "GoalStakingContract:  $GOAL_STAKING_ID"
echo "GroupEscrowContract:  $GROUP_ESCROW_ID"
echo "MilestoneContract:    $MILESTONE_ID"
echo ""
echo "Add these to your .env.local:"
echo "  GOAL_STAKING_CONTRACT_ID=$GOAL_STAKING_ID"
echo "  GROUP_ESCROW_CONTRACT_ID=$GROUP_ESCROW_ID"
echo "  MILESTONE_CONTRACT_ID=$MILESTONE_ID"
echo ""
echo "Verify on Stellar Expert:"
echo "  https://stellar.expert/explorer/testnet/contract/$GOAL_STAKING_ID"
echo "  https://stellar.expert/explorer/testnet/contract/$GROUP_ESCROW_ID"
echo "  https://stellar.expert/explorer/testnet/contract/$MILESTONE_ID"
