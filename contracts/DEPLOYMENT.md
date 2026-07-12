# TrustEscrow — Deployment Record

## Network
Ethereum Sepolia Testnet

## Contract
- **Address**: `0x061ebebf21E81d064c0824D3c54431AB0BA7a365`
- **Etherscan (verified)**: https://sepolia.etherscan.io/address/0x061ebebf21E81d064c0824D3c54431AB0BA7a365#code

## Deployment Details
- **Client (deployer)**: `0x77f9e50825523b74861669bbee929Ee72Fa79D74`
- **Freelancer**: `0x2ABa1dF50033c1e873f50B4cC75f58A64f57708d`
- **Arbiter**: `0xD61a66Beae035A283E6bEeBD51D5Eb226A4bd91D`
- **Deployed via**: Hardhat 2.28.6 + ethers.js, `scripts/deploy.js`
- **Compiler**: Solidity 0.8.28

## Notes
This deployment uses fixed addresses to verify the end-to-end deployment pipeline
(compile → connect to Sepolia → sign → deploy → verify). A production-oriented
version will use an `EscrowFactory` contract to spin up a fresh `Escrow` instance
with real, unique addresses per job.

## EscrowFactory (Phase 8)
- **Address**: `0xdD542e49128Cce25449CDB273F95794e1906de6F`
- **Etherscan (verified)**: https://sepolia.etherscan.io/address/0xdD542e49128Cce25449CDB273F95794e1906de6F#code
- **Purpose**: deploys a fresh, isolated `Escrow` contract per job via `createJob(freelancer, arbiter)`. Anyone calling this becomes the `client` of the newly created job.
- **Deployed via**: `scripts/deployFactory.js`

## Architecture Note
The original standalone `Escrow` deployment (see above) remains live and functional as our first proof-of-concept. New jobs going forward should be created through `EscrowFactory.createJob()`, which enables multiple concurrent, isolated jobs rather than a single shared contract instance.