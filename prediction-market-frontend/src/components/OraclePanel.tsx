import React, { useState, useEffect } from 'react';
import { getContract, getUserAddress, formatEther } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import { Eye, Crown, AlertTriangle, Clock } from 'lucide-react';

interface OraclePanelProps {
  onResolve?: () => void;
}

const OraclePanel: React.FC<OraclePanelProps> = ({ onResolve }) => {
  const [isOracle, setIsOracle] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const updateTimeLeft = () => {
    if (!marketInfo) return;
    
    const now = Math.floor(Date.now() / 1000);
    if (now > Number(marketInfo.endTime)) {
      setTimeLeft("Race ended - ready for resolution");
    } else {
      const seconds = Number(marketInfo.endTime) - now;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      setTimeLeft(`${hours}h ${minutes}m ${secs}s`);
    }
  };

  const checkPermissions = async () => {
    try {
      const userAddress = getUserAddress();
      if (!userAddress) return;
      
      const marketContract = getContract('market');
      if (!marketContract) return;
      
      const owner = await marketContract.owner();
      setIsOwner(owner.toLowerCase() === userAddress.toLowerCase());

      const oracleAddress = await marketContract.oracle();
      setIsOracle(oracleAddress.toLowerCase() === userAddress.toLowerCase());

    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  const fetchMarketInfo = async () => {
    try {
      const marketContract = getContract('market');
      if (!marketContract) return;

      const info = await marketContract.getMarketInfo();
      setMarketInfo(info);
    } catch (error) {
      console.error("Error fetching market info:", error);
    }
  };

  useEffect(() => {
    checkPermissions();
    fetchMarketInfo();
    const interval = setInterval(fetchMarketInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (marketInfo) {
      updateTimeLeft();
      const timer = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [marketInfo]);

  const handleResolve = async (outcome: number) => {
    if (!window.confirm(`Are you sure you want to declare ${outcome === 1 ? 'GREEN' : 'RED'} as the winner?`)) {
      return;
    }

    try {
      setLoading(true);
      const oracleContract = getContract('oracle');
      if (!oracleContract) throw new Error('Oracle contract not found');

      const tx = await oracleContract.resolveRace(CONTRACT_ADDRESSES.market, outcome);
      await tx.wait();

      alert(`✅ Successfully declared ${outcome === 1 ? 'GREEN CAR' : 'RED CAR'} as winner!`);
      
      fetchMarketInfo();
      if (onResolve) onResolve();
    } catch (error: any) {
      console.error("Error resolving market:", error);
      alert("❌ Failed to resolve market: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetOracle = async () => {
    try {
      setLoading(true);
      const marketContract = getContract('market');
      if (!marketContract) throw new Error('Market contract not found');

      const tx = await marketContract.setOracle(CONTRACT_ADDRESSES.oracle);
      await tx.wait();

      alert("✅ Oracle set successfully!");
      checkPermissions();
    } catch (error: any) {
      console.error("Error setting oracle:", error);
      alert("❌ Failed to set oracle: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const canResolve = isOracle && marketInfo && !marketInfo.resolved && 
    Math.floor(Date.now() / 1000) > Number(marketInfo.endTime);

  if (!isOwner && !isOracle) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
        <div className="flex items-center mb-4">
          <Eye className="w-6 h-6 mr-2 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-800">Oracle Panel</h2>
        </div>
        <div className="p-4 bg-red-50 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <div>
            <p className="text-red-700 font-medium">⛔ Access Restricted</p>
            <p className="text-red-600 text-sm mt-1">
              You need to be the contract owner or oracle to access this panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
      <div className="flex items-center mb-6">
        <Eye className="w-6 h-6 mr-2 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-800">Oracle Panel</h2>
      </div>
      
      {/* Status Info */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">Your Role</p>
            <p className="text-lg font-bold text-blue-900 flex items-center">
              {isOwner ? <><Crown className="w-4 h-4 mr-1" /> Owner</> : isOracle ? <><Eye className="w-4 h-4 mr-1" /> Oracle</> : 'User'}
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">Market Status</p>
            <p className="text-lg font-bold text-blue-900 flex items-center">
              {marketInfo?.resolved ? (
                <>🏁 RESOLVED</>
              ) : (
                <>✅ ACTIVE</>
              )}
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Clock className="w-4 h-4 mr-2 text-gray-600" />
            <p className="text-sm text-gray-700">Time Status</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{timeLeft}</p>
          <p className="text-xs text-gray-600 mt-1">
            {marketInfo?.resolved ? 'Race finished and resolved' : 
             Math.floor(Date.now() / 1000) > Number(marketInfo?.endTime) ? 
             'Race finished, awaiting resolution' : 'Race in progress'}
          </p>
        </div>
      </div>

      {/* Owner Actions */}
      {isOwner && !marketInfo?.resolved && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-bold text-yellow-800 mb-2 flex items-center">
            <Crown className="w-4 h-4 mr-2" />
            Owner Actions
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            As contract owner, you can set the oracle address.
          </p>
          <button
            onClick={handleSetOracle}
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Setting Oracle...
              </>
            ) : (
              'Set Oracle Address'
            )}
          </button>
        </div>
      )}

      {/* Oracle Actions */}
      {isOracle && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-bold text-purple-800 mb-2 flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              Oracle Resolution
            </h3>
            <p className="text-sm text-purple-700 mb-3">
              As oracle, you can declare the race winner after the race ends.
            </p>
            
            {!canResolve ? (
              <div className="p-3 bg-gray-100 rounded-lg flex items-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                <p className="text-gray-700 font-medium">
                  {marketInfo?.resolved ? '✅ Market already resolved' :
                   Math.floor(Date.now() / 1000) <= Number(marketInfo?.endTime) ? 
                   '⏳ Wait for race to end' : 'Ready to resolve'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => handleResolve(1)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300"
                >
                  🏆 Declare GREEN CAR as Winner
                </button>
                
                <button
                  onClick={() => handleResolve(2)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300"
                >
                  🏆 Declare RED CAR as Winner
                </button>
              </div>
            )}
          </div>

          {/* Current State */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold text-gray-700 mb-2">📊 Current Market State</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Resolved:</span>
                <span className={`font-bold ${marketInfo?.resolved ? 'text-green-600' : 'text-red-600'}`}>
                  {marketInfo?.resolved ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Outcome:</span>
                <span className="font-bold">
                  {marketInfo?.outcome === 1 ? 'GREEN_WINS' : 
                   marketInfo?.outcome === 2 ? 'RED_WINS' : 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Bets:</span>
                <span className="font-bold">
                  {marketInfo ? formatEther(marketInfo.totalStablecoin) : '0'} USDT
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <AlertTriangle className="text-red-500 mr-2 mt-1" />
          <div>
            <p className="font-bold text-red-800">Important Notice</p>
            <p className="text-sm text-red-700 mt-1">
              Oracle resolution is irreversible. Only resolve after confirming the actual race result.
              In production, this would be automated via Chainlink Oracle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OraclePanel;
