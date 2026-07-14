import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account, connecting, isWrongNetwork, connectWallet } = useWeb3();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-teal-400">TrustEscrow</h1>

      {account ? (
        <div className="text-center">
          <p className="text-slate-300">Connected:</p>
          <p className="font-mono text-teal-400">{account}</p>
          {isWrongNetwork && (
            <p className="text-red-400 mt-2">⚠️ Please switch to Sepolia testnet</p>
          )}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={connecting}
          className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}

export default App;