# TrustEscrow — Security Analysis

## Tools Used
- **Hardhat + Chai**: 33 tests covering happy paths and adversarial paths
- **solidity-coverage**: 100% statement/function/line coverage, 88.89% branch coverage
- **Slither** (v0.11.5): static analysis, 101 detectors run against the full compile path

## Design-Level Security Decisions
1. **Pull-payment pattern** — `confirmDelivery()`, `resolveDispute()`, and `claimTimeout()` only credit an internal `pendingWithdrawals` mapping. Funds are never pushed automatically; recipients must call `withdraw()` themselves. This removes the external call from the same transaction as any state-changing business logic.
2. **Checks-effects-interactions** — every function updates `status` and internal balances *before* any external call. `withdraw()` zeroes the caller's balance before sending ETH.
3. **`ReentrancyGuard` (OpenZeppelin)** — `nonReentrant` modifier on `withdraw()`, the only function that transfers ETH, as defense in depth alongside checks-effects-interactions.
4. **Enforced state machine** — the `inStatus` modifier makes invalid transitions revert at the compiler/runtime level, not just by convention. Verified with dedicated "reject if wrong state" tests for every transition.
5. **Per-job isolation** — each `Escrow` instance handles exactly one job's funds. No shared state across jobs (via `EscrowFactory`, planned in Phase 6), limiting blast radius of any single contract issue.

## Slither Findings & Analysis

| Finding | Severity | Verdict |
|---|---|---|
| `timestamp` — `block.timestamp` comparison in `claimTimeout()` | Informational | Accepted. Miner timestamp manipulation tolerance (~15s) is negligible against a 7-day window. |
| `assembly` — inline assembly in OpenZeppelin's `StorageSlot.sol` | Informational | Not our code — externally audited OpenZeppelin dependency. |
| `pragma` — differing Solidity versions between our contract and OpenZeppelin | Informational | Expected — we don't control OpenZeppelin's pragma. Our own contract is pinned to an exact version (`0.8.28`). |
| `solc-version` — version range issues | Informational | Fixed for our contract by pinning to `0.8.28` (no caret). Still applies to OpenZeppelin's own files, out of our control. |
| `low-level-calls` — `.call{value: payout}()` in `withdraw()` | Low | Accepted by design. `.call()` was chosen deliberately over `.transfer()`/`.send()`, which hardcode a 2300 gas stipend that breaks compatibility with smart-contract wallets (a known anti-pattern). Risk is mitigated by checks-effects-interactions ordering and `nonReentrant`. |




## EscrowFactory.sol
Added in Phase 8 to support multiple concurrent jobs, each deployed as an isolated `Escrow` instance.

- **7 tests**, 100% statement/branch/function/line coverage
- **Slither**: 0 new findings introduced. The factory does not duplicate `Escrow`'s validation — instead, invalid parameters (e.g., matching client/freelancer addresses) revert naturally because `Escrow`'s own constructor guards are inherited automatically when the factory deploys a new instance. This avoids validation logic drifting out of sync between the two contracts.




**Result: 0 unresolved vulnerabilities.** All findings were either dependency-only, informational and negligible given context, or a deliberate, mitigated design choice.

## Gas Report Summary
| Function | Avg Gas |
|---|---|
| fundJob | 89,291 |
| resolveDispute | 52,730 |
| claimTimeout | 53,976 |
| confirmDelivery | 51,916 |
| withdraw | 33,075 |
| raiseDispute | 27,751 |
| markDelivered | 27,389 |

`fundJob` is the most expensive call due to zero-to-nonzero storage writes (`status`, `deliveryDeadline`, `amount`) — expected EVM behavior, not an inefficiency.