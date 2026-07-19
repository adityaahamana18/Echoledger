// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @notice Commits decision hashes and records economically meaningful human challenges.
contract SimpleDispute {
  uint256 public immutable minimumStake;
  address public owner;
  address public automatedChallenger;

  struct Decision { bytes32 hash; uint64 committedAt; address committedBy; }
  struct Challenge { address challenger; uint128 stake; uint64 createdAt; string reason; bool automated; }
  mapping(bytes32 => Decision) private decisions;
  mapping(bytes32 => Challenge[]) private challenges;

  event DecisionCommitted(bytes32 indexed decisionId, bytes32 indexed decisionHash, address indexed committedBy);
  event DecisionChallenged(bytes32 indexed decisionId, address indexed challenger, uint256 stake, bool automated, string reason);

  constructor(uint256 stake) { owner = msg.sender; minimumStake = stake; }
  modifier onlyOwner() { require(msg.sender == owner, "Owner only"); _; }

  function setAutomatedChallenger(address challenger) external onlyOwner { automatedChallenger = challenger; }
  function commitDecision(bytes32 decisionId, bytes32 decisionHash) external {
    require(decisionHash != bytes32(0), "Hash required");
    require(decisions[decisionId].committedAt == 0, "Decision already committed");
    decisions[decisionId] = Decision(decisionHash, uint64(block.timestamp), msg.sender);
    emit DecisionCommitted(decisionId, decisionHash, msg.sender);
  }
  function challengeDecision(bytes32 decisionId, string calldata reason) external payable {
    require(decisions[decisionId].committedAt != 0, "Unknown decision");
    require(msg.value >= minimumStake, "Insufficient stake");
    _challenge(decisionId, reason, msg.sender, uint128(msg.value), false);
  }
  function automatedChallenge(bytes32 decisionId, string calldata reason) external {
    require(msg.sender == automatedChallenger, "Automation only");
    require(decisions[decisionId].committedAt != 0, "Unknown decision");
    _challenge(decisionId, reason, msg.sender, 0, true);
  }
  function _challenge(bytes32 decisionId, string memory reason, address challenger, uint128 stake, bool automated) private {
    require(bytes(reason).length >= 20, "Reason too short");
    challenges[decisionId].push(Challenge(challenger, stake, uint64(block.timestamp), reason, automated));
    emit DecisionChallenged(decisionId, challenger, stake, automated, reason);
  }
  function verifyDecision(bytes32 decisionId) external view returns (bytes32 hash, uint64 committedAt, address committedBy) {
    Decision memory decision = decisions[decisionId]; return (decision.hash, decision.committedAt, decision.committedBy);
  }
  function challengeCount(bytes32 decisionId) external view returns (uint256) { return challenges[decisionId].length; }
}
