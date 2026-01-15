import React, { useState, useEffect } from 'react';
import { getContract, formatEther } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import { TrendingUp, BarChart3, Activity, Users, DollarSign } from 'lucide-react';

const PredictionPanel: React.FC = () => {
  const [marketData, setMarketData] = useState({
    greenSupply: '0',
    redSupply: '0',
    greenPrice: '0',
    redPrice: '0',
    totalBets: '0',
    totalVolume: '0',
    greenProbability: 50,
    redProbability: 50
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      
      const marketContract = getContract('market');
      const greenToken = getContract('greenToken');
      const redToken = getContract('redToken');
      const stablecoinContract = getContract('stablecoin');
      
      if (!marketContract || !greenToken || !redToken || !stablecoinContract) return;

      // Get market info
      const marketInfo = await marketContract.getMarketInfo();
      
      // Get token supplies
      const greenTotalSupply = await greenToken.totalSupply();
      const redTotalSupply = await redToken.totalSupply();
      
      // Get pool reserves for pricing
      const poolContract = getContract('pool');
      if (poolContract) {
        const [reserveA, reserveB, reserveStablecoin] = await poolContract.getReserves();
        
        // Calculate prices based on reserves
        const greenPrice = reserveStablecoin > 0 ? parseFloat(formatEther(reserveStablecoin)) / parseFloat(formatEther(reserveA)) : 1;
        const redPrice = reserveStablecoin > 0 ? parseFloat(formatEther(reserveStablecoin)) / parseFloat(formatEther(reserveB)) : 1;
        
        // Calculate probabilities based on token supply
        const greenSupplyFloat = parseFloat(formatEther(greenTotalSupply));
        const redSupplyFloat = parseFloat(formatEther(redTotalSupply));
        const totalSupply = greenSupplyFloat + redSupplyFloat;
        
        let greenProbability = 50;
        let redProbability = 50;
        
        if (totalSupply > 0) {
          // Inverse probability: More tokens sold = lower probability (people selling means less confidence)
          // More tokens bought = higher probability
          greenProbability = (greenSupplyFloat / totalSupply) * 100;
          redProbability = (redSupplyFloat / totalSupply) * 100;
        }
        
        // Calculate total volume (simplified)
        const totalVolume = parseFloat(formatEther(reserveStablecoin));
        
        setMarketData({
          greenSupply: formatEther(greenTotalSupply),
          redSupply: formatEther(redTotalSupply),
          greenPrice: greenPrice.toFixed(4),
          redPrice: redPrice.toFixed(4),
          totalBets: (greenSupplyFloat + redSupplyFloat).toFixed(0),
          totalVolume: totalVolume.toFixed(2),
          greenProbability,
          redProbability
        });
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching market data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPredictionColor = (probability: number) => {
    if (probability > 60) return 'text-green-600';
    if (probability < 40) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getPredictionLabel = (probability: number) => {
    if (probability > 70) return 'Strong Favorite';
    if (probability > 60) return 'Favorite';
    if (probability > 50) return 'Slight Favorite';
    if (probability > 40) return 'Underdog';
    if (probability > 30) return 'Strong Underdog';
    return 'Heavy Underdog';
  };

  const getMarketSentiment = () => {
    const diff = Math.abs(marketData.greenProbability - marketData.redProbability);
    if (diff < 5) return 'Balanced';
    if (diff < 15) return 'Leaning';
    return 'Strongly Biased';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-800">Live Predictions</h2>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Activity className="w-4 h-4 mr-1" />
          {loading ? 'Updating...' : `Updated ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </div>

      {/* Main Prediction Display */}
      <div className="mb-8">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Win Probability</h3>
          <div className="text-sm text-gray-600">Market Sentiment: <span className="font-medium">{getMarketSentiment()}</span></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Green Car */}
          <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="text-3xl mb-2">🏎️</div>
            <div className="text-sm font-medium text-green-700 mb-1">Green Car</div>
            <div className={`text-3xl font-bold ${getPredictionColor(marketData.greenProbability)}`}>
              {marketData.greenProbability.toFixed(1)}%
            </div>
            <div className="text-xs text-green-600 mt-1">{getPredictionLabel(marketData.greenProbability)}</div>
          </div>
          
          {/* Red Car */}
          <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
            <div className="text-3xl mb-2">🏁</div>
            <div className="text-sm font-medium text-red-700 mb-1">Red Car</div>
            <div className={`text-3xl font-bold ${getPredictionColor(marketData.redProbability)}`}>
              {marketData.redProbability.toFixed(1)}%
            </div>
            <div className="text-xs text-red-600 mt-1">{getPredictionLabel(marketData.redProbability)}</div>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            style={{ width: `${marketData.greenProbability}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow">
              {marketData.greenProbability.toFixed(1)}% vs {marketData.redProbability.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Market Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center text-blue-600 mb-1">
            <Users className="w-4 h-4 mr-1" />
            <span className="text-xs font-medium">Total Bets</span>
          </div>
          <div className="text-lg font-bold text-blue-900">{marketData.totalBets}</div>
        </div>
        
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="flex items-center text-purple-600 mb-1">
            <DollarSign className="w-4 h-4 mr-1" />
            <span className="text-xs font-medium">Total Volume</span>
          </div>
          <div className="text-lg font-bold text-purple-900">{marketData.totalVolume} USDT</div>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-green-700 mb-1">Green Tokens</div>
          <div className="text-lg font-bold text-green-900">{parseFloat(marketData.greenSupply).toFixed(0)}</div>
          <div className="text-xs text-green-600">Price: {marketData.greenPrice} USDT</div>
        </div>
        
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-red-700 mb-1">Red Tokens</div>
          <div className="text-lg font-bold text-red-900">{parseFloat(marketData.redSupply).toFixed(0)}</div>
          <div className="text-xs text-red-600">Price: {marketData.redPrice} USDT</div>
        </div>
      </div>

      {/* Prediction Analysis */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
        <h4 className="font-bold text-indigo-800 mb-3 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Market Analysis
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Market Leader:</span>
            <span className={`font-bold ${marketData.greenProbability > marketData.redProbability ? 'text-green-700' : 'text-red-700'}`}>
              {marketData.greenProbability > marketData.redProbability ? '🏎️ Green Car' : '🏁 Red Car'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Confidence Level:</span>
            <span className="font-bold text-indigo-700">
              {Math.abs(marketData.greenProbability - marketData.redProbability).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Market Depth:</span>
            <span className="font-bold text-purple-700">
              {parseFloat(marketData.totalVolume) > 1000 ? 'High' : parseFloat(marketData.totalVolume) > 100 ? 'Medium' : 'Low'}
            </span>
          </div>
        </div>
      </div>

      {/* How Predictions Work */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-bold text-gray-800 mb-2">📊 How Predictions Work</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Probabilities are calculated based on token supply and trading volume</li>
          <li>• More tokens bought = Higher confidence in that outcome</li>
          <li>• Token prices reflect market sentiment and liquidity</li>
          <li>• Predictions update in real-time as people place bets</li>
          <li>• This is not financial advice - always do your own research</li>
        </ul>
      </div>
    </div>
  );
};

export default PredictionPanel;
