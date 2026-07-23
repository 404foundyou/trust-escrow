import { useState, useEffect, useCallback } from "react";
import { parseEther, formatEther } from "ethers";
import { useEscrow } from "../hooks/useEscrow";

export default function JobActions({ job, account, role, refetch }) {
  const {
    loading,
    error,
    fundJob,
    markDelivered,
    confirmDelivery,
    raiseDispute,
    claimTimeout,
    resolveDispute,
    withdraw,
    getPendingWithdrawal,
  } = useEscrow(job.contract_address);

  const [fundAmount, setFundAmount] = useState("");
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0n);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingWithdrawal = useCallback(async () => {
    if (!account) return;
    const pending = await getPendingWithdrawal();
    setPendingWithdrawal(pending);
  }, [account, getPendingWithdrawal]);

  useEffect(() => {
    refreshPendingWithdrawal();
  }, [refreshPendingWithdrawal, job.status]);

  // After a successful tx, backend needs a few seconds to catch up via the listener.
  // We show a "syncing" message and refetch after a short delay.
  const afterTx = async () => {
    setSyncing(true);
    await refreshPendingWithdrawal();
    setTimeout(async () => {
      await refetch();
      setSyncing(false);
    }, 4000);
  };

  const handleFund = async () => {
    if (!fundAmount || Number(fundAmount) <= 0) return;
    try {
      await fundJob(parseEther(fundAmount));
      setFundAmount("");
      await afterTx();
    } catch {
      /* error already captured in hook state */
    }
  };

  const wrapAction = (fn) => async () => {
    try {
      await fn();
      await afterTx();
    } catch {
      /* error already captured in hook state */
    }
  };

  const canWithdraw = pendingWithdrawal > 0n;

  return (
    <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-teal-300 mb-4">Actions</h2>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {syncing && (
        <p className="text-yellow-300 text-sm bg-yellow-900/20 border border-yellow-800 rounded-lg px-3 py-2 mb-4">
          Transaction confirmed — syncing latest status...
        </p>
      )}

      <div className="flex flex-col gap-3">
        {/* Status 0: Created — Client funds the job */}
        {job.status === 0 && role === "Client" && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Amount in ETH"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-teal-400 disabled:opacity-50"
            />
            <ActionButton onClick={handleFund} loading={loading} disabled={!fundAmount}>
              Fund Job
            </ActionButton>
          </div>
        )}

        {/* Status 1: Funded — Freelancer marks delivered, Client can claim timeout */}
        {job.status === 1 && role === "Freelancer" && (
          <ActionButton onClick={wrapAction(markDelivered)} loading={loading}>
            Mark Delivered
          </ActionButton>
        )}
        {job.status === 1 && role === "Client" && (
          <ActionButton onClick={wrapAction(claimTimeout)} loading={loading} variant="secondary">
            Claim Timeout (after deadline)
          </ActionButton>
        )}

        {/* Status 2: Delivered — Client confirms or disputes, Freelancer can dispute */}
        {job.status === 2 && role === "Client" && (
          <div className="flex gap-2">
            <ActionButton onClick={wrapAction(confirmDelivery)} loading={loading}>
              Confirm Delivery
            </ActionButton>
            <ActionButton onClick={wrapAction(raiseDispute)} loading={loading} variant="danger">
              Raise Dispute
            </ActionButton>
          </div>
        )}
        {job.status === 2 && role === "Freelancer" && (
          <ActionButton onClick={wrapAction(raiseDispute)} loading={loading} variant="danger">
            Raise Dispute
          </ActionButton>
        )}

        {/* Status 4: Disputed — Arbiter resolves */}
        {job.status === 4 && role === "Arbiter" && (
          <div className="flex gap-2">
            <ActionButton
              onClick={wrapAction(() => resolveDispute(true))}
              loading={loading}
            >
              Resolve: Pay Freelancer
            </ActionButton>
            <ActionButton
              onClick={wrapAction(() => resolveDispute(false))}
              loading={loading}
              variant="secondary"
            >
              Resolve: Refund Client
            </ActionButton>
          </div>
        )}

        {/* Withdraw — available whenever connected account has a pending balance */}
        {canWithdraw && (
          <ActionButton onClick={wrapAction(withdraw)} loading={loading}>
            Withdraw {formatEther(pendingWithdrawal)} ETH
          </ActionButton>
        )}

        {/* No actions available for this role/status combo */}
        {!canWithdraw &&
          !(job.status === 0 && role === "Client") &&
          !(job.status === 1 && (role === "Freelancer" || role === "Client")) &&
          !(job.status === 2 && (role === "Client" || role === "Freelancer")) &&
          !(job.status === 4 && role === "Arbiter") && (
            <p className="text-gray-500 text-sm">
              No actions available for you at this stage.
            </p>
          )}
      </div>
    </div>
  );
}

function ActionButton({ onClick, loading, disabled, variant = "primary", children }) {
  const styles = {
    primary: "bg-teal-500 hover:bg-teal-600 text-white",
    secondary: "bg-gray-700 hover:bg-gray-600 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-4 py-2 rounded-lg font-semibold disabled:opacity-50 ${styles[variant]}`}
    >
      {loading ? "Processing..." : children}
    </button>
  );
}