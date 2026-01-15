// MockStablecoin ABI
export const STABLECOIN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// PredictionMarket ABI
export const MARKET_ABI = [
  "function owner() view returns (address)",
  "function oracle() view returns (address)",
  "function stablecoin() view returns (address)",
  "function market() view returns (tuple(address greenToken, address redToken, address pool, uint8 outcome, bool resolved, uint256 totalStablecoin, uint256 endTime))",
  "function buyTokens(address token, uint256 stablecoinAmount)",
  "function sellTokens(address token, uint256 tokenAmount)",
  "function resolveMarket(uint8 _outcome) external",
  "function setOracle(address _oracle) external",
  "function getMarketInfo() view returns (address greenToken, address redToken, address pool, uint8 outcome, bool resolved, uint256 totalStablecoin, uint256 endTime, uint256 greenSupply, uint256 redSupply)",
  "function calculatePayout(uint256 tokenAmount, address token) view returns (uint256)",
  "function getTimeRemaining() view returns (uint256)",
  "function isMarketActive() view returns (bool)",
  "event TokensPurchased(address indexed buyer, address token, uint256 amount)",
  "event TokensSold(address indexed seller, address token, uint256 amount)",
  "event MarketResolved(uint8 outcome)",
  "event TokensRedeemed(address indexed redeemer, address token, uint256 amount)",
  "event OracleSet(address oracle)"
];

// OutcomeToken ABI
export const OUTCOME_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function burn(address from, uint256 amount) external",
  "function market() view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// LiquidityPool ABI
export const POOL_ABI = [
  "function tokenA() view returns (address)",
  "function tokenB() view returns (address)",
  "function stablecoin() view returns (address)",
  "function reserveA() view returns (uint256)",
  "function reserveB() view returns (uint256)",
  "function reserveStablecoin() view returns (uint256)",
  "function totalLPSupply() view returns (uint256)",
  "function lpBalances(address) view returns (uint256)",
  "function isLiquidityProvider(address) view returns (bool)",
  "function registerAsLiquidityProvider(address provider) external",
  "function preFundPool(uint256 amountA, uint256 amountB, uint256 amountStablecoin) external",
  "function addLiquidity(address provider, uint256 amountA, uint256 amountB, uint256 amountStablecoin) external",
  "function addLiquidityForSelf(uint256 amountA, uint256 amountB, uint256 amountStablecoin) external",
  "function removeLiquidity(uint256 lpTokenAmount) external",
  "function getPrice(address tokenIn, uint256 amountIn) view returns (uint256)",
  "function getStablecoinPrice(uint256 tokenAmount) view returns (uint256)",
  "function swap(address tokenIn, uint256 amountIn) returns (uint256)",
  "function buyWithStablecoin(address tokenOut, uint256 stablecoinAmount) returns (uint256)",
  "function sellToStablecoin(address tokenIn, uint256 tokenAmount) returns (uint256)",
  "function getReserves() view returns (uint256, uint256, uint256)",
  "function getPoolInfo() view returns (uint256 _reserveA, uint256 _reserveB, uint256 _reserveStablecoin, uint256 _totalLPSupply, uint256 _feeBPS)",
  "function getLPBalance(address provider) view returns (uint256)",
  "function isProvider(address provider) view returns (bool)",
  "function getAllProviders() view returns (address[])",
  "event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 amountStablecoin, uint256 lpTokens)",
  "event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 amountStablecoin, uint256 lpTokens)",
  "event TokenSwapped(address indexed trader, address tokenIn, uint256 amountIn, uint256 amountOut, uint256 fee)",
  "event LiquidityProviderRegistered(address indexed provider)"
];

// MockOracle ABI
export const ORACLE_ABI = [
  "function admin() view returns (address)",
  "function resolveRace(address marketAddress, uint8 outcome)",
  "function transferOwnership(address newAdmin)",
  "event MarketResolved(address indexed market, uint8 outcome)"
];
