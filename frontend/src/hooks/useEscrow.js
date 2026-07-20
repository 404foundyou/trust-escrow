import { useState, useCallback } from "react";
import { Contract } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import EscrowABI from "../lib/EscrowABI.json";

/**
 * Hook wrapping all write actions on a single Escrow job contract,
 * plus a read helper for the connected account's pending withdrawal balance.
 */
export function useEscrow(contractAddress) {
  const { signer, account } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContract = useCallback(() => {
    if (!signer) throw new Error("Wallet not connected.");
    if (!contractAddress) throw new Error("No job contract address provided.");
    return new Contract(contractAddress, EscrowABI, signer);
  }, [signer, contractAddress]);

  // Generic runner: wraps any write call with loading/error state + tx wait
  const runTx = useCallback(async (fn) => {
    setError(null);
    setLoading(true);
    try {
      const contract = getContract();
      const tx = await fn(contract);
      await tx.wait();
      return true;
    } catch (err) {
      console.error("Escrow transaction failed:", err);
      const msg = err?.reason || err?.message || "Transaction failed.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [getContract]);

  const fundJob = useCallback(
    (amountEth) => runTx((c) => c.fundJob({ value: amountEth })),
    [runTx]
  );

  const markDelivered = useCallback(
    () => runTx((c) => c.markDelivered()),
    [runTx]
  );

  const confirmDelivery = useCallback(
    () => runTx((c) => c.confirmDelivery()),
    [runTx]
  );

  const raiseDispute = useCallback(
    () => runTx((c) => c.raiseDispute()),
    [runTx]
  );

  const claimTimeout = useCallback(
    () => runTx((c) => c.claimTimeout()),
    [runTx]
  );

  const resolveDispute = useCallback(
    (payFreelancer) => runTx((c) => c.resolveDispute(payFreelancer)),
    [runTx]
  );

  const withdraw = useCallback(
    () => runTx((c) => c.withdraw()),
    [runTx]
  );

  // Read-only: check connected account's pending withdrawal balance
  const getPendingWithdrawal = useCallback(async () => {
    if (!signer || !account || !contractAddress) return 0n;
    try {
      const contract = getContract();
      const pending = await contract.pendingWithdrawals(account);
      return pending;
    } catch (err) {
      console.error("Failed to read pending withdrawal:", err);
      return 0n;
    }
  }, [signer, account, contractAddress, getContract]);

  return {
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
  };
}