# Prediction Market - Usage Guide

## Quick Start

### 1. Deploy the System
```bash
# Start local Hardhat node
npx hardhat node

# Deploy contracts (in another terminal)
npx hardhat run scripts/deploy.js --network localhost

# Run interactive mode
npx hardhat run scripts/interactive.js --network localhost
```

### 2. Initial Setup (Required Before Trading)

**Option A: Quick Setup (Recommended)**
1. Run interactive script
2. Select option `10` - "Quick Setup (Pre-fund Pool)"
3. This automatically pre-funds the pool with 5000 GREEN, 5000 RED, and 10000 USDT

**Option B: Manual Setup**
1. Select option `8` - "Liquidity Provider Menu"
2. Select option `1` - "Register as Liquidity Provider" (for deployer)
3. Select option `2` - "Pre-fund Pool" (owner only)
4. Enter amounts for GREEN tokens, RED tokens, and USDT

### 3. Trading Operations

**Buy Tokens (Place Bet)**
1. Select option `4` - "Place Bet (Buy Tokens)"
2. Choose outcome (1=Green, 2=Red)
3. Select account and amount
4. Tokens are purchased from the liquidity pool

**Sell Tokens**
1. Select option `5` - "Sell Tokens"
2. Choose token type to sell
3. Select account and amount
4. Tokens are sold back to the liquidity pool for USDT

### 4. Market Resolution

**Resolve Market**
1. Select option `6` - "Resolve Market"
2. Choose winner (1=Green, 2=Red)
3. Market must be ended (time-based)

**Redeem Winning Tokens**
1. Select option `7` - "Redeem Tokens"
2. Select account with winning tokens
3. Receive USDT payout proportional to winnings

## Key Features

### Liquidity Provider System
- **Role-based Access**: Only registered LPs can add liquidity
- **Multi-token Pools**: Support for GREEN + RED + USDT
- **LP Tokens**: Providers receive LP tokens representing their share
- **Fees**: 0.3% trading fee on all swaps

### Automated Market Making
- **Dynamic Pricing**: Prices based on pool reserves
- **Continuous Trading**: Buy/sell anytime before resolution
- **Slippage Protection**: Built-in fee mechanism

### Pool Status Monitoring
- **Real-time Reserves**: View current token reserves
- **Trading Activity**: Track pool utilization
- **LP Balances**: Monitor provider positions

## Common Issues & Solutions

### "Insufficient token A reserve"
**Cause**: Pool doesn't have enough outcome tokens for buying
**Solution**: Pre-fund the pool first (option 10)

### "Insufficient stablecoin reserve" 
**Cause**: Pool doesn't have enough USDT for selling
**Solution**: Add more liquidity to the pool

### "Not a liquidity provider"
**Cause**: Trying to add liquidity without registration
**Solution**: Register as LP first (option 8 → option 1)

## Testing

### Complete Test Scenario
1. Select option `9` - "Test Complete Scenario"
2. Watches full workflow: funding → betting → resolution → redemption
3. Demonstrates all system features

### Manual Testing Steps
1. Quick setup (option 10)
2. Mint USDT for users (option 3)
3. View market info (option 1) - check pool status
4. Place bets (option 4) - test buying
5. Sell tokens (option 5) - test selling
6. Resolve market (option 6) - end betting
7. Redeem tokens (option 7) - claim winnings

## Contract Addresses (Localhost)
- **PredictionMarket**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **MockStablecoin (USDT)**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **MockOracle**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`

## Account Structure
- **deployer**: Market owner, can pre-fund pool
- **user1/user2/user3**: Regular users for trading
- **alice/bob/charlie**: Alternative names for user1/2/3

## Fee Structure
- **Trading Fee**: 0.3% on all swaps
- **No Deposit/Withdrawal Fees**: Free to add/remove liquidity
- **LP Rewards**: Earn from trading fees (proportional to LP share)

## Security Features
- **Role-based Access Control**: LP functions restricted
- **Reentrancy Protection**: All critical functions protected
- **Ownership Controls**: Owner-only functions for setup
- **Time-based Market Resolution**: Markets run for fixed periods
