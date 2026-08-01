#!/bin/bash
# deploy-contracts.sh — Deploy all StakeMind Soroban contracts in dependency order
set -e

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
ADMIN_KEY="${STELLAR_ADMIN_SECRET:-stakemind-admin}"
ADMIN_PUBLIC_KEY="${STELLAR_ADMIN_PUBLIC_KEY:-$(stellar keys address stakemind-admin 2>/dev/null)}"

if [ -z "$ADMIN_PUBLIC_KEY" ]; then
  echo "ERROR: no admin key available. Set STELLAR_ADMIN_SECRET or run:"
  echo "  stellar keys generate stakemind-admin --network testnet"
  exit 1
fi
echo "Using admin: $ADMIN_PUBLIC_KEY (source: $ADMIN_KEY)"

echo "=== Deploying StakeMind contracts to $NETWORK ==="

# 1. Goal Staking (no dependencies)
echo ""
echo "--- [1/3] Goal Staking ---"
GOAL_STAKING_WASM="comeback-contract/target/wasm32-unknown-unknown/release/stakemind_goal_staking.wasm"
GOAL_STAKING_ID=$(stellar contract deploy \
  --wasm "$GOAL_STAKING_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oE 'C[A-Za-z0-9]{55}')
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
GROUP_ESCROW_WASM="comeback-contract/target/wasm32-unknown-unknown/release/stakemind_group_escrow.wasm"
GROUP_ESCROW_ID=$(stellar contract deploy \
  --wasm "$GROUP_ESCROW_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oE 'C[A-Za-z0-9]{55}')
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
MILESTONE_WASM="comeback-contract/target/wasm32-unknown-unknown/release/stakemind_milestone.wasm"
MILESTONE_ID=$(stellar contract deploy \
  --wasm "$MILESTONE_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oE 'C[A-Za-z0-9]{55}')
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
