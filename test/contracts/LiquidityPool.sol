// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityPool is ReentrancyGuard, Ownable {
    IERC20 public tokenA;
    IERC20 public tokenB;
    IERC20 public stablecoin; // USDT or other stablecoin
    
    //Stores how many tokens are currently in the pool
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public reserveStablecoin;
    
    // LP tracking
    mapping(address => uint256) public lpBalances;
    uint256 public totalLPSupply;
    
    // LP role management
    mapping(address => bool) public isLiquidityProvider;
    address[] public liquidityProviders;
    
    // Constants for fees and pricing
    uint256 public constant FEE_BPS = 30; // 0.3% fee
    uint256 public constant PRECISION = 10000;

    //Someone added tokens to the pool
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 amountStablecoin, uint256 lpTokens);
    
    //Someone removed liquidity from the pool
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 amountStablecoin, uint256 lpTokens);

    //Someone exchanged one token for another
    event TokenSwapped(address indexed trader, address tokenIn, uint256 amountIn, uint256 amountOut, uint256 fee);
    
    event LiquidityProviderRegistered(address indexed provider);
    
    constructor(address _tokenA, address _tokenB, address _stablecoin) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
        stablecoin = IERC20(_stablecoin);
    }
    
    modifier onlyLiquidityProvider() {
        require(isLiquidityProvider[msg.sender], "Not a liquidity provider");
        _;
    }
    
    function registerAsLiquidityProvider(address provider) external {
        require(!isLiquidityProvider[provider], "Already registered");
        isLiquidityProvider[provider] = true;
        liquidityProviders.push(provider);
        emit LiquidityProviderRegistered(provider);
    }
    
    // Pre-fund pool with initial liquidity (owner only)
    function preFundPool(uint256 amountA, uint256 amountB, uint256 amountStablecoin) external onlyOwner {
        require(amountA > 0 && amountB > 0 && amountStablecoin > 0, "Amounts must be positive");
        
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        stablecoin.transferFrom(msg.sender, address(this), amountStablecoin);
        
        reserveA += amountA;
        reserveB += amountB;
        reserveStablecoin += amountStablecoin;
        
        // Mint LP tokens to owner
        uint256 lpTokens = amountA + amountB + amountStablecoin;
        lpBalances[msg.sender] += lpTokens;
        totalLPSupply += lpTokens;
        
        emit LiquidityAdded(msg.sender, amountA, amountB, amountStablecoin, lpTokens);
    }
    
    // Add liquidity (registered LPs only)
    function addLiquidity(address provider, uint256 amountA, uint256 amountB, uint256 amountStablecoin) external nonReentrant {
        require(isLiquidityProvider[provider], "Not a liquidity provider");
        require(amountA > 0 && amountB > 0 && amountStablecoin > 0, "Amounts must be positive");
        
        // Calculate proportional amounts based on current reserves
        uint256 totalReserves = reserveA + reserveB + reserveStablecoin;
        require(totalReserves > 0, "Pool not initialized");
        
        // Transfer tokens to pool
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        stablecoin.transferFrom(msg.sender, address(this), amountStablecoin);
        
        reserveA += amountA;
        reserveB += amountB;
        reserveStablecoin += amountStablecoin;
        
        // Mint LP tokens proportional to contribution
        uint256 lpTokens = amountA + amountB + amountStablecoin;
        lpBalances[provider] += lpTokens;
        totalLPSupply += lpTokens;
        
        emit LiquidityAdded(provider, amountA, amountB, amountStablecoin, lpTokens);
    }
    
    function addLiquidityForSelf(uint256 amountA, uint256 amountB, uint256 amountStablecoin) external onlyLiquidityProvider nonReentrant {
        require(amountA > 0 && amountB > 0 && amountStablecoin > 0, "Amounts must be positive");
        
        // Calculate proportional amounts based on current reserves
        uint256 totalReserves = reserveA + reserveB + reserveStablecoin;
        require(totalReserves > 0, "Pool not initialized");
        
        // Transfer tokens to pool
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        stablecoin.transferFrom(msg.sender, address(this), amountStablecoin);
        
        reserveA += amountA;
        reserveB += amountB;
        reserveStablecoin += amountStablecoin;
        
        // Mint LP tokens proportional to contribution
        uint256 lpTokens = amountA + amountB + amountStablecoin;
        lpBalances[msg.sender] += lpTokens;
        totalLPSupply += lpTokens;
        
        emit LiquidityAdded(msg.sender, amountA, amountB, amountStablecoin, lpTokens);
    }
    
    //This function calculates how many tokens you will get if you swap tokens in the pool.
    // It does not move tokens, it only calculates the price. 
    function getPrice(address tokenIn, uint256 amountIn) public view returns (uint256) {
        uint256 fee = (amountIn * FEE_BPS) / PRECISION;
        uint256 amountAfterFee = amountIn - fee;
        
        if (tokenIn == address(tokenA)) {
            return (amountAfterFee * reserveB) / (reserveA + amountAfterFee);
        } else if (tokenIn == address(tokenB)) {
            return (amountAfterFee * reserveA) / (reserveB + amountAfterFee);
        } else if (tokenIn == address(stablecoin)) {
            // Stablecoin to outcome tokens (1:1 for simplicity)
            return amountAfterFee;
        } else {
            revert("Invalid token");
        }
    }
    
    function getStablecoinPrice(uint256 tokenAmount) public pure returns (uint256) {
        uint256 fee = (tokenAmount * FEE_BPS) / PRECISION;
        uint256 amountAfterFee = tokenAmount - fee;
        return amountAfterFee; // 1:1 for simplicity
    }
    
    function swap(address tokenIn, uint256 amountIn) external nonReentrant returns (uint256) {
        require(amountIn > 0, "Amount must be positive");
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "Invalid token");
        
        IERC20 tokenInContract = IERC20(tokenIn);
        uint256 fee = (amountIn * FEE_BPS) / PRECISION;
        uint256 amountAfterFee = amountIn - fee;
        
        uint256 amountOut = getPrice(tokenIn, amountIn);
        require(amountOut > 0, "Insufficient liquidity");
        
        // Transfer tokens in
        tokenInContract.transferFrom(msg.sender, address(this), amountIn);
        
        if (tokenIn == address(tokenA)) {
            require(reserveB >= amountOut, "Insufficient reserve B");
            tokenB.transfer(msg.sender, amountOut);
            reserveA += amountAfterFee;
            reserveB -= amountOut;
        } else {
            require(reserveA >= amountOut, "Insufficient reserve A");
            tokenA.transfer(msg.sender, amountOut);
            reserveB += amountAfterFee;
            reserveA -= amountOut;
        }
        
        emit TokenSwapped(msg.sender, tokenIn, amountIn, amountOut, fee);
        return amountOut;
    }
    
    function buyWithStablecoin(address tokenOut, uint256 stablecoinAmount) external nonReentrant returns (uint256) {
        require(stablecoinAmount > 0, "Amount must be positive");
        require(tokenOut == address(tokenA) || tokenOut == address(tokenB), "Invalid token");
        
        uint256 fee = (stablecoinAmount * FEE_BPS) / PRECISION;
        uint256 amountAfterFee = stablecoinAmount - fee;
        
        stablecoin.transferFrom(msg.sender, address(this), stablecoinAmount);
        reserveStablecoin += stablecoinAmount;
        
        uint256 tokensOut = amountAfterFee;
        
        if (tokenOut == address(tokenA)) {
            require(reserveA >= tokensOut, "Insufficient token A reserve");
            tokenA.transfer(msg.sender, tokensOut);
            reserveA -= tokensOut;
        } else {
            require(reserveB >= tokensOut, "Insufficient token B reserve");
            tokenB.transfer(msg.sender, tokensOut);
            reserveB -= tokensOut;
        }
        
        emit TokenSwapped(msg.sender, address(stablecoin), stablecoinAmount, tokensOut, fee);
        return tokensOut;
    }
    
    function sellToStablecoin(address tokenIn, uint256 tokenAmount) external nonReentrant returns (uint256) {
        require(tokenAmount > 0, "Amount must be positive");
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "Invalid token");
        
        uint256 stablecoinOut = getStablecoinPrice(tokenAmount);
        require(stablecoinOut > 0, "Insufficient stablecoin reserve");
        
        IERC20 tokenInContract = IERC20(tokenIn);
        tokenInContract.transferFrom(msg.sender, address(this), tokenAmount);
        
        require(reserveStablecoin >= stablecoinOut, "Insufficient stablecoin reserve");
        stablecoin.transfer(msg.sender, stablecoinOut);
        
        if (tokenIn == address(tokenA)) {
            reserveA += tokenAmount;
        } else {
            reserveB += tokenAmount;
        }
        reserveStablecoin -= stablecoinOut;
        
        uint256 fee = (tokenAmount * FEE_BPS) / PRECISION;
        emit TokenSwapped(msg.sender, tokenIn, tokenAmount, stablecoinOut, fee);
        return stablecoinOut;
    }
    
    function removeLiquidity(uint256 lpTokenAmount) external onlyLiquidityProvider nonReentrant {
        require(lpTokenAmount > 0, "Amount must be positive");
        require(lpBalances[msg.sender] >= lpTokenAmount, "Insufficient LP tokens");
        
        uint256 totalReserves = reserveA + reserveB + reserveStablecoin;
        require(totalReserves > 0, "No reserves to remove");
        
        // Calculate proportional amounts
        uint256 amountA = (lpTokenAmount * reserveA) / totalLPSupply;
        uint256 amountB = (lpTokenAmount * reserveB) / totalLPSupply;
        uint256 amountStablecoin = (lpTokenAmount * reserveStablecoin) / totalLPSupply;
        
        // Burn LP tokens
        lpBalances[msg.sender] -= lpTokenAmount;
        totalLPSupply -= lpTokenAmount;
        
        // Update reserves
        reserveA -= amountA;
        reserveB -= amountB;
        reserveStablecoin -= amountStablecoin;
        
        // Transfer tokens to LP
        if (amountA > 0) tokenA.transfer(msg.sender, amountA);
        if (amountB > 0) tokenB.transfer(msg.sender, amountB);
        if (amountStablecoin > 0) stablecoin.transfer(msg.sender, amountStablecoin);
        
        emit LiquidityRemoved(msg.sender, amountA, amountB, amountStablecoin, lpTokenAmount);
    }
    
    function getReserves() external view returns (uint256, uint256, uint256) {
        return (reserveA, reserveB, reserveStablecoin);
    }
    
    function getPoolInfo() external view returns (
        uint256 _reserveA,
        uint256 _reserveB,
        uint256 _reserveStablecoin,
        uint256 _totalLPSupply,
        uint256 _feeBPS
    ) {
        return (reserveA, reserveB, reserveStablecoin, totalLPSupply, FEE_BPS);
    }
    
    function getLPBalance(address provider) external view returns (uint256) {
        return lpBalances[provider];
    }
    
    function isProvider(address provider) external view returns (bool) {
        return isLiquidityProvider[provider];
    }
    
    function getAllProviders() external view returns (address[] memory) {
        return liquidityProviders;
    }
}
