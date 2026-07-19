// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @notice Immutable registry of EchoLedger decision fingerprints.
contract DecisionHashRegistry {
  struct Anchor { uint64 anchoredAt; address anchoredBy; }
  mapping(bytes32 => Anchor) private anchors;

  event DecisionAnchored(bytes32 indexed decisionHash, address indexed anchoredBy, uint64 anchoredAt);

  function anchor(bytes32 decisionHash) external {
    require(decisionHash != bytes32(0), "Hash required");
    require(anchors[decisionHash].anchoredAt == 0, "Hash already anchored");
    uint64 timestamp = uint64(block.timestamp);
    anchors[decisionHash] = Anchor(timestamp, msg.sender);
    emit DecisionAnchored(decisionHash, msg.sender, timestamp);
  }

  function verify(bytes32 decisionHash) external view returns (bool anchored, uint64 anchoredAt, address anchoredBy) {
    Anchor memory record = anchors[decisionHash];
    return (record.anchoredAt != 0, record.anchoredAt, record.anchoredBy);
  }
}
