import { useState, useEffect, useCallback } from "react";
import { BACKEND_API_URL } from "../lib/constants";

/**
 * Hook for fetching a single job's data from the backend API.
 * The backend indexes on-chain events into MongoDB, so this is
 * a fast read that avoids direct RPC calls on page load.
 */
export function useJob(contractAddress) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJob = useCallback(async () => {
    if (!contractAddress) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_API_URL}/jobs/${contractAddress}`);

      if (res.status === 404) {
        setError(
          "Job not found yet. It may still be syncing — please wait a few seconds and refresh."
        );
        setJob(null);
        return;
      }

      if (!res.ok) {
        throw new Error(`Backend returned status ${res.status}`);
      }

      const data = await res.json();
      setJob(data);
    } catch (err) {
      console.error("Failed to fetch job:", err);
      setError(err.message || "Failed to fetch job data.");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [contractAddress]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  return { job, loading, error, refetch: fetchJob };
}