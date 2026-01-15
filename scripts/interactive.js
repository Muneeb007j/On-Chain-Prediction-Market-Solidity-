const { ethers } = require("hardhat");
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => readline.question(query, resolve));

async function main() {
  console.log("🏎️  Race Prediction Market - Interactive Mode");
  console.log("============================================\n");
  
  // Load contracts
  const addresses = {
    stablecoin: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    market: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    oracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  };
  
  const [deployer, user1, user2, user3] = await ethers.getSigners();
  const accounts = {
    deployer,
    user1,
    user2,
    user3,
    alice: user1,
    bob: user2,
    charlie: user3
  };
  
  // Connect to contracts
  const Stablecoin = await ethers.getContractFactory("MockStablecoin");
  const stablecoin = await Stablecoin.attach(addresses.stablecoin);
  
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.attach(addresses.market);
  
  const MockOracle = await ethers.getContractFactory("MockOracle");
  const oracle = await MockOracle.attach(addresses.oracle);
  
  const marketInfo = await market.getMarketInfo();
  const GreenToken = await ethers.getContractFactory("OutcomeToken");
  const greenToken = await GreenToken.attach(marketInfo.greenToken);
  const RedToken = await ethers.getContractFactory("OutcomeToken");
  const redToken = await RedToken.attach(marketInfo.redToken);
  
  let running = true;
  
  while (running) {
    console.log("\n📋 MAIN MENU");
    console.log("1. View Market Info");
    console.log("2. View Account Balances");
    console.log("3. Mint Stablecoins");
    console.log("4. Place Bet (Buy Tokens)");
    console.log("5. Sell Tokens");
    console.log("6. Resolve Market");
    console.log("7. Redeem Tokens");
    console.log("8. Liquidity Provider Menu");
    console.log("9. Test Complete Scenario");
    console.log("10. Quick Setup (Pre-fund Pool)");
    console.log("11. Exit");
    
    const choice = await question("\nSelect option (1-11): ");
    
    switch (choice) {
      case '1':
        await showMarketInfo(market, marketInfo);
        break;
      case '2':
        await showBalances(stablecoin, greenToken, redToken, accounts);
        break;
      case '3':
        await mintStablecoins(stablecoin, accounts);
        break;
      case '4':
        await placeBet(market, stablecoin, greenToken, redToken, marketInfo, accounts);
        break;
      case '5':
        await sellTokens(market, stablecoin, greenToken, redToken, marketInfo, accounts);
        break;
      case '6':
        await resolveMarket(oracle, market, deployer);
        break;
      case '7':
        await redeemTokens(market, greenToken, redToken, marketInfo, accounts);
        break;
      case '8':
        await liquidityProviderMenu(market, stablecoin, greenToken, redToken, marketInfo, accounts);
        break;
      case '9':
        await runCompleteScenario(market, stablecoin, oracle, greenToken, redToken, marketInfo, accounts);
        break;
      case '10':
        await quickSetup(market, stablecoin, deployer);
        break;
      case '11':
        running = false;
        console.log("Goodbye!");
        break;
      default:
        console.log("Invalid choice");
    }
  }
  
  readline.close();
}

async function showMarketInfo(market, marketInfo) {
  console.log("\n📊 MARKET INFORMATION");
  console.log("===================");
  console.log("Green Token:", marketInfo.greenToken);
  console.log("Red Token:", marketInfo.redToken);
  console.log("Liquidity Pool:", marketInfo.pool);
  console.log("Market Status:", marketInfo.resolved ? "RESOLVED" : "ACTIVE");
  console.log("Outcome:", marketInfo.outcome === 0 ? "PENDING" : marketInfo.outcome === 1 ? "GREEN_WINS" : "RED_WINS");
  console.log("Total Prize Pool:", ethers.utils.formatEther(marketInfo.totalStablecoin), "USDT");
  console.log("End Time:", new Date(marketInfo.endTime.toNumber() * 1000).toLocaleString());
  
  const timeRemaining = await market.getTimeRemaining();
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  console.log(`Time Remaining: ${hours}h ${minutes}m`);
  
  // Get token supplies
  const GreenToken = await ethers.getContractFactory("OutcomeToken");
  const greenToken = await GreenToken.attach(marketInfo.greenToken);
  const RedToken = await ethers.getContractFactory("OutcomeToken");
  const redToken = await RedToken.attach(marketInfo.redToken);
  
  const greenSupply = await greenToken.totalSupply();
  const redSupply = await redToken.totalSupply();
  
  console.log("Green Token Supply:", ethers.utils.formatEther(greenSupply));
  console.log("Red Token Supply:", ethers.utils.formatEther(redSupply));
  
  // Show liquidity pool information
  try {
    const poolInfo = await market.getLiquidityPoolInfo();
    console.log("\n💧 LIQUIDITY POOL STATUS:");
    console.log("========================");
    console.log("Green Token Reserve:", ethers.utils.formatEther(poolInfo.reserveA));
    console.log("Red Token Reserve:", ethers.utils.formatEther(poolInfo.reserveB));
    console.log("USDT Reserve:", ethers.utils.formatEther(poolInfo.reserveStablecoin));
    console.log("Total LP Supply:", ethers.utils.formatEther(poolInfo.totalLPSupply));
    console.log("Trading Fee:", (poolInfo.feeBPS / 100).toFixed(2) + "%");
    
    if (poolInfo.reserveA.eq(0) && poolInfo.reserveB.eq(0) && poolInfo.reserveStablecoin.eq(0)) {
      console.log("\n⚠️  POOL IS EMPTY!");
      console.log("   The pool needs to be pre-funded before trading can occur.");
      console.log("   Go to 'Liquidity Provider Menu' (option 8) → 'Pre-fund Pool' (option 2)");
    } else {
      console.log("\n✅ Pool is ready for trading!");
    }
  } catch (error) {
    console.log("\n❌ Could not fetch pool information");
  }
  
  if (greenSupply > 0 && redSupply > 0) {
    const greenOdds = (parseFloat(ethers.utils.formatEther(marketInfo.totalStablecoin)) / parseFloat(ethers.utils.formatEther(greenSupply))).toFixed(2);
    const redOdds = (parseFloat(ethers.utils.formatEther(marketInfo.totalStablecoin)) / parseFloat(ethers.utils.formatEther(redSupply))).toFixed(2);
    console.log(`\n📈 Current Odds:`);
    console.log(`Green Car: 1 : ${greenOdds}`);
    console.log(`Red Car: 1 : ${redOdds}`);
  }
}

async function showBalances(stablecoin, greenToken, redToken, accounts) {
  console.log("\n💰 ACCOUNT BALANCES");
  console.log("==================");
  
  for (const [name, account] of Object.entries(accounts)) {
    const usdt = await stablecoin.balanceOf(account.address);
    const green = await greenToken.balanceOf(account.address);
    const red = await redToken.balanceOf(account.address);
    
    console.log(`\n${name.toUpperCase()} (${account.address.substring(0, 6)}...):`);
    console.log(`  USDT: ${ethers.utils.formatEther(usdt)}`);
    console.log(`  Green Tokens: ${ethers.utils.formatEther(green)}`);
    console.log(`  Red Tokens: ${ethers.utils.formatEther(red)}`);
  }
}

async function mintStablecoins(stablecoin, accounts) {
  console.log("\nAvailable accounts:");
  Object.entries(accounts).forEach(([name, acc], i) => {
    console.log(`${i + 1}. ${name} (${acc.address.substring(0, 6)}...)`);
  });
  
  const accountChoice = await question("\nSelect account (name): ");
  const account = accounts[accountChoice];
  
  if (!account) {
    console.log("Invalid account");
    return;
  }
  
  const amount = await question("Amount to mint (USDT): ");
  
  await stablecoin.mint(account.address, ethers.utils.parseEther(amount));
  console.log(`✅ Minted ${amount} USDT to ${accountChoice}`);
}

async function placeBet(market, stablecoin, greenToken, redToken, marketInfo, accounts) {
  console.log("\n🎯 PLACE A BET");
  console.log("1. Green Car Wins");
  console.log("2. Red Car Wins");
  
  const betChoice = await question("\nSelect outcome (1-2): ");
  const outcome = betChoice === '1' ? 'green' : 'red';
  const tokenAddress = outcome === 'green' ? marketInfo.greenToken : marketInfo.redToken;
  
  console.log("\nAvailable accounts:");
  Object.entries(accounts).forEach(([name, acc], i) => {
    console.log(`${i + 1}. ${name} (${acc.address.substring(0, 6)}...)`);
  });
  
  const accountChoice = await question("\nSelect account (name): ");
  const account = accounts[accountChoice];
  
  if (!account) {
    console.log("Invalid account");
    return;
  }
  
  const amount = await question("Amount to bet (USDT): ");
  
  // Check balance
  const balance = await stablecoin.balanceOf(account.address);
  if (balance.lt(ethers.utils.parseEther(amount))) {
    console.log("❌ Insufficient USDT balance");
    return;
  }
  
  // Approve and buy
  console.log("Approving...");
  await stablecoin.connect(account).approve(market.address, ethers.utils.parseEther(amount));
  
  console.log("Placing bet...");
  try {
    await market.connect(account).buyTokens(tokenAddress, ethers.utils.parseEther(amount));
    console.log(`✅ ${accountChoice} bet ${amount} USDT on ${outcome} car!`);
    
    // Show new token balance
    const token = outcome === 'green' ? greenToken : redToken;
    const tokenBalance = await token.balanceOf(account.address);
    console.log(`New ${outcome} token balance: ${ethers.utils.formatEther(tokenBalance)}`);
  } catch (error) {
    if (error.message.includes("Insufficient token reserve")) {
      console.log("❌ Error: Insufficient liquidity in the pool!");
      console.log("💡 Solution: The pool needs to be pre-funded first.");
      console.log("   Go to 'Liquidity Provider Menu' (option 8) and select 'Pre-fund Pool' (option 2)");
      console.log("   The owner (deployer) can pre-fund the pool with tokens.");
    } else {
      console.log("❌ Error:", error.message);
    }
  }
}

async function sellTokens(market, stablecoin, greenToken, redToken, marketInfo, accounts) {
  console.log("\n💰 SELL TOKENS");
  console.log("1. Sell Green Tokens");
  console.log("2. Sell Red Tokens");
  
  const tokenChoice = await question("\nSelect token (1-2): ");
  const tokenType = tokenChoice === '1' ? 'green' : 'red';
  const tokenAddress = tokenType === 'green' ? marketInfo.greenToken : marketInfo.redToken;
  const token = tokenType === 'green' ? greenToken : redToken;
  
  console.log("\nAvailable accounts:");
  Object.entries(accounts).forEach(([name, acc], i) => {
    console.log(`${i + 1}. ${name} (${acc.address.substring(0, 6)}...)`);
  });
  
  const accountChoice = await question("\nSelect account (name): ");
  const account = accounts[accountChoice];
  
  if (!account) {
    console.log("Invalid account");
    return;
  }
  
  // Check token balance
  const balance = await token.balanceOf(account.address);
  console.log(`Current ${tokenType} token balance: ${ethers.utils.formatEther(balance)}`);
  
  const amount = await question("Amount to sell: ");
  const sellAmount = ethers.utils.parseEther(amount);
  
  if (balance.lt(sellAmount)) {
    console.log("❌ Insufficient token balance");
    return;
  }
  
  // Approve and sell
  console.log("Approving...");
  await token.connect(account).approve(market.address, sellAmount);
  
  console.log("Selling tokens...");
  try {
    const tx = await market.connect(account).sellTokens(tokenAddress, sellAmount);
    const receipt = await tx.wait();
    
    // Get stablecoin received from event
    const event = receipt.events?.find(e => e.event === 'TokensSold');
    console.log(`✅ Sold ${amount} ${tokenType} tokens!`);
    
    // Show new stablecoin balance
    const newBalance = await stablecoin.balanceOf(account.address);
    console.log(`New USDT balance: ${ethers.utils.formatEther(newBalance)}`);
  } catch (error) {
    if (error.message.includes("Insufficient")) {
      console.log("❌ Error: Insufficient liquidity in the pool!");
      console.log("💡 Solution: The pool needs more stablecoin reserves for selling.");
      console.log("   Go to 'Liquidity Provider Menu' (option 8) to add more liquidity.");
    } else {
      console.log("❌ Error:", error.message);
    }
  }
}

async function resolveMarket(oracle, market, deployer) {
  console.log("\n🏁 RESOLVE MARKET");
  console.log("1. Green Car Wins");
  console.log("2. Red Car Wins");
  
  const outcome = await question("\nSelect winner (1-2): ");
  
  // Check if market has ended
  const marketInfo = await market.getMarketInfo();
  const currentTime = Math.floor(Date.now() / 1000);
  
  if (currentTime < marketInfo.endTime) {
    console.log("⚠️  Market hasn't ended yet!");
    const confirm = await question("Force resolve anyway? (yes/no): ");
    if (confirm.toLowerCase() !== 'yes') {
      console.log("Resolution cancelled");
      return;
    }
  }
  
  console.log("Resolving market...");
  await oracle.connect(deployer).resolveRace(market.address, parseInt(outcome));
  
  const winner = outcome === '1' ? "GREEN CAR" : "RED CAR";
  console.log(`✅ Market resolved! ${winner} WINS!`);
}

async function redeemTokens(market, greenToken, redToken, marketInfo, accounts) {
  console.log("\n💸 REDEEM TOKENS");
  
  console.log("\nAvailable accounts:");
  Object.entries(accounts).forEach(([name, acc], i) => {
    console.log(`${i + 1}. ${name} (${acc.address.substring(0, 6)}...)`);
  });
  
  const accountChoice = await question("\nSelect account (name): ");
  const account = accounts[accountChoice];
  
  if (!account) {
    console.log("Invalid account");
    return;
  }
  
  // Check which tokens they have
  const greenBalance = await greenToken.balanceOf(account.address);
  const redBalance = await redToken.balanceOf(account.address);
  
  console.log(`Green tokens: ${ethers.utils.formatEther(greenBalance)}`);
  console.log(`Red tokens: ${ethers.utils.formatEther(redBalance)}`);
  
  // Check market status
  const marketStatus = await market.getMarketInfo();
  
  if (!marketStatus.resolved) {
    console.log("❌ Market not resolved yet!");
    return;
  }
  
  let tokenToRedeem;
  if (marketStatus.outcome === 1 && greenBalance.gt(0)) {
    tokenToRedeem = { type: 'green', address: marketInfo.greenToken, balance: greenBalance, contract: greenToken };
  } else if (marketStatus.outcome === 2 && redBalance.gt(0)) {
    tokenToRedeem = { type: 'red', address: marketInfo.redToken, balance: redBalance, contract: redToken };
  } else {
    console.log("❌ No winning tokens to redeem");
    return;
  }
  
  console.log(`\nYou have ${ethers.utils.formatEther(tokenToRedeem.balance)} winning ${tokenToRedeem.type} tokens`);
  
  // Calculate payout
  const payout = await market.calculatePayout(tokenToRedeem.balance, tokenToRedeem.address);
  console.log(`Expected payout: ${ethers.utils.formatEther(payout)} USDT`);
  
  const confirm = await question("\nRedeem tokens? (yes/no): ");
  if (confirm.toLowerCase() !== 'yes') {
    console.log("Redemption cancelled");
    return;
  }
  
  // Check current USDT balance before redemption
  const stablecoin = await ethers.getContractFactory("MockStablecoin");
  const usdt = await stablecoin.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const balanceBefore = await usdt.balanceOf(account.address);
  console.log(`USDT balance before: ${ethers.utils.formatEther(balanceBefore)}`);
  
  // Approve and redeem
  await tokenToRedeem.contract.connect(account).approve(market.address, tokenToRedeem.balance);
  
  console.log("Redeeming...");
  const tx = await market.connect(account).redeemTokens(tokenToRedeem.address);
  const receipt = await tx.wait();
  
  // Get the payout amount from the event
  const event = receipt.events?.find(e => e.event === 'TokensRedeemed');
  const payoutReceived = event ? event.args.amount : payout;
  
  // Check new USDT balance
  const balanceAfter = await usdt.balanceOf(account.address);
  
  console.log(`✅ Received ${ethers.utils.formatEther(payoutReceived)} USDT!`);
  console.log(`New USDT balance: ${ethers.utils.formatEther(balanceAfter)}`);
}

async function liquidityProviderMenu(market, stablecoin, greenToken, redToken, marketInfo, accounts) {
  while (true) {
    console.log("\n💧 LIQUIDITY PROVIDER MENU");
    console.log("1. Register as Liquidity Provider");
    console.log("2. Pre-fund Pool (Owner only)");
    console.log("3. Add Liquidity");
    console.log("4. View Pool Info");
    console.log("5. View LP Balance");
    console.log("6. Back to Main Menu");
    
    const choice = await question("\nSelect option (1-6): ");
    
    switch (choice) {
      case '1':
        await registerLP(market, accounts);
        break;
      case '2':
        await preFundPool(market, stablecoin, greenToken, redToken, accounts);
        break;
      case '3':
        await addLiquidity(market, stablecoin, greenToken, redToken, accounts);
        break;
      case '4':
        await showPoolInfo(market);
        break;
      case '5':
        await showLPBalance(market, accounts);
        break;
      case '6':
        return;
      default:
        console.log("Invalid choice");
    }
  }
}

async function registerLP(market, accounts) {
  console.log("\n📝 REGISTER AS LIQUIDITY PROVIDER");
  
  console.log("Available accounts:");
  Object.entries(accounts).forEach(([name, acc], i) => {
    console.log(`${i + 1}. ${name} (${acc.address.substring(0, 6)}...)`);
  });
  
  const accountChoice = await question("\nSelect account (name): ");
  const account = accounts[accountChoice];
  
  if (!account) {
    console.log("Invalid account");
    return;
  }
  
  try {
    await market.connect(account).registerLiquidityProvider();
    console.log(`✅ ${accountChoice} registered as Liquidity Provider!`);
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function preFundPool(market, stablecoin, greenToken, redToken, accounts) {
  console.log("\n💰 PRE-FUND POOL (OWNER ONLY)");
  
  const amountA = await question("Amount of Green Tokens to pre-fund: ");
  const amountB = await question("Amount of Red Tokens to pre-fund: ");
  const amountStable = await question("Amount of USDT to pre-fund: ");
  
  try {
    // Approve tokens first
    await stablecoin.connect(accounts.deployer).approve(market.address, ethers.utils.parseEther(amountStable));
    
    console.log("Pre-funding pool...");
    await market.connect(accounts.deployer).preFundLiquidityPool(
      ethers.utils.parseEther(amountA),
      ethers.utils.parseEther(amountB),
      ethers.utils.parseEther(amountStable)
    );
    
    console.log(`✅ Pool pre-funded with ${amountA} GREEN, ${amountB} RED, ${amountStable} USDT!`);
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function addLiquidity(market, stablecoin, greenToken, redToken, accounts) {
  console.log("\n💧 ADD LIQUIDITY");
  
  console.log("Available accounts:");
  Object.entries(accounts).forEach(([name, acc], i) => {
    console.log(`${i + 1}. ${name} (${acc.address.substring(0, 6)}...)`);
  });
  
  const accountChoice = await question("\nSelect account (name): ");
  const account = accounts[accountChoice];
  
  if (!account) {
    console.log("Invalid account");
    return;
  }
  
  // Check if registered LP
  const isLP = await market.isLiquidityProvider(account.address);
  if (!isLP) {
    console.log("❌ Account is not registered as Liquidity Provider");
    return;
  }
  
  const amountA = await question("Amount of Green Tokens to add: ");
  const amountB = await question("Amount of Red Tokens to add: ");
  const amountStable = await question("Amount of USDT to add: ");
  
  try {
    // Check balances
    const greenBalance = await greenToken.balanceOf(account.address);
    const redBalance = await redToken.balanceOf(account.address);
    const stableBalance = await stablecoin.balanceOf(account.address);
    
    if (greenBalance.lt(ethers.utils.parseEther(amountA))) {
      console.log("❌ Insufficient Green Token balance");
      return;
    }
    if (redBalance.lt(ethers.utils.parseEther(amountB))) {
      console.log("❌ Insufficient Red Token balance");
      return;
    }
    if (stableBalance.lt(ethers.utils.parseEther(amountStable))) {
      console.log("❌ Insufficient USDT balance");
      return;
    }
    
    // Approve tokens
    await greenToken.connect(account).approve(market.address, ethers.utils.parseEther(amountA));
    await redToken.connect(account).approve(market.address, ethers.utils.parseEther(amountB));
    await stablecoin.connect(account).approve(market.address, ethers.utils.parseEther(amountStable));
    
    console.log("Adding liquidity...");
    await market.connect(account).provideLiquidity(
      ethers.utils.parseEther(amountA),
      ethers.utils.parseEther(amountB),
      ethers.utils.parseEther(amountStable)
    );
    
    console.log(`✅ Added liquidity: ${amountA} GREEN, ${amountB} RED, ${amountStable} USDT!`);
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function showPoolInfo(market) {
  console.log("\n📊 POOL INFORMATION");
  console.log("==================");
  
  try {
    const poolInfo = await market.getLiquidityPoolInfo();
    console.log("Green Token Reserve:", ethers.utils.formatEther(poolInfo.reserveA));
    console.log("Red Token Reserve:", ethers.utils.formatEther(poolInfo.reserveB));
    console.log("USDT Reserve:", ethers.utils.formatEther(poolInfo.reserveStablecoin));
    console.log("Total LP Supply:", ethers.utils.formatEther(poolInfo.totalLPSupply));
    console.log("Fee:", (poolInfo.feeBPS / 100).toFixed(2) + "%");
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function showLPBalance(market, accounts) {
  console.log("\n💰 LP BALANCES");
  console.log("===============");
  
  console.log("Available accounts:");
  Object.entries(accounts).forEach(([name, acc], i) => {
    console.log(`${i + 1}. ${name} (${acc.address.substring(0, 6)}...)`);
  });
  
  const accountChoice = await question("\nSelect account (name): ");
  const account = accounts[accountChoice];
  
  if (!account) {
    console.log("Invalid account");
    return;
  }
  
  try {
    const isLP = await market.isLiquidityProvider(account.address);
    if (!isLP) {
      console.log("❌ Account is not registered as Liquidity Provider");
      return;
    }
    
    const lpBalance = await market.getLPBalance(account.address);
    console.log(`LP Token Balance: ${ethers.utils.formatEther(lpBalance)}`);
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function quickSetup(market, stablecoin, deployer) {
  console.log("\n🚀 QUICK SETUP - Pre-fund Liquidity Pool");
  console.log("==========================================");
  
  try {
    // Check deployer's USDT balance
    const deployerBalance = await stablecoin.balanceOf(deployer.address);
    console.log(`Deployer USDT balance: ${ethers.utils.formatEther(deployerBalance)}`);
    
    if (deployerBalance.lt(ethers.utils.parseEther("10000"))) {
      console.log("❌ Insufficient USDT balance for pre-funding!");
      console.log("Minting 10000 USDT to deployer...");
      await stablecoin.mint(deployer.address, ethers.utils.parseEther("10000"));
    }
    
    // Pre-fund amounts
    const greenAmount = ethers.utils.parseEther("5000");
    const redAmount = ethers.utils.parseEther("5000");
    const stableAmount = ethers.utils.parseEther("10000");
    
    console.log("Pre-funding pool with:");
    console.log(`- Green Tokens: ${ethers.utils.formatEther(greenAmount)}`);
    console.log(`- Red Tokens: ${ethers.utils.formatEther(redAmount)}`);
    console.log(`- USDT: ${ethers.utils.formatEther(stableAmount)}`);
    
    // Approve and pre-fund
    await stablecoin.connect(deployer).approve(market.address, stableAmount);
    
    console.log("Approving tokens...");
    console.log("Pre-funding pool...");
    
    await market.connect(deployer).preFundLiquidityPool(greenAmount, redAmount, stableAmount);
    
    console.log("✅ Pool successfully pre-funded!");
    console.log("\n🎉 Ready for trading!");
    console.log("You can now:");
    console.log("- Buy tokens (option 4)");
    console.log("- Sell tokens (option 5)");
    console.log("- View pool status (option 1)");
    
  } catch (error) {
    console.log("❌ Error during setup:", error.message);
  }
}

async function runCompleteScenario(market, stablecoin, oracle, greenToken, redToken, marketInfo, accounts) {
  console.log("\n🎬 RUNNING COMPLETE SCENARIO");
  console.log("===========================\n");
  
  const { alice, bob, deployer } = accounts;
  
  console.log("1. Minting stablecoins...");
  await stablecoin.mint(alice.address, ethers.utils.parseEther("1000"));
  await stablecoin.mint(bob.address, ethers.utils.parseEther("1000"));
  console.log("   ✅ Minted 1000 USDT to Alice and Bob\n");
  
  console.log("2. Alice bets 100 USDT on Green...");
  await stablecoin.connect(alice).approve(market.address, ethers.utils.parseEther("100"));
  await market.connect(alice).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"));
  console.log("   ✅ Alice bought 100 green tokens\n");
  
  console.log("3. Bob bets 200 USDT on Red...");
  await stablecoin.connect(bob).approve(market.address, ethers.utils.parseEther("200"));
  await market.connect(bob).buyTokens(marketInfo.redToken, ethers.utils.parseEther("200"));
  console.log("   ✅ Bob bought 200 red tokens\n");
  
  console.log("4. Checking market status...");
  const info = await market.getMarketInfo();
  console.log(`   Total Pool: ${ethers.utils.formatEther(info.totalStablecoin)} USDT`);
  console.log(`   Green Supply: ${ethers.utils.formatEther(await greenToken.totalSupply())}`);
  console.log(`   Red Supply: ${ethers.utils.formatEther(await redToken.totalSupply())}\n`);
  
  console.log("5. Fast forwarding time...");
  await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
  await ethers.provider.send("evm_mine");
  console.log("   ✅ Time forwarded 8 days\n");
  
  console.log("6. Resolving market (Green wins!)...");
  await oracle.connect(deployer).resolveRace(market.address, 1);
  console.log("   ✅ Market resolved\n");
  
  console.log("7. Alice redeems winning tokens...");
  const aliceGreen = await greenToken.balanceOf(alice.address);
  await greenToken.connect(alice).approve(market.address, aliceGreen);
  
  // Get Alice's USDT balance before
  const aliceBefore = await stablecoin.balanceOf(alice.address);
  
  // Redeem tokens
  const tx = await market.connect(alice).redeemTokens(marketInfo.greenToken);
  const receipt = await tx.wait();
  
  // Get Alice's USDT balance after
  const aliceAfter = await stablecoin.balanceOf(alice.address);
  const payout = aliceAfter.sub(aliceBefore);
  
  console.log(`   ✅ Alice received ${ethers.utils.formatEther(payout)} USDT\n`);
  
  console.log("8. Final results:");
  const aliceFinal = await stablecoin.balanceOf(alice.address);
  const bobFinal = await stablecoin.balanceOf(bob.address);
  
  console.log(`   Alice: ${ethers.utils.formatEther(aliceFinal)} USDT (profit: ${ethers.utils.formatEther(aliceFinal.sub(ethers.utils.parseEther("1000")))})`);
  console.log(`   Bob: ${ethers.utils.formatEther(bobFinal)} USDT (loss: 200 USDT)`);
  
  console.log("\n🎉 SCENARIO COMPLETE!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
