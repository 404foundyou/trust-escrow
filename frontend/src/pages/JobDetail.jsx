import { useParams } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useJob } from "../hooks/useJob";
import { formatEther } from "ethers";

const STATUS_LABELS = [
  "Created",
  "Funded",
  "Delivered",
  "Confirmed",
  "Disputed",
  "Resolved",
  "Refunded",
];

const HAPPY_PATH = ["Created", "Funded", "Delivered", "Confirmed"];

export default function JobDetail() {
  const { address } = useParams();
  const { account } = useWeb3();
  const { job, loading, error, refetch } = useJob(address);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-400">Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-red-400 max-w-md text-center">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!job) return null;

  const statusLabel = STATUS_LABELS[job.status];
  const isDisputedOrResolvedBranch =
    job.status === 4 || job.status === 5 || job.status === 6;

  const role =
    account?.toLowerCase() === job.client?.toLowerCase()
      ? "Client"
      : account?.toLowerCase() === job.freelancer?.toLowerCase()
      ? "Freelancer"
      : account?.toLowerCase() === job.arbiter?.toLowerCase()
      ? "Arbiter"
      : "Observer";

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-teal-400 mb-2">Job Detail</h1>
      <p className="text-gray-500 text-sm mb-8 break-all">{job.contract_address}</p>

      {/* Role badge */}
      <div className="mb-6">
        <span className="inline-block px-3 py-1 rounded-full bg-gray-800 text-teal-300 text-sm">
          Your role: {role}
        </span>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        {!isDisputedOrResolvedBranch ? (
          <div className="flex items-center justify-between">
            {HAPPY_PATH.map((step, i) => {
              const stepIndex = STATUS_LABELS.indexOf(step);
              const isActive = stepIndex === job.status;
              const isPast = stepIndex < job.status;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? "bg-teal-400 text-black"
                        : isPast
                        ? "bg-teal-800 text-teal-200"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="ml-2 text-sm text-gray-300">{step}</span>
                  {i < HAPPY_PATH.length - 1 && (
                    <div className="flex-1 h-px bg-gray-700 mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-3 rounded-lg bg-yellow-900/20 border border-yellow-700 text-yellow-300 text-sm">
            This job took the dispute path. Current status: <strong>{statusLabel}</strong>
          </div>
        )}
      </div>

      {/* Job info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-3">
        <InfoRow label="Status" value={statusLabel} />
        <InfoRow label="Client" value={job.client} mono />
        <InfoRow label="Freelancer" value={job.freelancer} mono />
        <InfoRow label="Arbiter" value={job.arbiter} mono />
        <InfoRow
          label="Amount"
          value={job.amount ? `${formatEther(job.amount)} ETH` : "Not yet funded"}
        />
        {job.delivery_deadline && (
          <InfoRow
            label="Delivery Deadline"
            value={new Date(job.delivery_deadline * 1000).toLocaleString()}
          />
        )}
      </div>

      {/* Action panel placeholder — Pass 2 */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        Action buttons coming next (Pass 2).
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-white text-sm text-right ${mono ? "font-mono break-all" : ""}`}>
        {value}
      </span>
    </div>
  );
}