import React, { useState, useEffect } from 'react';
import { getContract, getUserAddress, formatEther, parseEther } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import { TrendingUp, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';

interface BettingPanelProps {
  onBetPlaced?: () => void;
}

const BettingPanel: React.FC<BettingPanelProps> = ({ onBetPlaced }) => {
  const [selectedOutcome, setSelectedOutcome] = useState<'green' | 'red'>('green');
  const [betAmount, setBetAmount] = useState<string>('');
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  const [approved, setApproved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [marketInfo, setMarketInfo] = useState<any>(null);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBalances = async () => {
    try {
      const userAddress = getUserAddress();
      if (!userAddress) return;
      
      const stablecoinContract = getContract('stablecoin');
      const marketContract = getContract('market');
      
      if (!stablecoinContract || !marketContract) return;
      
      const balance = await stablecoinContract.balanceOf(userAddress);
      setUsdtBalance(formatEther(balance));

      const allowance = await stablecoinContract.allowance(userAddress, CONTRACT_ADDRESSES.market);
      const amountToBet = betAmount ? parseEther(betAmount) : BigInt(0);
      // Check if allowance is sufficient (allowance should be much larger than bet amount now)
      setApproved(allowance >= amountToBet && allowance > BigInt(0));

      const info = await marketContract.getMarketInfo();
      setMarketInfo(info);

    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  const handleApprove = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert("Please enter a valid bet amount!");
      return;
    }

    try {
      setLoading(true);
      const stablecoinContract = getContract('stablecoin');
      if (!stablecoinContract) throw new Error('Contract not found');

      // Approve a larger amount to avoid multiple approvals (approve max uint256)
      const maxAmount = parseEther("1000000000000"); // Very large amount
      const tx = await stablecoinContract.approve(CONTRACT_ADDRESSES.market, maxAmount);
      await tx.wait();
      
      setApproved(true);
      alert("✅ Approval successful! You can now place bets without re-approving.");
      fetchBalances();
    } catch (error: any) {
      console.error("Approval error:", error);
      alert("❌ Approval failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!approved) {
      alert("Please approve USDT spending first!");
      return;
    }

    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert("Please enter a valid bet amount!");
      return;
    }

    if (parseFloat(betAmount) > parseFloat(usdtBalance)) {
      alert("Insufficient USDT balance!");
      return;
    }

    try {
      setLoading(true);
      const marketContract = getContract('market');
      if (!marketContract) throw new Error('Market contract not found');

      const tokenAddress = selectedOutcome === 'green' 
        ? CONTRACT_ADDRESSES.greenToken 
        : CONTRACT_ADDRESSES.redToken;
      
      const amount = parseEther(betAmount);
      
      console.log(`Placing bet: ${betAmount} USDT on ${selectedOutcome}`);
      const tx = await marketContract.buyTokens(tokenAddress, amount);
      await tx.wait();
      
      alert(`✅ Bet placed successfully! You bought ${betAmount} ${selectedOutcome.toUpperCase()} tokens.`);
      
      setBetAmount('');
      fetchBalances();
      
      if (onBetPlaced) onBetPlaced();
    } catch (error: any) {
      console.error("Betting error:", error);
      alert("❌ Bet failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isMarketActive = () => {
    if (!marketInfo) return false;
    return !marketInfo.resolved && Date.now() / 1000 < Number(marketInfo.endTime);
  };

  const formatTimeRemaining = () => {
    if (!marketInfo) return "";
    const now = Math.floor(Date.now() / 1000);
    if (now > Number(marketInfo.endTime)) return "Market closed";
    
    const seconds = Number(marketInfo.endTime) - now;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
      <div className="flex items-center mb-6">
        <TrendingUp className="w-6 h-6 mr-2 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-800">Place Your Bet</h2>
      </div>

      {/* Market Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isMarketActive() ? (
              <CheckCircle className="w-5 h-5 text-success-500 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 text-warning-500 mr-2" />
            )}
            <span className={`font-medium ${isMarketActive() ? 'text-success-700' : 'text-warning-700'}`}>
              {isMarketActive() ? 'Market Active' : 'Market Closed'}
            </span>
          </div>
          <span className="text-sm text-gray-600">{formatTimeRemaining()}</span>
        </div>
      </div>

      {/* Outcome Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Choose Your Winner</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedOutcome('green')}
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${
              selectedOutcome === 'green'
                ? 'border-green-500 bg-green-50 glow-green'
                : 'border-gray-200 bg-white hover:border-green-300'
            }`}
          >
            <div className="text-2xl mb-2">🏎️</div>
            <div className="font-bold text-green-800">Green Car</div>
            <div className="text-sm text-green-600">Speed & Agility</div>
          </button>
          
          <button
            onClick={() => setSelectedOutcome('red')}
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${
              selectedOutcome === 'red'
                ? 'border-red-500 bg-red-50 glow-red'
                : 'border-gray-200 bg-white hover:border-red-300'
            }`}
          >
            <div className="text-2xl mb-2">🏁</div>
            <div className="font-bold text-red-800">Red Car</div>
            <div className="text-sm text-red-600">Power & Control</div>
          </button>
        </div>
      </div>

      {/* Bet Amount */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Bet Amount</h3>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            placeholder="0.0"
            min="0"
            step="0.1"
            disabled={!isMarketActive()}
          />
        </div>
        <div className="mt-2 flex justify-between text-sm text-gray-600">
          <span>Available: {parseFloat(usdtBalance).toFixed(2)} USDT</span>
          {betAmount && (
            <span className={parseFloat(betAmount) > parseFloat(usdtBalance) ? 'text-red-600' : 'text-green-600'}>
              {parseFloat(betAmount) > parseFloat(usdtBalance) ? '❌ Insufficient balance' : '✅ Sufficient balance'}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {!approved ? (
          <button
            onClick={handleApprove}
            disabled={loading || !betAmount || parseFloat(betAmount) <= 0 || !isMarketActive()}
            className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
              loading || !betAmount || parseFloat(betAmount) <= 0 || !isMarketActive()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-warning-500 hover:bg-warning-600 text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Approving...
              </>
            ) : (
              '🔑 Approve USDT Spending'
            )}
          </button>
        ) : (
          <button
            onClick={handlePlaceBet}
            disabled={loading || !betAmount || parseFloat(betAmount) <= 0 || !isMarketActive()}
            className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
              loading || !betAmount || parseFloat(betAmount) <= 0 || !isMarketActive()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Placing Bet...
              </>
            ) : (
              `🏎️ Bet ${betAmount} USDT on ${selectedOutcome === 'green' ? 'Green' : 'Red'} Car`
            )}
          </button>
        )}

        {approved && (
          <button
            onClick={() => setApproved(false)}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-300"
          >
            Reset Approval
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-bold text-blue-800 mb-2">How Betting Works</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Choose which car you think will win the race</li>
          <li>• Enter the amount of USDT you want to bet</li>
          <li>• Approve USDT spending, then place your bet</li>
          <li>• Receive outcome tokens that represent your bet</li>
          <li>• If your car wins, redeem tokens for USDT prize pool</li>
        </ul>
      </div>
    </div>
  );
};

export default BettingPanel;
