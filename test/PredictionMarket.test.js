const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Prediction Market", function () {
  let market, stablecoin, oracle;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy Mock Stablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    stablecoin = await MockStablecoin.deploy();
    await stablecoin.deployed();

    // Mint stablecoins to users
    await stablecoin.mint(addr1.address, ethers.utils.parseEther("1000"));
    await stablecoin.mint(addr2.address, ethers.utils.parseEther("1000"));
    await stablecoin.mint(owner.address, ethers.utils.parseEther("10000"));

    // Deploy Prediction Market
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    market = await PredictionMarket.deploy(stablecoin.address);
    await market.deployed();

    // Deploy Mock Oracle
    const MockOracle = await ethers.getContractFactory("MockOracle");
    oracle = await MockOracle.deploy();
    await oracle.deployed();

    // Set oracle
    await market.setOracle(oracle.address);
    
    // Pre-fund liquidity pool for testing
    const marketInfo = await market.getMarketInfo();
    await stablecoin.connect(owner).approve(market.address, ethers.utils.parseEther("10000"));
    await market.connect(owner).preFundLiquidityPool(
      ethers.utils.parseEther("5000"),  // Green tokens
      ethers.utils.parseEther("5000"),  // Red tokens
      ethers.utils.parseEther("10000")  // USDT
    );
  });

  it("Should deploy with correct initial state", async function () {
    const marketInfo = await market.getMarketInfo();
    
    expect(marketInfo.greenToken).to.not.equal(ethers.constants.AddressZero);
    expect(marketInfo.redToken).to.not.equal(ethers.constants.AddressZero);
    expect(marketInfo.pool).to.not.equal(ethers.constants.AddressZero);
    expect(marketInfo.resolved).to.be.false;
    expect(marketInfo.outcome).to.equal(0); // PENDING
  });

  it("Should allow buying green tokens", async function () {
    const marketInfo = await market.getMarketInfo();
    
    // Approve market to spend stablecoin
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    
    // Buy green tokens
    await market.connect(addr1).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"));
    
    // Check token balance
    const greenToken = await ethers.getContractAt("OutcomeToken", marketInfo.greenToken);
    const balance = await greenToken.balanceOf(addr1.address);
    
    expect(balance).to.equal(ethers.utils.parseEther("100"));
  });

  it("Should allow buying red tokens", async function () {
    const marketInfo = await market.getMarketInfo();
    
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("150"));
    
    // Buy red tokens
    await market.connect(addr1).buyTokens(marketInfo.redToken, ethers.utils.parseEther("150"));
    
    // Check token balance
    const redToken = await ethers.getContractAt("OutcomeToken", marketInfo.redToken);
    const balance = await redToken.balanceOf(addr1.address);
    
    expect(balance).to.equal(ethers.utils.parseEther("150"));
  });

  it("Should allow oracle to resolve market", async function () {
    // First buy some tokens
    const marketInfo = await market.getMarketInfo();
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    await market.connect(addr1).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"));
    
    // Fast forward time past end time
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
    await ethers.provider.send("evm_mine");
    
    // Resolve market (Green wins) - Use 1 directly instead of enum
    await oracle.connect(owner).resolveRace(market.address, 1); // 1 = GREEN_WINS
    
    const newMarketInfo = await market.getMarketInfo();
    expect(newMarketInfo.resolved).to.be.true;
    expect(newMarketInfo.outcome).to.equal(1); // GREEN_WINS
  });

  it("Should calculate correct payouts", async function () {
    const marketInfo = await market.getMarketInfo();
    
    // Two users buy different tokens
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    await stablecoin.connect(addr2).approve(market.address, ethers.utils.parseEther("200"));
    
    await market.connect(addr1).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"));
    await market.connect(addr2).buyTokens(marketInfo.redToken, ethers.utils.parseEther("200"));
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
    await ethers.provider.send("evm_mine");
    
    // Resolve market (Green wins) - Pass contract address, not contract instance
    await oracle.connect(owner).resolveRace(market.address, 1); // 1 = GREEN_WINS
    
    // Calculate payout for green token holder
    const payout = await market.calculatePayout(ethers.utils.parseEther("100"), marketInfo.greenToken);
    
    // Total stablecoin = 10000 (pre-funded) + 100 + 200 = 10300
    // Green tokens = 100, so payout = (100 * 10300) / 100 = 10300
    const expectedPayout = ethers.utils.parseEther("10300");
    expect(payout).to.equal(expectedPayout);
    
    // Calculate payout for red token holder (should be 0 since they lost)
    const redPayout = await market.calculatePayout(ethers.utils.parseEther("200"), marketInfo.redToken);
    expect(redPayout).to.equal(0);
  });

  it("Should allow token redemption with multiple participants", async function () {
    const marketInfo = await market.getMarketInfo();
    
    // Two users buy different tokens
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    await stablecoin.connect(addr2).approve(market.address, ethers.utils.parseEther("200"));
    
    await market.connect(addr1).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"));
    await market.connect(addr2).buyTokens(marketInfo.redToken, ethers.utils.parseEther("200"));
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
    await ethers.provider.send("evm_mine");
    
    // Resolve market (Green wins)
    await oracle.connect(owner).resolveRace(market.address, 1);
    
    // Approve market to burn tokens (for redemption)
    const greenToken = await ethers.getContractAt("OutcomeToken", marketInfo.greenToken);
    await greenToken.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    
    // Check initial stablecoin balance of addr1
    const initialBalance = await stablecoin.balanceOf(addr1.address);
    
    // Redeem tokens
    await market.connect(addr1).redeemTokens(marketInfo.greenToken);
    
    // Check final balance of addr1
    const finalBalance = await stablecoin.balanceOf(addr1.address);
    
    // Total stablecoin = 10000 (pre-funded) + 100 + 200 = 10300
    // Green tokens = 100, so payout = (100 * 10300) / 100 = 10300
    const expectedPayout = ethers.utils.parseEther("10300");
    expect(finalBalance.sub(initialBalance)).to.equal(expectedPayout);
  });

  it("Should allow token redemption with single participant", async function () {
    const marketInfo = await market.getMarketInfo();
    
    // Only one user buys tokens
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    await market.connect(addr1).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"));
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
    await ethers.provider.send("evm_mine");
    
    // Resolve market (Green wins)
    await oracle.connect(owner).resolveRace(market.address, 1);
    
    // Approve market to burn tokens (for redemption)
    const greenToken = await ethers.getContractAt("OutcomeToken", marketInfo.greenToken);
    await greenToken.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    
    // Check initial stablecoin balance
    const initialBalance = await stablecoin.balanceOf(addr1.address);
    
    // Redeem tokens
    await market.connect(addr1).redeemTokens(marketInfo.greenToken);
    
    // Check final balance
    const finalBalance = await stablecoin.balanceOf(addr1.address);
    
    // Total stablecoin = 10000 (pre-funded) + 100 = 10100
    // Only one participant: total stablecoin = 10100, green tokens = 100
    // Since they're the only one and they win, they get back their 100 proportionally: (100 * 10100) / 100 = 10100
    const expectedPayout = ethers.utils.parseEther("10100");
    expect(finalBalance.sub(initialBalance)).to.equal(expectedPayout);
  });

  it("Should not allow buying after market end", async function () {
    const marketInfo = await market.getMarketInfo();
    
    // Fast forward time past end time
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
    await ethers.provider.send("evm_mine");
    
    // Try to buy tokens (should fail)
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    
    await expect(
      market.connect(addr1).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"))
    ).to.be.revertedWith("Market closed");
  });

  it("Should not allow redemption before resolution", async function () {
    const marketInfo = await market.getMarketInfo();
    
    // Buy tokens
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    await market.connect(addr1).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"));
    
    // Try to redeem before resolution (should fail)
    const greenToken = await ethers.getContractAt("OutcomeToken", marketInfo.greenToken);
    await greenToken.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    
    await expect(
      market.connect(addr1).redeemTokens(marketInfo.greenToken)
    ).to.be.revertedWith("Market not resolved yet");
  });

  it("Should handle red team winning scenario", async function () {
    const marketInfo = await market.getMarketInfo();
    
    // Two users buy different tokens
    await stablecoin.connect(addr1).approve(market.address, ethers.utils.parseEther("100"));
    await stablecoin.connect(addr2).approve(market.address, ethers.utils.parseEther("200"));
    
    await market.connect(addr1).buyTokens(marketInfo.greenToken, ethers.utils.parseEther("100"));
    await market.connect(addr2).buyTokens(marketInfo.redToken, ethers.utils.parseEther("200"));
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
    await ethers.provider.send("evm_mine");
    
    // Resolve market (Red wins)
    await oracle.connect(owner).resolveRace(market.address, 2); // 2 = RED_WINS
    
    // Approve market to burn tokens
    const redToken = await ethers.getContractAt("OutcomeToken", marketInfo.redToken);
    await redToken.connect(addr2).approve(market.address, ethers.utils.parseEther("200"));
    
    // Check initial stablecoin balance of addr2
    const initialBalance = await stablecoin.balanceOf(addr2.address);
    
    // Redeem tokens
    await market.connect(addr2).redeemTokens(marketInfo.redToken);
    
    // Check final balance of addr2
    const finalBalance = await stablecoin.balanceOf(addr2.address);
    
    // Total stablecoin = 10000 (pre-funded) + 100 + 200 = 10300
    // Red tokens = 200, so payout = (200 * 10300) / 200 = 10300
    const expectedPayout = ethers.utils.parseEther("10300");
    expect(finalBalance.sub(initialBalance)).to.equal(expectedPayout);
  });
});
