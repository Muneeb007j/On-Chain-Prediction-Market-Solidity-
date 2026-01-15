const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("✅ Verifying Prediction Market Functionality\n");
  
  // Check if deployment.json exists
  if (!fs.existsSync('deployment.json')) {
    console.log("❌ deployment.json file not found!");
    console.log("Please run: npx hardhat run scripts/deploy.js --network localhost first");
    return;
  }
  
  // Load the latest addresses from the file
  const addresses = require('../deployment.json');
  
  console.log("📋 Loaded contract addresses:");
  console.log("Market:", addresses.market);
  console.log("Stablecoin:", addresses.stablecoin);
  console.log("Oracle:", addresses.oracle);
  
  const [deployer, alice, bob] = await ethers.getSigners();
  
  console.log("\n👥 Accounts:");
  console.log("Deployer:", deployer.address);
  console.log("Alice:", alice.address);
  console.log("Bob:", bob.address);
  
  // Connect to contracts
  const Stablecoin = await ethers.getContractFactory("MockStablecoin");
  const stablecoin = await Stablecoin.attach(addresses.stablecoin);
  
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.attach(addresses.market);
  
  console.log("\n1. Checking contract connections...");
  try {
    const marketInfo = await market.getMarketInfo();
    console.log("   ✅ Market address:", market.address);
    console.log("   ✅ Green token:", marketInfo.greenToken);
    console.log("   ✅ Red token:", marketInfo.redToken);
    console.log("   ✅ Market active:", !marketInfo.resolved);
    console.log("   ✅ Total pool:", ethers.utils.formatEther(marketInfo.totalStablecoin), "USDT");
  } catch (error) {
    console.log("   ❌ Failed to connect to market contract:", error.message);
    console.log("   ℹ️  This usually means the contract isn't deployed at this address");
    return;
  }
  
  const marketInfo = await market.getMarketInfo();
  
  console.log("\n2. Testing token purchase...");
  try {
    // Mint some stablecoins to Alice first
    await stablecoin.mint(alice.address, ethers.utils.parseEther("100"));
    console.log("   ✅ Minted 100 USDT to Alice");
    
    // Approve market to spend
    await stablecoin.connect(alice).approve(market.address, ethers.utils.parseEther("50"));
    console.log("   ✅ Approved market to spend 50 USDT");
    
    // Buy tokens
    await market.connect(alice).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("50"));
    console.log("   ✅ Alice bought 50 green tokens");
    
    // Verify balance
    const GreenToken = await ethers.getContractFactory("OutcomeToken");
    const greenToken = await GreenToken.attach(marketInfo.greenToken);
    const balance = await greenToken.balanceOf(alice.address);
    console.log("   ✅ Alice's green token balance:", ethers.utils.formatEther(balance));
    
  } catch (error) {
    console.log("   ❌ Token purchase test failed:", error.message);
    return;
  }
  
  console.log("\n3. Testing payout calculation...");
  try {
    const payout = await market.calculatePayout(ethers.utils.parseEther("50"), marketInfo.greenToken);
    console.log("   ✅ Payout calculation works");
    console.log("   Expected payout for 50 tokens:", ethers.utils.formatEther(payout), "USDT");
  } catch (error) {
    console.log("   ❌ Payout calculation failed:", error.message);
    return;
  }
  
  console.log("\n🎉 BASIC TESTS PASSED!");
  console.log("\nThe prediction market core functionality is working.");
  console.log("\nTo run a full scenario test, use: npx hardhat run scripts/interactive.js --network localhost");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  });
