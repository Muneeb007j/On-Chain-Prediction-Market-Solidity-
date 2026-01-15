const { ethers } = require("hardhat");

async function main() {
  console.log("🪙 Minting USDT...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Get the MockStablecoin contract
  const stablecoinAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  const stablecoin = await MockStablecoin.attach(stablecoinAddress);
  
  try {
    // Mint 10,000 USDT to deployer (default MetaMask account)
    const amount = ethers.utils.parseEther("10000");
    await stablecoin.mint(deployer.address, amount);
    console.log("✅ Minted 10,000 USDT to default account");
    console.log(`📍 Address: ${deployer.address}`);
    console.log("💰 This should match your MetaMask account when connected to Hardhat local network");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
