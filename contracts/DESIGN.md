# TrustEscrow — Contract Design

## Roles
- Client — creates job, deposits funds
- Freelancer — delivers work, receives payout
- Arbiter — resolves disputes only

## States
Created → Funded → Delivered → Confirmed (terminal, paid)
Funded → Refunded (terminal, timeout — freelancer never delivered)
Delivered → Disputed → Resolved (terminal, arbiter decides payout)

## Functions
| Function | Caller | Transition |
|---|---|---|
| createJob() | Client | — → Created |
| fundJob() | Client | Created → Funded |
| markDelivered() | Freelancer | Funded → Delivered |
| confirmDelivery() | Client | Delivered → Confirmed |
| raiseDispute() | Client or Freelancer | Delivered → Disputed |
| claimTimeout() | Client | Funded → Refunded (after deadline) |
| resolveDispute(bool payFreelancer) | Arbiter only | Disputed → Resolved |

## Events
JobCreated, JobFunded, Delivered, Confirmed, Disputed, Resolved, Refunded

## Security principles
- Confirmed and Refunded are terminal — no re-entry once funds move
- Disputed state locks all transfer functions except resolveDispute()
- Pull-payment pattern for withdrawals (avoid push-payment reentrancy risk)
- One contract per job via EscrowFactory (no shared state across jobs)