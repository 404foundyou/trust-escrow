const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("Escrow", function () {
  async function deployEscrowFixture() {
    const [client, freelancer, arbiter, stranger] = await ethers.getSigners();

    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy(client.address, freelancer.address, arbiter.address);

    return { escrow, client, freelancer, arbiter, stranger };
  }

  describe("Deployment", function () {
    it("should set the correct client, freelancer, and arbiter", async function () {
      const { escrow, client, freelancer, arbiter } = await loadFixture(deployEscrowFixture);

      expect(await escrow.client()).to.equal(client.address);
      expect(await escrow.freelancer()).to.equal(freelancer.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
    });

    it("should start in Created status", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);

      expect(await escrow.status()).to.equal(0); // 0 = Created in our enum
    });

    it("should reject deployment with zero address as client", async function () {
      const [, freelancer, arbiter] = await ethers.getSigners();
      const Escrow = await ethers.getContractFactory("Escrow");

      await expect(
        Escrow.deploy(ethers.ZeroAddress, freelancer.address, arbiter.address)
      ).to.be.revertedWith("Client cannot be zero address");
    });

    it("should reject deployment if client and freelancer are the same address", async function () {
      const [client, , arbiter] = await ethers.getSigners();
      const Escrow = await ethers.getContractFactory("Escrow");

      await expect(
        Escrow.deploy(client.address, client.address, arbiter.address)
      ).to.be.revertedWith("Client and freelancer must differ");
    });
  });

  describe("fundJob", function () {
    it("should let the client fund the job and move to Funded status", async function () {
      const { escrow, client } = await loadFixture(deployEscrowFixture);
      const fundAmount = ethers.parseEther("1.0");

      await expect(escrow.connect(client).fundJob({ value: fundAmount }))
        .to.emit(escrow, "JobFunded")
        .withArgs(fundAmount);

      expect(await escrow.status()).to.equal(1); // 1 = Funded
      expect(await escrow.amount()).to.equal(fundAmount);
    });

    it("should set a delivery deadline roughly 7 days out", async function () {
      const { escrow, client } = await loadFixture(deployEscrowFixture);
      const fundAmount = ethers.parseEther("1.0");

      const tx = await escrow.connect(client).fundJob({ value: fundAmount });
      const block = await ethers.provider.getBlock(tx.blockNumber);

      const deadline = await escrow.deliveryDeadline();
      const expectedDeadline = block.timestamp + 7 * 24 * 60 * 60;

      expect(deadline).to.equal(expectedDeadline);
    });

    it("should reject funding from anyone other than the client", async function () {
      const { escrow, freelancer } = await loadFixture(deployEscrowFixture);
      const fundAmount = ethers.parseEther("1.0");

      await expect(
        escrow.connect(freelancer).fundJob({ value: fundAmount })
      ).to.be.revertedWith("Not client");
    });

    it("should reject funding with zero value", async function () {
      const { escrow, client } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(client).fundJob({ value: 0 })
      ).to.be.revertedWith("Must send funds to fund the job");
    });

    it("should reject funding twice", async function () {
      const { escrow, client } = await loadFixture(deployEscrowFixture);
      const fundAmount = ethers.parseEther("1.0");

      await escrow.connect(client).fundJob({ value: fundAmount });

      await expect(
        escrow.connect(client).fundJob({ value: fundAmount })
      ).to.be.revertedWith("Invalid state for this action");
    });
  });

  describe("markDelivered", function () {
    async function fundedEscrowFixture() {
      const base = await deployEscrowFixture();
      const fundAmount = ethers.parseEther("1.0");
      await base.escrow.connect(base.client).fundJob({ value: fundAmount });
      return { ...base, fundAmount };
    }

    it("should let the freelancer mark the job delivered", async function () {
      const { escrow, freelancer } = await loadFixture(fundedEscrowFixture);

      await expect(escrow.connect(freelancer).markDelivered())
        .to.emit(escrow, "Delivered");

      expect(await escrow.status()).to.equal(2); // 2 = Delivered
    });

    it("should reject markDelivered from anyone other than the freelancer", async function () {
      const { escrow, client, stranger } = await loadFixture(fundedEscrowFixture);

      await expect(
        escrow.connect(client).markDelivered()
      ).to.be.revertedWith("Not freelancer");

      await expect(
        escrow.connect(stranger).markDelivered()
      ).to.be.revertedWith("Not freelancer");
    });

    it("should reject markDelivered if job was never funded", async function () {
      const { escrow, freelancer } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(freelancer).markDelivered()
      ).to.be.revertedWith("Invalid state for this action");
    });

    it("should reject markDelivered twice", async function () {
      const { escrow, freelancer } = await loadFixture(fundedEscrowFixture);

      await escrow.connect(freelancer).markDelivered();

      await expect(
        escrow.connect(freelancer).markDelivered()
      ).to.be.revertedWith("Invalid state for this action");
    });
  });

  describe("confirmDelivery", function () {
    async function deliveredEscrowFixture() {
      const base = await deployEscrowFixture();
      const fundAmount = ethers.parseEther("1.0");
      await base.escrow.connect(base.client).fundJob({ value: fundAmount });
      await base.escrow.connect(base.freelancer).markDelivered();
      return { ...base, fundAmount };
    }

    it("should let the client confirm and credit the freelancer's withdrawable balance", async function () {
      const { escrow, client, freelancer, fundAmount } = await loadFixture(deliveredEscrowFixture);

      await expect(escrow.connect(client).confirmDelivery())
        .to.emit(escrow, "Confirmed");

      expect(await escrow.status()).to.equal(3); // 3 = Confirmed
      expect(await escrow.pendingWithdrawals(freelancer.address)).to.equal(fundAmount);
    });

    it("should NOT transfer funds directly - only credit the balance (pull-payment check)", async function () {
      const { escrow, client, freelancer } = await loadFixture(deliveredEscrowFixture);

      const balanceBefore = await ethers.provider.getBalance(freelancer.address);
      await escrow.connect(client).confirmDelivery();
      const balanceAfter = await ethers.provider.getBalance(freelancer.address);

      // freelancer's actual wallet balance should be unchanged - they haven't withdrawn yet
      expect(balanceAfter).to.equal(balanceBefore);
    });

    it("should reject confirmDelivery from anyone other than the client", async function () {
      const { escrow, freelancer } = await loadFixture(deliveredEscrowFixture);

      await expect(
        escrow.connect(freelancer).confirmDelivery()
      ).to.be.revertedWith("Not client");
    });

    it("should reject confirmDelivery if not in Delivered status", async function () {
      const { escrow, client } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(client).confirmDelivery()
      ).to.be.revertedWith("Invalid state for this action");
    });
  });

  describe("withdraw", function () {
    async function confirmedEscrowFixture() {
      const base = await deployEscrowFixture();
      const fundAmount = ethers.parseEther("1.0");
      await base.escrow.connect(base.client).fundJob({ value: fundAmount });
      await base.escrow.connect(base.freelancer).markDelivered();
      await base.escrow.connect(base.client).confirmDelivery();
      return { ...base, fundAmount };
    }

    it("should let the freelancer withdraw their credited balance", async function () {
      const { escrow, freelancer, fundAmount } = await loadFixture(confirmedEscrowFixture);

      const balanceBefore = await ethers.provider.getBalance(freelancer.address);

      const tx = await escrow.connect(freelancer).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(freelancer.address);

      expect(balanceAfter).to.equal(balanceBefore + fundAmount - gasCost);
    });

    it("should emit Withdrawn event with correct amount", async function () {
      const { escrow, freelancer, fundAmount } = await loadFixture(confirmedEscrowFixture);

      await expect(escrow.connect(freelancer).withdraw())
        .to.emit(escrow, "Withdrawn")
        .withArgs(freelancer.address, fundAmount);
    });

    it("should zero out the balance after withdrawal", async function () {
      const { escrow, freelancer } = await loadFixture(confirmedEscrowFixture);

      await escrow.connect(freelancer).withdraw();

      expect(await escrow.pendingWithdrawals(freelancer.address)).to.equal(0);
    });

    it("should reject withdrawal if nothing is owed", async function () {
      const { escrow, client } = await loadFixture(confirmedEscrowFixture);

      await expect(
        escrow.connect(client).withdraw()
      ).to.be.revertedWith("Nothing to withdraw");
    });

    it("should reject a second withdrawal after the first succeeds", async function () {
      const { escrow, freelancer } = await loadFixture(confirmedEscrowFixture);

      await escrow.connect(freelancer).withdraw();

      await expect(
        escrow.connect(freelancer).withdraw()
      ).to.be.revertedWith("Nothing to withdraw");
    });
  });
  
  describe("raiseDispute and resolveDispute", function () {
    async function deliveredEscrowFixture() {
      const base = await deployEscrowFixture();
      const fundAmount = ethers.parseEther("1.0");
      await base.escrow.connect(base.client).fundJob({ value: fundAmount });
      await base.escrow.connect(base.freelancer).markDelivered();
      return { ...base, fundAmount };
    }

    it("should let the client raise a dispute", async function () {
      const { escrow, client } = await loadFixture(deliveredEscrowFixture);

      await expect(escrow.connect(client).raiseDispute())
        .to.emit(escrow, "Disputed")
        .withArgs(client.address);

      expect(await escrow.status()).to.equal(4); // 4 = Disputed
    });

    it("should let the freelancer raise a dispute", async function () {
      const { escrow, freelancer } = await loadFixture(deliveredEscrowFixture);

      await expect(escrow.connect(freelancer).raiseDispute())
        .to.emit(escrow, "Disputed")
        .withArgs(freelancer.address);
    });

    it("should reject dispute from a stranger", async function () {
      const { escrow, stranger } = await loadFixture(deliveredEscrowFixture);

      await expect(
        escrow.connect(stranger).raiseDispute()
      ).to.be.revertedWith("Only client or freelancer can dispute");
    });

    it("should let the arbiter resolve in favor of the freelancer", async function () {
      const { escrow, client, freelancer, arbiter, fundAmount } = await loadFixture(deliveredEscrowFixture);
      await escrow.connect(client).raiseDispute();

      await expect(escrow.connect(arbiter).resolveDispute(true))
        .to.emit(escrow, "Resolved")
        .withArgs(true);

      expect(await escrow.status()).to.equal(5); // 5 = Resolved
      expect(await escrow.pendingWithdrawals(freelancer.address)).to.equal(fundAmount);
    });

    it("should let the arbiter resolve in favor of the client", async function () {
      const { escrow, client, arbiter, fundAmount } = await loadFixture(deliveredEscrowFixture);
      await escrow.connect(client).raiseDispute();

      await escrow.connect(arbiter).resolveDispute(false);

      expect(await escrow.pendingWithdrawals(client.address)).to.equal(fundAmount);
    });

    it("should reject resolveDispute from anyone other than the arbiter", async function () {
      const { escrow, client, freelancer } = await loadFixture(deliveredEscrowFixture);
      await escrow.connect(client).raiseDispute();

      await expect(
        escrow.connect(freelancer).resolveDispute(true)
      ).to.be.revertedWith("Not arbiter");
    });

    it("should lock out confirmDelivery once disputed", async function () {
      const { escrow, client } = await loadFixture(deliveredEscrowFixture);
      await escrow.connect(client).raiseDispute();

      await expect(
        escrow.connect(client).confirmDelivery()
      ).to.be.revertedWith("Invalid state for this action");
    });
  });

  describe("claimTimeout", function () {
    async function fundedEscrowFixture() {
      const base = await deployEscrowFixture();
      const fundAmount = ethers.parseEther("1.0");
      await base.escrow.connect(base.client).fundJob({ value: fundAmount });
      return { ...base, fundAmount };
    }

    it("should reject claimTimeout before the deadline passes", async function () {
      const { escrow, client } = await loadFixture(fundedEscrowFixture);

      await expect(
        escrow.connect(client).claimTimeout()
      ).to.be.revertedWith("Delivery window has not passed yet");
    });

    it("should let the client claim a refund after the deadline passes", async function () {
      const { escrow, client, fundAmount } = await loadFixture(fundedEscrowFixture);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(escrow.connect(client).claimTimeout())
        .to.emit(escrow, "Refunded");

      expect(await escrow.status()).to.equal(6); // 6 = Refunded
      expect(await escrow.pendingWithdrawals(client.address)).to.equal(fundAmount);
    });

    it("should reject claimTimeout from anyone other than the client", async function () {
      const { escrow, freelancer } = await loadFixture(fundedEscrowFixture);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        escrow.connect(freelancer).claimTimeout()
      ).to.be.revertedWith("Not client");
    });

    it("should still let the freelancer deliver before timeout, blocking the refund path", async function () {
      const { escrow, client, freelancer } = await loadFixture(fundedEscrowFixture);

      await escrow.connect(freelancer).markDelivered();

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        escrow.connect(client).claimTimeout()
      ).to.be.revertedWith("Invalid state for this action");
    });
  });
});