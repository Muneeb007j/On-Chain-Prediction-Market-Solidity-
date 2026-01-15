import React, { useState, useEffect } from 'react';
import { getContract, getUserAddress, formatEther, parseEther } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import { TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

interface SellTokensProps {
  onSell?: () => void;
}

const SellTokens: React.FC<SellTokensProps> = ({ onSell }) => {
  const [selectedToken, setSelectedToken] = useState<'green' | 'red'>('green');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [userBalances, setUserBalances] = useState({ green: '0', red: '0', usdt: '0' });
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [expectedUSDT, setExpectedUSDT] = useState<string>('0');

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBalances = async () => {
    try {
      const userAddress = getUserAddress();
      if (!userAddress) return;
      
      const marketContract = getContract('market');
      const greenToken = getContract('greenToken');
      const redToken = getContract('redToken');
      const stablecoinContract = getContract('stablecoin');
      
      if (!marketContract || !greenToken || !redToken || !stablecoinContract) return;

      const info = await marketContract.getMarketInfo();
      setMarketInfo(info);

      const greenBalance = await greenToken.balanceOf(userAddress);
      const redBalance = await redToken.balanceOf(userAddress);
      const usdtBalance = await stablecoinContract.balanceOf(userAddress);

      setUserBalances({
        green: formatEther(greenBalance),
        red: formatEther(redBalance),
        usdt: formatEther(usdtBalance)
      });
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  const calculateExpectedUSDT = async (tokenType: 'green' | 'red', amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setExpectedUSDT('0');
      return;
    }

    try {
      const poolContract = getContract('pool');
      if (!poolContract) return;

      const tokenAddress = tokenType === 'green' 
        ? CONTRACT_ADDRESSES.greenToken 
        : CONTRACT_ADDRESSES.redToken;
      
      const amountBN = parseEther(amount);
      const expected = await poolContract.getStablecoinPrice(amountBN);
      setExpectedUSDT(formatEther(expected));
    } catch (error) {
      console.error("Error calculating USDT:", error);
      setExpectedUSDT('0');
    }
  };

  const handleSell = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      alert("Please enter a valid sell amount!");
      return;
    }

    const userBalance = selectedToken === 'green' ? userBalances.green : userBalances.red;
    if (parseFloat(sellAmount) > parseFloat(userBalance)) {
      alert(`❌ Insufficient ${selectedToken.toUpperCase()} tokens! You have ${userBalance} but trying to sell ${sellAmount}`);
      return;
    }

    try {
      setLoading(true);
      const poolContract = getContract('pool');
      const tokenContract = getContract(selectedToken === 'green' ? 'greenToken' : 'redToken');
      
      if (!poolContract || !tokenContract) throw new Error('Contract not found');

      const amountBN = parseEther(sellAmount);
      
      // Approve tokens for selling
      const tx1 = await tokenContract.approve(CONTRACT_ADDRESSES.pool, amountBN);
      await tx1.wait();

      // Sell tokens for USDT
      const tokenAddress = selectedToken === 'green' 
        ? CONTRACT_ADDRESSES.greenToken 
        : CONTRACT_ADDRESSES.redToken;

      const tx2 = await poolContract.sellToStablecoin(tokenAddress, amountBN);
      await tx2.wait();

      alert(`✅ Sold ${sellAmount} ${selectedToken.toUpperCase()} tokens for ${expectedUSDT} USDT!`);
      
      setSellAmount('');
      setExpectedUSDT('0');
      fetchBalances();
      
      if (onSell) onSell();
    } catch (error: any) {
      console.error("Error selling tokens:", error);
      alert("❌ Sell failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isMarketActive = () => {
    if (!marketInfo) return false;
    return !marketInfo.resolved && Date.now() / 1000 < Number(marketInfo.endTime);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
      <div className="flex items-center mb-6">
        <TrendingDown className="w-6 h-6 mr-2 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-800">Sell Tokens</h2>
      </div>

      {/* Market Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isMarketActive() ? (
              <AlertCircle className="w-5 h-5 text-warning-500 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-500 mr-2" />
            )}
            <span className={`font-medium ${isMarketActive() ? 'text-warning-700' : 'text-gray-700'}`}>
              {isMarketActive() ? 'Market Active - You can sell tokens anytime' : 'Market Closed'}
            </span>
          </div>
        </div>
      </div>

      {/* User Balance */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
        <h3 className="font-bold text-purple-800 mb-3">Your Token Balances</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-lg shadow">
            <p className="text-sm text-green-700">Green Tokens</p>
            <p className="text-xl font-bold text-green-900">{parseFloat(userBalances.green).toFixed(2)}</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <p className="text-sm text-red-700">Red Tokens</p>
            <p className="text-xl font-bold text-red-900">{parseFloat(userBalances.red).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Sell Form */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Token to Sell</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setSelectedToken('green');
                calculateExpectedUSDT('green', sellAmount);
              }}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedToken === 'green'
                  ? 'border-green-500 bg-green-50 glow-green'
                  : 'border-gray-200 bg-white hover:border-green-300'
              }`}
            >
              <div className="text-2xl mb-2">🏎️</div>
              <div className="font-bold text-green-800">Green Car Tokens</div>
              <div className="text-sm text-green-600">Sell for USDT</div>
            </button>
            
            <button
              onClick={() => {
                setSelectedToken('red');
                calculateExpectedUSDT('red', sellAmount);
              }}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedToken === 'red'
                  ? 'border-red-500 bg-red-50 glow-red'
                  : 'border-gray-200 bg-white hover:border-red-300'
              }`}
            >
              <div className="text-2xl mb-2">🏁</div>
              <div className="font-bold text-red-800">Red Car Tokens</div>
              <div className="text-sm text-red-600">Sell for USDT</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Sell
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => {
                setSellAmount(e.target.value);
                calculateExpectedUSDT(selectedToken, e.target.value);
              }}
              className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              placeholder="0.0"
              min="0"
              step="0.1"
              disabled={!isMarketActive()}
            />
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>Available: {selectedToken === 'green' ? userBalances.green : userBalances.red} tokens</span>
            {sellAmount && parseFloat(sellAmount) > 0 && (
              <span className={parseFloat(sellAmount) > parseFloat(selectedToken === 'green' ? userBalances.green : userBalances.red) ? 'text-red-600' : 'text-green-600'}>
                {parseFloat(sellAmount) > parseFloat(selectedToken === 'green' ? userBalances.green : userBalances.red) ? '❌ Insufficient' : '✅ Sufficient'}
              </span>
            )}
          </div>
        </div>

        {parseFloat(expectedUSDT) > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">You will receive approximately:</p>
            <p className="text-xl font-bold text-green-900">{parseFloat(expectedUSDT).toFixed(4)} USDT</p>
            <p className="text-xs text-green-500 mt-1">Price may vary due to pool liquidity</p>
          </div>
        )}

        <button
          onClick={handleSell}
          disabled={loading || !sellAmount || parseFloat(sellAmount) <= 0 || !isMarketActive()}
          className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
            loading || !sellAmount || parseFloat(sellAmount) <= 0 || !isMarketActive()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
              Selling Tokens...
            </>
          ) : (
            `🏷️ Sell ${sellAmount || '0'} ${selectedToken.toUpperCase()} Tokens`
          )}
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-bold text-blue-800 mb-2">💰 How Selling Works</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Select which outcome tokens you want to sell</li>
          <li>• Enter the amount of tokens to sell</li>
          <li>• Tokens are sold to the liquidity pool for USDT</li>
          <li>• Price depends on pool reserves and demand</li>
          <li>• You can sell tokens anytime before market resolves</li>
          <li>• After resolution, only winning tokens have value</li>
        </ul>
      </div>
    </div>
  );
};

export default SellTokens;
