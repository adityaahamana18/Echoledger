import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("DecisionHashRegistry", async () => {
  const { viem } = await network.create();
  it("anchors and verifies a decision hash", async () => {
    const registry = await viem.deployContract("DecisionHashRegistry");
    const hash = `0x${"ab".repeat(32)}` as `0x${string}`;
    await registry.write.anchor([hash]);
    const [anchored, anchoredAt, anchoredBy] = await registry.read.verify([hash]);
    assert.equal(anchored, true);
    assert.ok(anchoredAt > 0n);
    assert.notEqual(anchoredBy, "0x0000000000000000000000000000000000000000");
  });
});
