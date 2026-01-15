import React, { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getUserAddress } from '../utils/web3';
import { NETWORK_CONFIG } from '../constants/contracts';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';

interface WalletConnectProps {
  onConnect: (address: string) => void;
  onDisconnect: () => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, onDisconnect }) => {
  const [address, setAddress] = useState<string>('');
  const [network, setNetwork] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const checkConnection = async () => {
    const addr = getUserAddress();
    if (addr) {
      setAddress(addr);
      setNetwork(NETWORK_CONFIG.chainName);
      if (onConnect) onConnect(addr);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      const { userAddress } = await connectWallet();
      setAddress(userAddress);
      setNetwork(NETWORK_CONFIG.chainName);
      if (onConnect) onConnect(userAddress);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setAddress('');
    setNetwork('');
    setError('');
    if (onDisconnect) onDisconnect();
  };

  const formatAddress = (addr: string): string => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
      <div className="flex items-center mb-4">
        <Wallet className="w-6 h-6 mr-2 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-800">Wallet Connection</h2>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg flex items-center">
          <AlertCircle className="w-4 h-4 text-danger-500 mr-2" />
          <p className="text-danger-700 text-sm">{error}</p>
        </div>
      )}
      
      {!address ? (
        <div className="space-y-4">
          <p className="text-gray-600">Connect your wallet to start betting on the race!</p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-3 px-4 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-300 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Connect MetaMask
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-success-50 border border-success-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-success-800 font-medium">Connected</p>
                <p className="text-lg font-bold text-success-900">{formatAddress(address)}</p>
                <p className="text-sm text-success-700">{network}</p>
              </div>
              <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <button
            onClick={handleDisconnect}
            className="w-full bg-gradient-to-r from-danger-500 to-danger-600 text-white font-bold py-2 px-4 rounded-lg hover:from-danger-600 hover:to-danger-700 transition-all duration-300 flex items-center justify-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect Wallet
          </button>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p className="flex items-center mb-1">
          <span className="mr-2">🔒</span>
          Connect to interact with the prediction market
        </p>
        <p className="flex items-center">
          <span className="mr-2">🌐</span>
          Network: {NETWORK_CONFIG.chainName} (Chain ID: {NETWORK_CONFIG.chainIdDecimal})
        </p>
      </div>
    </div>
  );
};

export default WalletConnect;
