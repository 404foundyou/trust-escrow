import { Link } from "react-router-dom";

const steps = [
  {
    title: "Create a job",
    description: "Client defines the work and locks funds in a smart contract escrow.",
  },
  {
    title: "Freelancer delivers",
    description: "Work is completed and marked as delivered on-chain.",
  },
  {
    title: "Client confirms",
    description: "Funds release automatically once the client approves the delivery.",
  },
  {
    title: "Disputes are resolved fairly",
    description: "If something goes wrong, a neutral arbiter decides the outcome — not a platform.",
  },
];

export default function Landing() {
  return (
    <div>
      <section className="max-w-4xl mx-auto text-center px-6 py-24">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight">
          Freelance payments,{" "}
          <span className="text-teal-400">without the trust problem</span>
        </h1>
        <p className="text-slate-400 text-lg mt-6 max-w-2xl mx-auto">
          TrustEscrow locks client funds in a smart contract until work is delivered and confirmed.
          No platform ever holds your money — the code does.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link
            to="/create"
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-6 py-3 rounded-lg transition"
          >
            Create a Job
          </Link>
          <Link
            to="/dashboard"
            className="border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold px-6 py-3 rounded-lg transition"
          >
            View My Jobs
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-800 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold flex items-center justify-center mx-auto mb-4">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-slate-100 mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 px-6 py-16">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 text-center text-slate-400 text-sm">
          <div>
            <p className="text-2xl font-bold text-teal-400">100%</p>
            <p>test coverage on core contract</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-teal-400">Audited</p>
            <p>with Slither static analysis</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-teal-400">Sepolia</p>
            <p>verified & deployed on-chain</p>
          </div>
        </div>
      </section>
    </div>
  );
}