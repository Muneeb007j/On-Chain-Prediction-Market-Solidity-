import React, { useState, useEffect } from 'react';
import { getContract, formatEther } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import { TrendingUp, Clock, Trophy } from 'lucide-react';

interface MarketInfo {
  greenToken: string;
  redToken: string;
  pool: string;
  outcome: number;
  resolved: boolean;
  totalStablecoin: bigint;
  endTime: bigint;
  greenSupply: bigint;
  redSupply: bigint;
}

interface MarketInfoProps {
  onUpdate?: (data: MarketInfo) => void;
}

const MarketInfo: React.FC<MarketInfoProps> = ({ onUpdate }) => {
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMarketInfo = async () => {
    try {
      const marketContract = getContract('market');
      if (!marketContract) return;

      const info = await marketContract.getMarketInfo();
      
      const marketData: MarketInfo = {
        greenToken: info.greenToken,
        redToken: info.redToken,
        pool: info.pool,
        outcome: Number(info.outcome),
        resolved: info.resolved,
        totalStablecoin: info.totalStablecoin,
        endTime: info.endTime,
        greenSupply: info.greenSupply,
        redSupply: info.redSupply
      };

      setMarketInfo(marketData);
      setLoading(false);
      
      if (onUpdate) onUpdate(marketData);
    } catch (error) {
      console.error("Error fetching market info:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketInfo();
    const interval = setInterval(fetchMarketInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
  if (!marketInfo) return null;
    
    if (marketInfo.resolved) {
      return (
        <span className="px-3 py-1 bg-danger-100 text-danger-800 rounded-full text-sm font-bold">
          🏁 RESOLVED
        </span>
      );
    } else {
      const now = Math.floor(Date.now() / 1000);
      if (now > Number(marketInfo.endTime)) {
        return (
          <span className="px-3 py-1 bg-warning-100 text-warning-800 rounded-full text-sm font-bold">
            ⏰ AWAITING RESOLUTION
          </span>
        );
      } else {
        return (
          <span className="px-3 py-1 bg-success-100 text-success-800 rounded-full text-sm font-bold">
            ✅ ACTIVE
          </span>
        );
      }
    }
  };

  const getOutcomeText = (): string => {
    if (!marketInfo) return "Loading...";
    
    if (!marketInfo.resolved) return "Pending";
    
    switch (marketInfo.outcome) {
      case 1: return "🏆 GREEN CAR WON!";
      case 2: return "🏆 RED CAR WON!";
      default: return "Unknown";
    }
  };

  const formatTime = (timestamp: bigint): string => {
    if (!timestamp) return "N/A";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const calculateTimeRemaining = (): string => {
    if (!marketInfo || marketInfo.resolved) return "Race finished";
    
    const now = Math.floor(Date.now() / 1000);
    if (now > Number(marketInfo.endTime)) return "Waiting for oracle";
    
    const seconds = Number(marketInfo.endTime) - now;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}h ${minutes}m remaining`;
  };

  const calculateOdds = () => {
    if (!marketInfo || marketInfo.greenSupply === BigInt(0) || marketInfo.redSupply === BigInt(0)) {
      return { green: "N/A", red: "N/A" };
    }
    
    const totalValue = parseFloat(formatEther(marketInfo.totalStablecoin));
    const greenSupply = parseFloat(formatEther(marketInfo.greenSupply));
    const redSupply = parseFloat(formatEther(marketInfo.redSupply));
    
    const greenPrice = totalValue / greenSupply;
    const redPrice = totalValue / redSupply;
    
    return {
      green: `1:${greenPrice.toFixed(2)}`,
      red: `1:${redPrice.toFixed(2)}`
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const odds = calculateOdds();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-800">Race Information</h2>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Market Status */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Trophy className="w-5 h-5 mr-2 text-purple-600" />
              <h3 className="font-bold text-gray-700">Race Status</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600">{getOutcomeText()}</p>
            <div className="flex items-center mt-2 text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              <p>{calculateTimeRemaining()}</p>
            </div>
          </div>

          <div className="bg-success-50 rounded-lg p-4">
            <h3 className="font-bold text-success-700 mb-2">Prize Pool</h3>
            <p className="text-2xl font-bold text-success-600">
              {formatEther(marketInfo!.totalStablecoin)} USDT
            </p>
            <p className="text-success-600 mt-2">Total bets placed</p>
          </div>
        </div>

        {/* Token Supplies */}
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-green-800 mb-2">🏎️ Green Car Tokens</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {formatEther(marketInfo!.greenSupply)}
                </p>
                <p className="text-green-700">Total Supply</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-900">{odds.green}</p>
                <p className="text-green-700">Current Odds</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-bold text-red-800 mb-2">🏁 Red Car Tokens</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-red-900">
                  {formatEther(marketInfo!.redSupply)}
                </p>
                <p className="text-red-700">Total Supply</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-900">{odds.red}</p>
                <p className="text-red-700">Current Odds</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-semibold flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Betting End Time
            </p>
            <p>{formatTime(marketInfo!.endTime)}</p>
          </div>
          <div>
            <p className="font-semibold">Green Token Address</p>
            <p className="font-mono text-xs truncate">{marketInfo!.greenToken}</p>
          </div>
          <div>
            <p className="font-semibold">Red Token Address</p>
            <p className="font-mono text-xs truncate">{marketInfo!.redToken}</p>
          </div>
        </div>
      </div>

      <button
        onClick={fetchMarketInfo}
        className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg transition-all duration-300"
      >
        🔄 Refresh Market Data
      </button>
    </div>
  );
};

export default MarketInfo;
