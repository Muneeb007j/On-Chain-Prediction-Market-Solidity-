// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./OutcomeToken.sol";
import "./LiquidityPool.sol";

contract PredictionMarket {
    enum RaceOutcome { PENDING, GREEN_WINS, RED_WINS }
    
    struct Market {
        OutcomeToken greenToken;
        OutcomeToken redToken;
        LiquidityPool pool;
        RaceOutcome outcome;
        bool resolved;
        uint256 totalStablecoin;
        uint256 endTime;
    }
    
    Market public market;
    address public oracle;
    address public stablecoin;
    address public owner;
    
    event TokensPurchased(address indexed buyer, address token, uint256 amount);
    event TokensSold(address indexed seller, address token, uint256 amount);
    event MarketResolved(RaceOutcome outcome);
    event TokensRedeemed(address indexed redeemer, address token, uint256 amount);
    event OracleSet(address oracle);
    event LiquidityProvided(address indexed provider, uint256 amountA, uint256 amountB, uint256 amountStablecoin);
    
    constructor(address _stablecoin) {
        stablecoin = _stablecoin;
        owner = msg.sender;
        
        // Create outcome tokens
        //market.greenToken and market.redToken store references to these token contracts.
        market.greenToken = new OutcomeToken("Green Car Wins", "GREEN", address(this));
        market.redToken = new OutcomeToken("Red Car Wins", "RED", address(this));
        
        // Create liquidity pool
        market.pool = new LiquidityPool(
            address(market.greenToken),
            address(market.redToken),
            _stablecoin
        );
        
        market.outcome = RaceOutcome.PENDING;
        market.resolved = false;  // market is active
        market.endTime = block.timestamp + 7 days; // Market runs for 7 days
        market.totalStablecoin = 0;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }
    
    modifier marketOpen() {
        require(!market.resolved, "Market already resolved");//Ensures market is active and not expired
        require(block.timestamp < market.endTime, "Market closed"); //prevents betting after resolution or end time
        _;
    }
    //the oracle is the authority that decides the result.
    function setOracle(address _oracle) external onlyOwner {
        require(oracle == address(0), "Oracle already set");
        require(_oracle != address(0), "Invalid oracle address");
        oracle = _oracle;
        emit OracleSet(_oracle);
    }
    //Core betting function
    function buyTokens(address token, uint256 stablecoinAmount) external marketOpen {
        require(token == address(market.greenToken) || token == address(market.redToken), "Invalid token");
        require(stablecoinAmount > 0, "Amount must be positive");
        
        // Transfer stablecoin from user
        IERC20(stablecoin).transferFrom(msg.sender, address(this), stablecoinAmount);
        
        // Add to market total for payouts
        market.totalStablecoin = market.totalStablecoin + stablecoinAmount;
        
        // Mint tokens directly (simpler approach for testing)
        OutcomeToken outcomeToken = OutcomeToken(token);
        outcomeToken.mint(msg.sender, stablecoinAmount);
        
        emit TokensPurchased(msg.sender, token, stablecoinAmount);
    }
    
    // New sell functionality
    function sellTokens(address token, uint256 tokenAmount) external marketOpen {
        require(token == address(market.greenToken) || token == address(market.redToken), "Invalid token");
        require(tokenAmount > 0, "Amount must be positive");
        
        // Check user has sufficient tokens
        IERC20 outcomeToken = IERC20(token);
        require(outcomeToken.balanceOf(msg.sender) >= tokenAmount, "Insufficient tokens");
        
        // Transfer tokens to this contract first
        outcomeToken.transferFrom(msg.sender, address(this), tokenAmount);
        
        // Approve pool to spend tokens
        outcomeToken.approve(address(market.pool), tokenAmount);
        
        // Sell through liquidity pool
        uint256 stablecoinReceived = market.pool.sellToStablecoin(token, tokenAmount);
        
        // Transfer stablecoin to user
        IERC20(stablecoin).transfer(msg.sender, stablecoinReceived);
        
        emit TokensSold(msg.sender, token, tokenAmount);
    }
    
    function resolveMarket(uint8 _outcome) external onlyOracle {
        require(!market.resolved, "Market already resolved");
        require(_outcome == 1 || _outcome == 2, "Invalid outcome"); // 1 = GREEN_WINS, 2 = RED_WINS
        require(block.timestamp >= market.endTime, "Market not ended yet");
        
        market.outcome = RaceOutcome(_outcome);
        market.resolved = true;
        
        emit MarketResolved(RaceOutcome(_outcome));
    }
    
    function redeemTokens(address token) external returns (uint256) {
        require(market.resolved, "Market not resolved yet");
        
        uint256 userBalance;
        uint256 payout;
        
        if (token == address(market.greenToken)) {
            require(market.outcome == RaceOutcome.GREEN_WINS, "Green token lost");//Check if GREEN won
            userBalance = market.greenToken.balanceOf(msg.sender);//Get user balance
            require(userBalance > 0, "No tokens to redeem");
            
            //Calculates how much stablecoin the user earns
            payout = calculatePayout(userBalance, address(market.greenToken));
            market.greenToken.burn(msg.sender, userBalance);
        } else if (token == address(market.redToken)) {
            require(market.outcome == RaceOutcome.RED_WINS, "Red token lost");
            userBalance = market.redToken.balanceOf(msg.sender);
            require(userBalance > 0, "No tokens to redeem");
            
            payout = calculatePayout(userBalance, address(market.redToken));
            market.redToken.burn(msg.sender, userBalance);
        } else {
            revert("Invalid token");
        }
        
        require(payout > 0, "No payout available");
        
        // Transfer stablecoin payout
        bool success = IERC20(stablecoin).transfer(msg.sender, payout);
        require(success, "Transfer failed");
        
        emit TokensRedeemed(msg.sender, token, payout);
        return payout;
    }
    //calculates how much stablecoin a user should receive
    function calculatePayout(uint256 tokenAmount, address token) public view returns (uint256) {
        if (!market.resolved) return 0;
        //Checks which token corresponds to the winning outcome
        address winningToken = market.outcome == RaceOutcome.GREEN_WINS 
            ? address(market.greenToken) 
            : address(market.redToken);
        
        if (token != winningToken) return 0;
        
        uint256 totalWinningTokens = market.outcome == RaceOutcome.GREEN_WINS
            ? market.greenToken.totalSupply()
            : market.redToken.totalSupply();
        
        if (totalWinningTokens == 0) return 0;
        
        // Proportional payout of the total prize pool
        return (tokenAmount * market.totalStablecoin) / totalWinningTokens;
    }
    
    function getMarketInfo() external view returns (
        address greenToken,
        address redToken,
        address pool,
        uint8 outcome,
        bool resolved,
        uint256 totalStablecoin,
        uint256 endTime,
        uint256 greenSupply,
        uint256 redSupply
    ) {
        return (
            //This function is like a snapshot of the market: who the tokens are, who won, how much money is in the pool, and when it ends
            address(market.greenToken),
            address(market.redToken),
            address(market.pool),
            uint8(market.outcome),
            market.resolved,
            market.totalStablecoin,
            market.endTime,
            market.greenToken.totalSupply(),
            market.redToken.totalSupply()
        );
    }
    
    // LP functions
    function registerLiquidityProvider() external {
        market.pool.registerAsLiquidityProvider(msg.sender);
    }
    
    function provideLiquidity(uint256 amountA, uint256 amountB, uint256 amountStablecoin) external {
        require(amountA > 0 && amountB > 0 && amountStablecoin > 0, "Amounts must be positive");
        
        // Transfer tokens to this contract first
        IERC20(stablecoin).transferFrom(msg.sender, address(this), amountStablecoin);
        market.greenToken.transferFrom(msg.sender, address(this), amountA);
        market.redToken.transferFrom(msg.sender, address(this), amountB);
        
        // Approve pool to spend tokens
        IERC20(stablecoin).approve(address(market.pool), amountStablecoin);
        market.greenToken.approve(address(market.pool), amountA);
        market.redToken.approve(address(market.pool), amountB);
        
        // Add liquidity to pool
        market.pool.addLiquidity(msg.sender, amountA, amountB, amountStablecoin);
        
        emit LiquidityProvided(msg.sender, amountA, amountB, amountStablecoin);
    }
    
    function preFundLiquidityPool(uint256 amountA, uint256 amountB, uint256 amountStablecoin) external onlyOwner {
        require(amountA > 0 && amountB > 0 && amountStablecoin > 0, "Amounts must be positive");
        
        // Mint initial tokens for pre-funding
        market.greenToken.mint(address(this), amountA);
        market.redToken.mint(address(this), amountB);
        
        // Transfer stablecoin from owner
        IERC20(stablecoin).transferFrom(msg.sender, address(this), amountStablecoin);
        
        // Approve pool to spend tokens
        market.greenToken.approve(address(market.pool), amountA);
        market.redToken.approve(address(market.pool), amountB);
        IERC20(stablecoin).approve(address(market.pool), amountStablecoin);
        
        // Pre-fund the pool
        market.pool.preFundPool(amountA, amountB, amountStablecoin);
    }
    
    function getLiquidityPoolInfo() external view returns (
        uint256 reserveA,
        uint256 reserveB,
        uint256 reserveStablecoin,
        uint256 totalLPSupply,
        uint256 feeBPS
    ) {
        return market.pool.getPoolInfo();
    }
    
    function getLPBalance(address provider) external view returns (uint256) {
        return market.pool.getLPBalance(provider);
    }
    
    function isLiquidityProvider(address provider) external view returns (bool) {
        return market.pool.isProvider(provider);
    }
    
    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= market.endTime) return 0;
        return market.endTime - block.timestamp;
    }
    
    // Helper function to check if market is active
    function isMarketActive() external view returns (bool) {

                                    //current time is before the market’s end time
        return !market.resolved && block.timestamp < market.endTime;  
    }
}
