import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import MarketInfo from './components/MarketInfo';
import BettingPanel from './components/BettingPanel';
import TokenBalances from './components/TokenBalances';
import LiquidityPanel from './components/LiquidityPanel';
import SellTokens from './components/SellTokens';
import PredictionPanel from './components/PredictionPanel';
import OraclePanel from './components/OraclePanel';
import { TrendingUp, Coins, Droplets, Eye, Menu, X, TrendingDown, BarChart3 } from 'lucide-react';

type TabType = 'betting' | 'tokens' | 'liquidity' | 'oracle' | 'sell' | 'predictions';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('betting');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleConnect = (address: string) => {
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setActiveTab('betting');
  };

  const tabs = [
    { id: 'betting' as TabType, label: 'Betting', icon: TrendingUp, color: 'blue' },
    { id: 'tokens' as TabType, label: 'My Tokens', icon: Coins, color: 'green' },
    { id: 'sell' as TabType, label: 'Sell Tokens', icon: TrendingDown, color: 'orange' },
    { id: 'predictions' as TabType, label: 'Predictions', icon: BarChart3, color: 'indigo' },
    { id: 'liquidity' as TabType, label: 'Liquidity', icon: Droplets, color: 'purple' },
    { id: 'oracle' as TabType, label: 'Oracle', icon: Eye, color: 'red' }
  ];

  const getTabColor = (tabId: TabType) => {
    switch (tabId) {
      case 'betting': return 'blue';
      case 'tokens': return 'green';
      case 'sell': return 'orange';
      case 'predictions': return 'indigo';
      case 'liquidity': return 'purple';
      case 'oracle': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-primary-600">
                🏎️ Prediction Market
              </div>
              <div className="ml-4 text-sm text-gray-600 hidden md:block">
                Race between Green & Red Cars
              </div>
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`bg-white border-b ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const color = getTabColor(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  disabled={!isConnected && tab.id !== 'betting'}
                  className={`flex items-center px-4 py-3 border-b-2 transition-all duration-200 ${
                    isActive
                      ? `border-${color}-500 text-${color}-600 bg-${color}-50`
                      : `border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50`
                  } ${!isConnected && tab.id !== 'betting' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Market Info */}
          <div className="lg:col-span-1">
            <MarketInfo />
            
            {!isConnected && (
              <div className="mt-8">
                <WalletConnect 
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
              </div>
            )}
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2">
            {isConnected ? (
              <>
                {/* Connected Wallet Info */}
                <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse mr-3"></div>
                      <span className="text-success-800 font-medium">Wallet Connected</span>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="text-sm text-danger-600 hover:text-danger-800 font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg shadow-lg p-6 card-shadow">
                  {activeTab === 'betting' && <BettingPanel />}
                  {activeTab === 'tokens' && <TokenBalances />}
                  {activeTab === 'sell' && <SellTokens />}
                  {activeTab === 'predictions' && <PredictionPanel />}
                  {activeTab === 'liquidity' && <LiquidityPanel />}
                  {activeTab === 'oracle' && <OraclePanel />}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 card-shadow text-center">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">🏎️</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Welcome to Prediction Market
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Connect your wallet to start betting on the race between Green and Red cars!
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <h3 className="font-bold text-gray-800 mb-2">How it works:</h3>
                    <ol className="text-sm text-gray-600 space-y-2">
                      <li>1. Connect your MetaMask wallet</li>
                      <li>2. Get USDT tokens for betting</li>
                      <li>3. Choose your winner (Green or Red car)</li>
                      <li>4. Place your bet and receive outcome tokens</li>
                      <li>5. Wait for the race to finish</li>
                      <li>6. Oracle announces the winner</li>
                      <li>7. Redeem winning tokens for USDT prizes</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-gray-600 text-sm">
            <p>🏎️ Prediction Market - Built with React, TypeScript, and Ethereum</p>
            <p className="mt-2">Smart contracts deployed on Hardhat Local Network</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
