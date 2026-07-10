const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("EscrowFactory", function () {
  async function deployFactoryFixture() {
    const [client, freelancer, arbiter, stranger] = await ethers.getSigners();

    const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
    const factory = await EscrowFactory.deploy();

    return { factory, client, freelancer, arbiter, stranger };
  }

  describe("createJob", function () {
    it("should deploy a new Escrow contract and return its address", async function () {
      const { factory, client, freelancer, arbiter } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(client).createJob(freelancer.address, arbiter.address);
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "JobCreated");

      expect(event).to.not.be.undefined;
      expect(event.args.client).to.equal(client.address);
      expect(event.args.freelancer).to.equal(freelancer.address);
      expect(event.args.arbiter).to.equal(arbiter.address);
    });

    it("should set the correct roles on the newly deployed Escrow", async function () {
      const { factory, client, freelancer, arbiter } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(client).createJob(freelancer.address, arbiter.address);
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed && parsed.name === "JobCreated");

      const jobAddress = event.args.jobAddress;
      const Escrow = await ethers.getContractFactory("Escrow");
      const escrow = Escrow.attach(jobAddress);

      expect(await escrow.client()).to.equal(client.address);
      expect(await escrow.freelancer()).to.equal(freelancer.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
      expect(await escrow.status()).to.equal(0); // Created
    });

    it("should add the new job to allJobs", async function () {
      const { factory, client, freelancer, arbiter } = await loadFixture(deployFactoryFixture);

      await factory.connect(client).createJob(freelancer.address, arbiter.address);

      const allJobs = await factory.getAllJobs();
      expect(allJobs.length).to.equal(1);
    });

    it("should track multiple jobs independently", async function () {
      const { factory, client, freelancer, arbiter, stranger } = await loadFixture(deployFactoryFixture);

      await factory.connect(client).createJob(freelancer.address, arbiter.address);
      await factory.connect(stranger).createJob(freelancer.address, arbiter.address);

      const allJobs = await factory.getAllJobs();
      expect(allJobs.length).to.equal(2);
      expect(allJobs[0]).to.not.equal(allJobs[1]);
    });

    it("should revert if the underlying Escrow constructor rejects the params", async function () {
      const { factory, client } = await loadFixture(deployFactoryFixture);

      // client and freelancer being the same address should fail,
      // since Escrow's own constructor already guards against this
      await expect(
        factory.connect(client).createJob(client.address, client.address)
      ).to.be.reverted;
    });
  });

  describe("getJobsCount", function () {
    it("should return 0 for a fresh factory", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);

      expect(await factory.getJobsCount()).to.equal(0);
    });

    it("should increment as jobs are created", async function () {
      const { factory, client, freelancer, arbiter } = await loadFixture(deployFactoryFixture);

      await factory.connect(client).createJob(freelancer.address, arbiter.address);
      expect(await factory.getJobsCount()).to.equal(1);

      await factory.connect(client).createJob(freelancer.address, arbiter.address);
      expect(await factory.getJobsCount()).to.equal(2);
    });
  });
});