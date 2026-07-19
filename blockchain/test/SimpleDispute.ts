import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("SimpleDispute", async () => {
  const { viem } = await network.create();
  it("commits a hash and accepts a staked challenge", async () => {
    const dispute = await viem.deployContract("SimpleDispute", [100n]);
    const id = `0x${"01".repeat(32)}` as `0x${string}`;
    const hash = `0x${"ab".repeat(32)}` as `0x${string}`;
    await dispute.write.commitDecision([id, hash]);
    const [storedHash, committedAt] = await dispute.read.verifyDecision([id]);
    assert.equal(storedHash, hash); assert.ok(committedAt > 0n);
    await dispute.write.challengeDecision([id, "The income evidence was not considered correctly."], { value: 100n });
    assert.equal(await dispute.read.challengeCount([id]), 1n);
  });
});
