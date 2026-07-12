const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying EscrowFactory with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
  const factory = await EscrowFactory.deploy();

  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("EscrowFactory deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});