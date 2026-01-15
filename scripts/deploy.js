const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy mock stablecoin (for testing)
  const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  const stablecoin = await MockStablecoin.deploy();
  await stablecoin.deployed();
  console.log("MockStablecoin deployed to:", stablecoin.address);

  // Deploy Prediction Market
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.deploy(stablecoin.address);
  await market.deployed();
  console.log("PredictionMarket deployed to:", market.address);

  // Deploy Mock Oracle
  const MockOracle = await ethers.getContractFactory("MockOracle");
  const oracle = await MockOracle.deploy();
  await oracle.deployed();
  console.log("MockOracle deployed to:", oracle.address);

  // Set oracle in market
  await market.setOracle(oracle.address);
  console.log("Oracle set in market");

  // Get market info
  const marketInfo = await market.getMarketInfo();
  console.log("\nMarket Information:");
  console.log("Green Token:", marketInfo.greenToken);
  console.log("Red Token:", marketInfo.redToken);
  console.log("Liquidity Pool:", marketInfo.pool);
  console.log("End Time:", new Date(marketInfo.endTime.toNumber() * 1000).toLocaleString());

  // Save addresses for frontend
  const addresses = {
    stablecoin: stablecoin.address,
    market: market.address,
    oracle: oracle.address,
    greenToken: marketInfo.greenToken,
    redToken: marketInfo.redToken,
    pool: marketInfo.pool
  };

  console.log("\nAddresses:", JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });