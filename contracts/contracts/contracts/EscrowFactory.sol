// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./Escrow.sol";

/// @title EscrowFactory - deploys and tracks individual Escrow contracts, one per job
contract EscrowFactory {
    address[] public allJobs;

    event JobCreated(
        address indexed jobAddress,
        address indexed client,
        address freelancer,
        address arbiter,
        uint256 timestamp
    );

    function createJob(address freelancer, address arbiter) external returns (address) {
        Escrow newJob = new Escrow(msg.sender, freelancer, arbiter);
        address jobAddress = address(newJob);

        allJobs.push(jobAddress);

        emit JobCreated(jobAddress, msg.sender, freelancer, arbiter, block.timestamp);

        return jobAddress;
    }

    function getAllJobs() external view returns (address[] memory) {
        return allJobs;
    }

    function getJobsCount() external view returns (uint256) {
        return allJobs.length;
    }
}
