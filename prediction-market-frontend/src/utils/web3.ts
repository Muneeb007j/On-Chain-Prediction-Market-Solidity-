import { ethers, type BrowserProvider, type Signer, type BigNumberish, Contract } from 'ethers';
import { NETWORK_CONFIG, CONTRACT_ADDRESSES } from '../constants/contracts';
import { MARKET_ABI, STABLECOIN_ABI, OUTCOME_TOKEN_ABI, POOL_ABI, ORACLE_ABI } from '../abis/contracts';

let provider: BrowserProvider | null = null;
let signer: Signer | null = null;
let userAddress: string | null = null;

// Contract instances cache
let contracts: { [key: string]: Contract } = {};

export const connectWallet = async (): Promise<{ provider: BrowserProvider, signer: Signer, userAddress: string }> => {
  if (window.ethereum) {
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get provider and signer
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      
      // Initialize contract instances
      initializeContracts();
      
      // Switch to local network if needed
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const targetChainId = NETWORK_CONFIG.chainId;
      console.log('Current chainId:', currentChainId, 'Target chainId:', targetChainId);
      
      if (currentChainId !== targetChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          });
        } catch (switchError: any) {
          console.log('Switch error:', switchError);
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            const networkConfig = {
              chainId: NETWORK_CONFIG.chainId,
              chainName: NETWORK_CONFIG.chainName,
              rpcUrls: NETWORK_CONFIG.rpcUrls,
              nativeCurrency: NETWORK_CONFIG.nativeCurrency
            };
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networkConfig],
            });
          }
        }
      }
      
      return { provider: provider!, signer: signer!, userAddress: userAddress! };
    } catch (error) {
      console.error("Error connecting wallet:", error);
      throw error;
    }
  } else {
    throw new Error("Please install MetaMask!");
  }
};

const initializeContracts = () => {
  if (!signer) return;
  
  contracts = {
    stablecoin: new Contract(CONTRACT_ADDRESSES.stablecoin, STABLECOIN_ABI, signer),
    market: new Contract(CONTRACT_ADDRESSES.market, MARKET_ABI, signer),
    greenToken: new Contract(CONTRACT_ADDRESSES.greenToken, OUTCOME_TOKEN_ABI, signer),
    redToken: new Contract(CONTRACT_ADDRESSES.redToken, OUTCOME_TOKEN_ABI, signer),
    pool: new Contract(CONTRACT_ADDRESSES.pool, POOL_ABI, signer),
    oracle: new Contract(CONTRACT_ADDRESSES.oracle, ORACLE_ABI, signer)
  };
};

export const getContract = (contractName: string): Contract | null => {
  if (!contracts[contractName] && signer) {
    initializeContracts();
  }
  return contracts[contractName] || null;
};

export const disconnectWallet = () => {
  provider = null;
  signer = null;
  userAddress = null;
  contracts = {};
};

export const getSigner = (): Signer | null => signer;
export const getProvider = (): BrowserProvider | null => provider;
export const getUserAddress = (): string | null => userAddress;

// Utility functions for common operations
export const formatEther = (value: BigNumberish): string => ethers.formatEther(value);
export const parseEther = (value: string): bigint => ethers.parseEther(value);
export const formatUnits = (value: BigNumberish, decimals: number): string => ethers.formatUnits(value, decimals);
export const parseUnits = (value: string, decimals: number): bigint => ethers.parseUnits(value, decimals);

// Listen for account changes
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      window.location.reload();
    }
  });
  
  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });
}

// Type declarations
declare global {
  interface Window {
    ethereum?: any;
  }
}
