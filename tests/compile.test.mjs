import assert from "node:assert/strict";
import test from "node:test";
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
