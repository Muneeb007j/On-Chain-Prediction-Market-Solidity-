const { ethers } = require("hardhat");

async function main() {
  console.log("🪙 Minting USDT to your wallet...");
  
  // Default to first Hardhat account (should match MetaMask when connected to local network)
  const [deployer] = await ethers.getSigners();
  const targetAddress = deployer.address;
  
  console.log(`Target address: ${targetAddress}`);
  
  // Load contracts
  const stablecoinAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const Stablecoin = await ethers.getContractFactory("MockStablecoin");
  const stablecoin = await Stablecoin.attach(stablecoinAddress);
  
  const amount = ethers.utils.parseEther("10000"); // Mint 10,000 USDT
  
  try {
    await stablecoin.mint(targetAddress, amount);
    console.log(`✅ Successfully minted 10,000 USDT to ${targetAddress}`);
    
    // Verify the balance
    const balance = await stablecoin.balanceOf(targetAddress);
    console.log(`💰 Current USDT balance: ${ethers.utils.formatEther(balance)} USDT`);
    
  } catch (error) {
    console.error("❌ Error minting USDT:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
