// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Escrow - holds funds for a single freelance job until released
contract Escrow is ReentrancyGuard {
    enum Status { Created, Funded, Delivered, Confirmed, Disputed, Resolved, Refunded }

    address public immutable client;
    address public immutable freelancer;
    address public immutable arbiter;

    uint256 public amount;
    Status public status;
    uint256 public deliveryDeadline;

    uint256 public constant DELIVERY_WINDOW = 7 days;

    mapping(address => uint256) public pendingWithdrawals;

    event JobFunded(uint256 amount);
    event Delivered();
    event Confirmed();
    event Disputed(address indexed by);
    event Resolved(bool paidFreelancer);
    event Refunded();
    event Withdrawn(address indexed who, uint256 amount);

    modifier onlyClient() {
        require(msg.sender == client, "Not client");
        _;
    }

    modifier onlyFreelancer() {
        require(msg.sender == freelancer, "Not freelancer");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Not arbiter");
        _;
    }

    modifier inStatus(Status _status) {
        require(status == _status, "Invalid state for this action");
        _;
    }

    constructor(address _client, address _freelancer, address _arbiter) {
        require(_client != address(0), "Client cannot be zero address");
        require(_freelancer != address(0), "Freelancer cannot be zero address");
        require(_arbiter != address(0), "Arbiter cannot be zero address");
        require(_client != _freelancer, "Client and freelancer must differ");

        client = _client;
        freelancer = _freelancer;
        arbiter = _arbiter;
        status = Status.Created;
    }

    function fundJob() external payable onlyClient inStatus(Status.Created) {
        require(msg.value > 0, "Must send funds to fund the job");
        amount = msg.value;
        status = Status.Funded;
        deliveryDeadline = block.timestamp + DELIVERY_WINDOW;
        emit JobFunded(msg.value);
    }

    function markDelivered() external onlyFreelancer inStatus(Status.Funded) {
        status = Status.Delivered;
        emit Delivered();
    }

    function confirmDelivery() external onlyClient inStatus(Status.Delivered) {
        status = Status.Confirmed;
        pendingWithdrawals[freelancer] += amount;
        emit Confirmed();
    }

    function raiseDispute() external inStatus(Status.Delivered) {
        require(msg.sender == client || msg.sender == freelancer, "Only client or freelancer can dispute");
        status = Status.Disputed;
        emit Disputed(msg.sender);
    }

    function claimTimeout() external onlyClient inStatus(Status.Funded) {
        require(block.timestamp >= deliveryDeadline, "Delivery window has not passed yet");
        status = Status.Refunded;
        pendingWithdrawals[client] += amount;
        emit Refunded();
    }

    function resolveDispute(bool payFreelancer) external onlyArbiter inStatus(Status.Disputed) {
        status = Status.Resolved;
        address recipient = payFreelancer ? freelancer : client;
        pendingWithdrawals[recipient] += amount;
        emit Resolved(payFreelancer);
    }

    function withdraw() external nonReentrant {
        uint256 payout = pendingWithdrawals[msg.sender];
        require(payout > 0, "Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Withdrawal transfer failed");

        emit Withdrawn(msg.sender, payout);
    }
}