import React, { useState, useEffect } from 'react';
import { getContract, getUserAddress, formatEther, parseEther } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import { Droplets, TrendingUp, Users, Settings, Wallet } from 'lucide-react';

interface LiquidityPanelProps {
  onLiquidityChange?: () => void;
}

const LiquidityPanel: React.FC<LiquidityPanelProps> = ({ onLiquidityChange }) => {
  const [greenAmount, setGreenAmount] = useState<string>('');
  const [redAmount, setRedAmount] = useState<string>('');
  const [stablecoinAmount, setStablecoinAmount] = useState<string>('');
  const [reserves, setReserves] = useState({ green: '0', red: '0', stablecoin: '0' });
  const [userTokenBalances, setUserTokenBalances] = useState({ green: '0', red: '0', usdt: '0' });
  const [lpInfo, setLpInfo] = useState({ balance: '0', totalSupply: '0', isProvider: false });
  const [loading, setLoading] = useState<boolean>(false);
  const [trading, setTrading] = useState({
    tokenIn: 'green',
    amountIn: '',
    expectedOut: '0'
  });

  useEffect(() => {
    fetchReserves();
    const interval = setInterval(fetchReserves, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchReserves = async () => {
    try {
      const userAddress = getUserAddress();
      if (!userAddress) return;
      
      const poolContract = getContract('pool');
      const greenToken = getContract('greenToken');
      const redToken = getContract('redToken');
      const stablecoinContract = getContract('stablecoin');
      
      if (!poolContract || !greenToken || !redToken || !stablecoinContract) return;

      const [reserveA, reserveB, reserveStablecoin] = await poolContract.getReserves();
      const poolInfo = await poolContract.getPoolInfo();
      const lpBalance = await poolContract.getLPBalance(userAddress);
      const isProvider = await poolContract.isProvider(userAddress);
      
      // Get user token balances
      const greenBalance = await greenToken.balanceOf(userAddress);
      const redBalance = await redToken.balanceOf(userAddress);
      const usdtBalance = await stablecoinContract.balanceOf(userAddress);
      
      setReserves({
        green: formatEther(reserveA),
        red: formatEther(reserveB),
        stablecoin: formatEther(reserveStablecoin)
      });
      
      setUserTokenBalances({
        green: formatEther(greenBalance),
        red: formatEther(redBalance),
        usdt: formatEther(usdtBalance)
      });
      
      setLpInfo({
        balance: formatEther(lpBalance),
        totalSupply: formatEther(poolInfo._totalLPSupply),
        isProvider
      });
    } catch (error) {
      console.error("Error fetching reserves:", error);
    }
  };

  const calculateExpectedOut = async (tokenIn: string, amountIn: string) => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setTrading(prev => ({ ...prev, expectedOut: '0' }));
      return;
    }

    try {
      const poolContract = getContract('pool');
      if (!poolContract) return;

      const tokenAddress = tokenIn === 'green' 
        ? CONTRACT_ADDRESSES.greenToken 
        : CONTRACT_ADDRESSES.redToken;
      
      const amount = parseEther(amountIn);
      const expected = await poolContract.getPrice(tokenAddress, amount);
      
      setTrading(prev => ({
        ...prev,
        expectedOut: formatEther(expected)
      }));
    } catch (error) {
      console.error("Error calculating price:", error);
    }
  };

  const handleRegisterLP = async () => {
    try {
      setLoading(true);
      const poolContract = getContract('pool');
      if (!poolContract) throw new Error('Pool contract not found');

      const userAddress = getUserAddress();
      if (!userAddress) throw new Error('No wallet connected');

      const tx = await poolContract.registerAsLiquidityProvider(userAddress);
      await tx.wait();
      
      alert("✅ Registered as Liquidity Provider!");
      fetchReserves();
    } catch (error: any) {
      console.error("Error registering LP:", error);
      alert("❌ Failed to register: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!greenAmount || !redAmount || !stablecoinAmount) {
      alert("Please enter all three amounts!");
      return;
    }

    // Check if user has enough tokens
    if (parseFloat(greenAmount) > parseFloat(userTokenBalances.green)) {
      alert(`❌ Insufficient Green tokens! You have ${userTokenBalances.green} but trying to add ${greenAmount}`);
      return;
    }
    if (parseFloat(redAmount) > parseFloat(userTokenBalances.red)) {
      alert(`❌ Insufficient Red tokens! You have ${userTokenBalances.red} but trying to add ${redAmount}`);
      return;
    }
    if (parseFloat(stablecoinAmount) > parseFloat(userTokenBalances.usdt)) {
      alert(`❌ Insufficient USDT! You have ${userTokenBalances.usdt} but trying to add ${stablecoinAmount}`);
      return;
    }

    try {
      setLoading(true);
      const poolContract = getContract('pool');
      const greenToken = getContract('greenToken');
      const redToken = getContract('redToken');
      const stablecoinContract = getContract('stablecoin');
      
      if (!poolContract || !greenToken || !redToken || !stablecoinContract) {
        throw new Error('Contract not found');
      }

      const greenAmountBN = parseEther(greenAmount);
      const redAmountBN = parseEther(redAmount);
      const stablecoinAmountBN = parseEther(stablecoinAmount);

      const tx1 = await greenToken.approve(CONTRACT_ADDRESSES.pool, greenAmountBN);
      const tx2 = await redToken.approve(CONTRACT_ADDRESSES.pool, redAmountBN);
      const tx3 = await stablecoinContract.approve(CONTRACT_ADDRESSES.pool, stablecoinAmountBN);
      
      await tx1.wait();
      await tx2.wait();
      await tx3.wait();

      const tx4 = await poolContract.addLiquidityForSelf(greenAmountBN, redAmountBN, stablecoinAmountBN);
      await tx4.wait();

      alert("✅ Liquidity added successfully!");
      
      setGreenAmount('');
      setRedAmount('');
      setStablecoinAmount('');
      fetchReserves();
      
      if (onLiquidityChange) onLiquidityChange();
    } catch (error: any) {
      console.error("Error adding liquidity:", error);
      alert("❌ Failed to add liquidity: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!trading.amountIn || parseFloat(trading.amountIn) <= 0) {
      alert("Please enter amount to swap!");
      return;
    }

    // Check if user has enough tokens to swap
    const userBalance = trading.tokenIn === 'green' ? userTokenBalances.green : userTokenBalances.red;
    if (parseFloat(trading.amountIn) > parseFloat(userBalance)) {
      alert(`❌ Insufficient ${trading.tokenIn.toUpperCase()} tokens! You have ${userBalance} but trying to swap ${trading.amountIn}`);
      return;
    }

    try {
      setLoading(true);
      const poolContract = getContract('pool');
      const tokenContract = getContract(trading.tokenIn === 'green' ? 'greenToken' : 'redToken');
      
      if (!poolContract || !tokenContract) throw new Error('Contract not found');

      const amountBN = parseEther(trading.amountIn);
      const tx1 = await tokenContract.approve(CONTRACT_ADDRESSES.pool, amountBN);
      await tx1.wait();

      const tokenAddress = trading.tokenIn === 'green' 
        ? CONTRACT_ADDRESSES.greenToken 
        : CONTRACT_ADDRESSES.redToken;

      const tx2 = await poolContract.swap(tokenAddress, amountBN);
      await tx2.wait();

      alert(`✅ Swapped ${trading.amountIn} ${trading.tokenIn.toUpperCase()} tokens!`);
      
      setTrading({ tokenIn: 'green', amountIn: '', expectedOut: '0' });
      fetchReserves();
      
      if (onLiquidityChange) onLiquidityChange();
    } catch (error: any) {
      console.error("Error swapping tokens:", error);
      alert("❌ Swap failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
      <div className="flex items-center mb-6">
        <Droplets className="w-6 h-6 mr-2 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-800">Liquidity Pool</h2>
      </div>
      
      {/* User Balance Info */}
      <div className="mb-8 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
        <h3 className="font-bold text-purple-800 mb-3 flex items-center">
          <Wallet className="w-5 h-5 mr-2" />
          Your Token Balances
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-lg shadow">
            <p className="text-sm text-green-700">Green Tokens</p>
            <p className="text-xl font-bold text-green-900">{parseFloat(userTokenBalances.green).toFixed(2)}</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <p className="text-sm text-red-700">Red Tokens</p>
            <p className="text-xl font-bold text-red-900">{parseFloat(userTokenBalances.red).toFixed(2)}</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <p className="text-sm text-blue-700">USDT</p>
            <p className="text-xl font-bold text-blue-900">{parseFloat(userTokenBalances.usdt).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Pool Info */}
      <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-3 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Current Pool Status
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-lg shadow">
            <p className="text-sm text-green-700">Green Tokens</p>
            <p className="text-2xl font-bold text-green-900">{parseFloat(reserves.green).toFixed(2)}</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <p className="text-sm text-red-700">Red Tokens</p>
            <p className="text-2xl font-bold text-red-900">{parseFloat(reserves.red).toFixed(2)}</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <p className="text-sm text-blue-700">USDT</p>
            <p className="text-2xl font-bold text-blue-900">{parseFloat(reserves.stablecoin).toFixed(2)}</p>
          </div>
        </div>
        
        {/* LP Info */}
        <div className="mt-4 p-3 bg-white rounded-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Your LP Tokens</p>
                <p className="text-lg font-bold text-gray-800">{parseFloat(lpInfo.balance).toFixed(4)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-bold text-gray-800">
                {lpInfo.isProvider ? '✅ LP Provider' : 'Not Registered'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Liquidity */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <Droplets className="w-5 h-5 mr-2" />
          Add Liquidity
        </h3>
        
        {/* Register as LP if not registered */}
        {!lpInfo.isProvider && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-800 font-medium">Not Registered as LP</p>
                <p className="text-xs text-yellow-600">You must register first before adding liquidity</p>
              </div>
              <button
                onClick={handleRegisterLP}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Registering...
                  </>
                ) : (
                  'Register as LP'
                )}
              </button>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏎️ Green Tokens to Add
            </label>
            <input
              type="number"
              value={greenAmount}
              onChange={(e) => setGreenAmount(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="0.0"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏁 Red Tokens to Add
            </label>
            <input
              type="number"
              value={redAmount}
              onChange={(e) => setRedAmount(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="0.0"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💵 USDT to Add
            </label>
            <input
              type="number"
              value={stablecoinAmount}
              onChange={(e) => setStablecoinAmount(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="0.0"
              min="0"
              step="0.1"
            />
          </div>
          <button
            onClick={handleAddLiquidity}
            disabled={loading || !greenAmount || !redAmount || !stablecoinAmount || !lpInfo.isProvider}
            className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
              loading || !greenAmount || !redAmount || !stablecoinAmount || !lpInfo.isProvider
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Adding Liquidity...
              </>
            ) : (
              'Add Liquidity'
            )}
          </button>
        </div>
      </div>

      {/* Swap Tokens */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Swap Tokens
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Swap From
            </label>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => {
                  setTrading(prev => ({ ...prev, tokenIn: 'green' }));
                  calculateExpectedOut('green', trading.amountIn);
                }}
                className={`flex-1 py-2 rounded-lg ${
                  trading.tokenIn === 'green'
                    ? 'bg-green-100 border-2 border-green-500 text-green-800'
                    : 'bg-gray-100 border-2 border-gray-200 text-gray-700'
                }`}
              >
                🏎️ Green Tokens
              </button>
              <button
                onClick={() => {
                  setTrading(prev => ({ ...prev, tokenIn: 'red' }));
                  calculateExpectedOut('red', trading.amountIn);
                }}
                className={`flex-1 py-2 rounded-lg ${
                  trading.tokenIn === 'red'
                    ? 'bg-red-100 border-2 border-red-500 text-red-800'
                    : 'bg-gray-100 border-2 border-gray-200 text-gray-700'
                }`}
              >
                🏁 Red Tokens
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Swap
            </label>
            <input
              type="number"
              value={trading.amountIn}
              onChange={(e) => {
                setTrading(prev => ({ ...prev, amountIn: e.target.value }));
                calculateExpectedOut(trading.tokenIn, e.target.value);
              }}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
              placeholder="0.0"
              min="0"
              step="0.1"
            />
          </div>
          
          {parseFloat(trading.expectedOut) > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">You will receive approximately:</p>
              <p className="text-xl font-bold text-gray-800">
                {parseFloat(trading.expectedOut).toFixed(4)} {trading.tokenIn === 'green' ? '🏁 RED' : '🏎️ GREEN'} tokens
              </p>
              <p className="text-xs text-gray-500 mt-1">Price may change due to slippage</p>
            </div>
          )}
          
          <button
            onClick={handleSwap}
            disabled={loading || !trading.amountIn || parseFloat(trading.amountIn) <= 0}
            className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
              loading || !trading.amountIn || parseFloat(trading.amountIn) <= 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Swapping...
              </>
            ) : (
              'Execute Swap'
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-bold text-yellow-800 mb-2">ℹ️ Liquidity Provider Info</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Provide all three tokens (Green, Red, USDT) for optimal liquidity</li>
          <li>• Earn trading fees from swaps (0.3% fee on trades)</li>
          <li>• Prices determined by constant product formula: x * y * z = k</li>
          <li>• Large swaps experience slippage (worse prices)</li>
          <li>• LP tokens represent your share of the pool</li>
        </ul>
      </div>
    </div>
  );
};

export default LiquidityPanel;
