const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying Escrow contract with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // For now, deploying with the same address as client, freelancer, and arbiter
  // (all three roles = deployer) just to verify the deployment pipeline works.
  // We'll deploy a more realistic version with separate addresses once
  // we build the EscrowFactory in a later phase.
  const client = deployer.address;
  const freelancer = deployer.address;
  const arbiter = deployer.address;

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(client, freelancer, arbiter);

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("Escrow deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});