import assert from "node:assert/strict";
import test from "node:test";
import { decodeFunctionData } from "viem";
import { encodeMint } from "../scripts/lib/contract.mjs";
import { compileShellNft } from "../scripts/compile.mjs";

test("compileShellNft returns ShellNft ABI and bytecode without writing", async () => {
  const artifact = await compileShellNft({ write: false });
  assert.equal(artifact.contractName, "ShellNft");
  assert.match(artifact.bytecode, /^0x[0-9a-f]+$/i);
  assert.ok(artifact.bytecode.length > 200);
  const names = artifact.abi.map((entry) => entry.name).filter(Boolean);
  assert.ok(names.includes("mint"));
  assert.ok(names.includes("ownerOf"));
  assert.ok(names.includes("tokenURI"));
  assert.ok(names.includes("totalSupply"));
});

// Decode helper calldata with the compiled contract ABI, not the helper's own ABI.
test("mint calldata preserves high owner bytes at the compiled contract boundary", async () => {
  const artifact = await compileShellNft({ write: false });
  const owner = `0x${"ab".repeat(32)}`;
  const decoded = decodeFunctionData({ abi: artifact.abi, data: encodeMint(owner, "ipfs://nft/1") });
  assert.equal(decoded.functionName, "mint");
  assert.deepEqual(decoded.args, [owner, "ipfs://nft/1"]);
  assert.equal(artifact.abi.find((entry) => entry.name === "mint").inputs[0].type, "bytes32");
  assert.equal(artifact.abi.find((entry) => entry.name === "ownerOf").outputs[0].type, "bytes32");
});
