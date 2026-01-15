const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Setting up liquidity pool...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Contract addresses
  const addresses = {
    stablecoin: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    market: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    oracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  };
  
  try {
    // Get contracts
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const stablecoin = await MockStablecoin.attach(addresses.stablecoin);
    
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const market = await PredictionMarket.attach(addresses.market);
    
    // Check if market exists
    console.log("Checking market...");
    const marketInfo = await market.getMarketInfo();
    console.log("✅ Market found");
    
    // Mint USDT to deployer for pre-funding
    console.log("Minting USDT for pre-funding...");
    await stablecoin.mint(deployer.address, ethers.utils.parseEther("10000"));
    
    // Approve USDT for market
    console.log("Approving USDT for market...");
    await stablecoin.connect(deployer).approve(addresses.market, ethers.utils.parseEther("10000"));
    
    // Pre-fund liquidity pool
    console.log("Pre-funding liquidity pool...");
    await market.connect(deployer).preFundLiquidityPool(
      ethers.utils.parseEther("5000"),  // 5000 green tokens
      ethers.utils.parseEther("5000"),  // 5000 red tokens  
      ethers.utils.parseEther("10000")  // 10000 USDT
    );
    
    console.log("✅ Liquidity pool pre-funded successfully!");
    
    // Check pool info
    const poolInfo = await market.getLiquidityPoolInfo();
    console.log("\n📊 Pool Status:");
    console.log("Green Tokens:", ethers.utils.formatEther(poolInfo.reserveA));
    console.log("Red Tokens:", ethers.utils.formatEther(poolInfo.reserveB));
    console.log("USDT:", ethers.utils.formatEther(poolInfo.reserveStablecoin));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("getMarketInfo")) {
      console.log("\n💡 Market contract might not be deployed correctly.");
      console.log("Try running: npx hardhat run scripts/deploy.js");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
