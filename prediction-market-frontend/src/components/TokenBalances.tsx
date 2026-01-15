import React, { useState, useEffect } from 'react';
import { getContract, getUserAddress, formatEther, parseEther } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import { Coins, AlertCircle, Wallet } from 'lucide-react';

interface TokenBalancesProps {
  onRedeem?: () => void;
}

const TokenBalances: React.FC<TokenBalancesProps> = ({ onRedeem }) => {
  const [balances, setBalances] = useState({
    green: '0',
    red: '0',
    usdt: '0'
  });
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [payouts, setPayouts] = useState({
    green: '0',
    red: '0'
  });

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
      const greenTokenContract = getContract('greenToken');
      const redTokenContract = getContract('redToken');
      const stablecoinContract = getContract('stablecoin');
      
      if (!marketContract || !greenTokenContract || !redTokenContract || !stablecoinContract) return;
      
      const info = await marketContract.getMarketInfo();
      setMarketInfo(info);

      const greenBalance = await greenTokenContract.balanceOf(userAddress);
      const redBalance = await redTokenContract.balanceOf(userAddress);
      const usdtBalance = await stablecoinContract.balanceOf(userAddress);

      const greenPayout = info.resolved && info.outcome === BigInt(1) 
        ? await marketContract.calculatePayout(greenBalance, CONTRACT_ADDRESSES.greenToken)
        : BigInt(0);
      
      const redPayout = info.resolved && info.outcome === BigInt(2)
        ? await marketContract.calculatePayout(redBalance, CONTRACT_ADDRESSES.redToken)
        : BigInt(0);

      setBalances({
        green: formatEther(greenBalance),
        red: formatEther(redBalance),
        usdt: formatEther(usdtBalance)
      });

      setPayouts({
        green: formatEther(greenPayout),
        red: formatEther(redPayout)
      });

    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  const handleRedeem = async (tokenType: 'green' | 'red') => {
    if (loading) return;
    
    const balance = tokenType === 'green' ? balances.green : balances.red;
    if (parseFloat(balance) <= 0) {
      alert(`You have no ${tokenType} tokens to redeem!`);
      return;
    }

    try {
      setLoading(true);
      const marketContract = getContract('market');
      const tokenContract = getContract(tokenType === 'green' ? 'greenToken' : 'redToken');
      
      if (!marketContract || !tokenContract) throw new Error('Contract not found');

      const tokenAddress = tokenType === 'green' 
        ? CONTRACT_ADDRESSES.greenToken 
        : CONTRACT_ADDRESSES.redToken;

      const balanceBN = parseEther(balance);

      const tx1 = await tokenContract.approve(CONTRACT_ADDRESSES.market, balanceBN);
      await tx1.wait();

      const tx2 = await marketContract.redeemTokens(tokenAddress);
      await tx2.wait();

      alert(`✅ Successfully redeemed ${payouts[tokenType]} USDT!`);
      
      fetchBalances();
      if (onRedeem) onRedeem();
    } catch (error: any) {
      console.error("Redeem error:", error);
      alert("❌ Redeem failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const canRedeem = (tokenType: 'green' | 'red') => {
    if (!marketInfo || !marketInfo.resolved) return false;
    const outcome = Number(marketInfo.outcome);
    const balance = parseFloat(tokenType === 'green' ? balances.green : balances.red);
    
    return (tokenType === 'green' && outcome === 1 && balance > 0) ||
           (tokenType === 'red' && outcome === 2 && balance > 0);
  };

  const getWinningToken = () => {
    if (!marketInfo || !marketInfo.resolved) return null;
    return Number(marketInfo.outcome) === 1 ? 'green' : 'red';
  };

  const winningToken = getWinningToken();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
      <div className="flex items-center mb-6">
        <Coins className="w-6 h-6 mr-2 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-800">Your Tokens</h2>
      </div>

      {/* USDT Balance */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-blue-600" />
            <span className="font-semibold text-blue-800">USDT Balance</span>
          </div>
          <span className="text-xl font-bold text-blue-900">{parseFloat(balances.usdt).toFixed(2)} USDT</span>
        </div>
      </div>

      {/* Outcome Tokens */}
      <div className="space-y-4">
        {/* Green Tokens */}
        <div className={`p-4 rounded-lg border-2 ${
          winningToken === 'green' 
            ? 'border-green-500 bg-green-50 glow-green' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <span className="text-2xl mr-2">🏎️</span>
              <div>
                <h3 className="font-bold text-green-800">Green Car Tokens</h3>
                <p className="text-sm text-green-600">
                  {winningToken === 'green' ? '🏆 WINNING TOKEN!' : marketInfo?.resolved ? '❌ Losing Token' : 'Pending'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900">{parseFloat(balances.green).toFixed(2)}</p>
              <p className="text-sm text-green-700">tokens</p>
            </div>
          </div>
          
          {winningToken === 'green' && parseFloat(balances.green) > 0 && (
            <div className="mt-3 p-2 bg-green-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-green-800 font-medium">Potential Payout:</span>
                <span className="text-green-900 font-bold">{parseFloat(payouts.green).toFixed(2)} USDT</span>
              </div>
            </div>
          )}
          
          <button
            onClick={() => handleRedeem('green')}
            disabled={loading || !canRedeem('green')}
            className={`w-full mt-3 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
              loading || !canRedeem('green')
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Redeeming...
              </>
            ) : canRedeem('green') ? (
              '🏆 Redeem for USDT'
            ) : (
              marketInfo?.resolved ? '❌ Not a winning token' : '⏳ Waiting for resolution'
            )}
          </button>
        </div>

        {/* Red Tokens */}
        <div className={`p-4 rounded-lg border-2 ${
          winningToken === 'red' 
            ? 'border-red-500 bg-red-50 glow-red' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <span className="text-2xl mr-2">🏁</span>
              <div>
                <h3 className="font-bold text-red-800">Red Car Tokens</h3>
                <p className="text-sm text-red-600">
                  {winningToken === 'red' ? '🏆 WINNING TOKEN!' : marketInfo?.resolved ? '❌ Losing Token' : 'Pending'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-900">{parseFloat(balances.red).toFixed(2)}</p>
              <p className="text-sm text-red-700">tokens</p>
            </div>
          </div>
          
          {winningToken === 'red' && parseFloat(balances.red) > 0 && (
            <div className="mt-3 p-2 bg-red-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-red-800 font-medium">Potential Payout:</span>
                <span className="text-red-900 font-bold">{parseFloat(payouts.red).toFixed(2)} USDT</span>
              </div>
            </div>
          )}
          
          <button
            onClick={() => handleRedeem('red')}
            disabled={loading || !canRedeem('red')}
            className={`w-full mt-3 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
              loading || !canRedeem('red')
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Redeeming...
              </>
            ) : canRedeem('red') ? (
              '🏆 Redeem for USDT'
            ) : (
              marketInfo?.resolved ? '❌ Not a winning token' : '⏳ Waiting for resolution'
            )}
          </button>
        </div>
      </div>

      {/* Market Status */}
      {!marketInfo?.resolved && (
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
          <p className="text-yellow-800 text-sm">
            Tokens can only be redeemed after the race finishes and the oracle announces the winner.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-bold text-gray-800 mb-2">How Redemption Works</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• After the race ends, the oracle announces the winning car</li>
          <li>• Only winning tokens can be redeemed for USDT</li>
          <li>• Your payout depends on the total prize pool and token supply</li>
          <li>• Losing tokens become worthless after resolution</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenBalances;
