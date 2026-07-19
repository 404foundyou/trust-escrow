import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useEscrowFactory } from "../hooks/useEscrowFactory";

export default function CreateJob() {
  const { account, connectWallet, isWrongNetwork, connecting } = useWeb3();
  const { createJob, loading, error } = useEscrowFactory();
  const navigate = useNavigate();

  const [freelancer, setFreelancer] = useState("");
  const [arbiter, setArbiter] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const jobAddress = await createJob(freelancer.trim(), arbiter.trim());
      navigate(`/job/${jobAddress}`);
    } catch {
      // error is already captured in hook's `error` state, nothing more to do here
    }
  };

  // --- Guard: wallet not connected ---
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <h1 className="text-3xl font-bold text-teal-400">Create a Job</h1>
        <p className="text-gray-400">Connect your wallet to create a new escrow job.</p>
        <button
          onClick={connectWallet}
          disabled={connecting}
          className="px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      </div>
    );
  }

  // --- Guard: wrong network ---
  if (isWrongNetwork) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <h1 className="text-3xl font-bold text-teal-400">Create a Job</h1>
        <p className="text-red-400">
          Please switch MetaMask to the Sepolia network to continue.
        </p>
      </div>
    );
  }

  // --- Main form ---
  return (
    <div className="flex flex-col items-center py-16 px-4">
      <h1 className="text-4xl font-bold text-teal-400 mb-8">Create a New Job</h1>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col gap-5 bg-gray-900 p-6 rounded-xl border border-gray-800"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="freelancer" className="text-sm text-gray-300">
            Freelancer Address
          </label>
          <input
            id="freelancer"
            type="text"
            placeholder="0x..."
            value={freelancer}
            onChange={(e) => setFreelancer(e.target.value)}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-teal-400 disabled:opacity-50"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="arbiter" className="text-sm text-gray-300">
            Arbiter Address
          </label>
          <input
            id="arbiter"
            type="text"
            placeholder="0x..."
            value={arbiter}
            onChange={(e) => setArbiter(e.target.value)}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-teal-400 disabled:opacity-50"
            required
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 disabled:opacity-50"
        >
          {loading ? "Creating job..." : "Create Job"}
        </button>
      </form>
    </div>
  );
}