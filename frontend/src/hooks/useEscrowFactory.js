import { useState, useCallback } from "react";
import { Contract, isAddress } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { FACTORY_ADDRESS } from "../lib/constants";
import EscrowFactoryABI from "../lib/EscrowFactoryABI.json";

/**
 * Hook for creating a new escrow job via EscrowFactory.createJob().
 * Handles validation, transaction submission, and parsing the
 * JobCreated event to return the new job's contract address.
 */
export function useEscrowFactory() {
  const { signer, account } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createJob = useCallback(
    async (freelancerAddress, arbiterAddress) => {
      setError(null);

      // --- Validation ---
      if (!signer || !account) {
        const msg = "Wallet not connected.";
        setError(msg);
        throw new Error(msg);
      }
      if (!isAddress(freelancerAddress)) {
        const msg = "Invalid freelancer address.";
        setError(msg);
        throw new Error(msg);
      }
      if (!isAddress(arbiterAddress)) {
        const msg = "Invalid arbiter address.";
        setError(msg);
        throw new Error(msg);
      }
      if (freelancerAddress.toLowerCase() === arbiterAddress.toLowerCase()) {
        const msg = "Freelancer and arbiter must be different addresses.";
        setError(msg);
        throw new Error(msg);
      }
      if (freelancerAddress.toLowerCase() === account.toLowerCase()) {
        const msg = "Freelancer cannot be the same as the connected client account.";
        setError(msg);
        throw new Error(msg);
      }
      if (arbiterAddress.toLowerCase() === account.toLowerCase()) {
        const msg = "Arbiter cannot be the same as the connected client account.";
        setError(msg);
        throw new Error(msg);
      }

      setLoading(true);
      try {
        const factory = new Contract(FACTORY_ADDRESS, EscrowFactoryABI, signer);

        const tx = await factory.createJob(freelancerAddress, arbiterAddress);
        const receipt = await tx.wait();

        // Parse logs to find the JobCreated event and extract jobAddress
        let jobAddress = null;
        for (const log of receipt.logs) {
          try {
            const parsed = factory.interface.parseLog(log);
            if (parsed && parsed.name === "JobCreated") {
              jobAddress = parsed.args.jobAddress;
              break;
            }
          } catch {
            // log not from this contract's interface, skip
            continue;
          }
        }

        if (!jobAddress) {
          throw new Error("Job created, but JobCreated event not found in receipt.");
        }

        return jobAddress;
      } catch (err) {
        console.error("createJob failed:", err);
        const msg = err?.reason || err?.message || "Transaction failed.";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [signer, account]
  );

  return { createJob, loading, error };
}