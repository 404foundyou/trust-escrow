import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { SEPOLIA_CHAIN_ID } from "../lib/constants";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to use TrustEscrow.");
      return;
    }

    setConnecting(true);
    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const walletSigner = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnectWallet]);

  const isWrongNetwork = chainId !== null && chainId !== SEPOLIA_CHAIN_ID;

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        chainId,
        connecting,
        isWrongNetwork,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}