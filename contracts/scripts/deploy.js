const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying Escrow contract with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // client = deployer (Account 1, funded and signing this transaction)
  // freelancer and arbiter = separate MetaMask accounts, distinct addresses
  // required by the contract, no funding needed since they don't sign anything here
  const client = deployer.address;
  const freelancer = "0x2ABa1dF50033c1e873f50B4cC75f58A64f57708d";
  const arbiter = "0xD61a66Beae035A283E6bEeBD51D5Eb226A4bd91D";

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