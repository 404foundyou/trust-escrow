import { Link, Outlet } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Layout() {
  const { account, connecting, isWrongNetwork, connectWallet } = useWeb3();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-teal-400">
          TrustEscrow
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-slate-300 hover:text-teal-400 transition">
            My Jobs
          </Link>
          <Link to="/create" className="text-slate-300 hover:text-teal-400 transition">
            Create Job
          </Link>

          {account ? (
            <div className="flex items-center gap-2">
              {isWrongNetwork && (
                <span className="text-red-400 text-sm">Wrong network</span>
              )}
              <span className="font-mono text-teal-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-sm">
                {shortenAddress(account)}
              </span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}