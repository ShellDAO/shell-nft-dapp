import assert from "node:assert/strict";
import test from "node:test";
import {
  assertShellAddress,
  decodeOwnerOf,
  decodeTokenUri,
  decodeTotalSupply,
  encodeMint,
  encodeOwnerOf,
  encodeTokenUri,
  encodeTotalSupply,
} from "../scripts/lib/contract.mjs";

const owner = `0x${"11".repeat(32)}`;

test("Shell address ABI values must be 32-byte hex at the SDK boundary", () => {
  assert.equal(assertShellAddress(owner), owner);
  assert.throws(() => assertShellAddress(`0x${"11".repeat(20)}`), /32-byte Shell/);
});

test("ABI helpers encode Shell NFT calls", () => {
  assert.match(encodeMint(owner, "ipfs://example/1.json"), /^0x/);
  assert.match(encodeOwnerOf(1n), /^0x/);
  assert.match(encodeTokenUri(1n), /^0x/);
  assert.match(encodeTotalSupply(), /^0x/);
});

test("ABI helpers decode Shell NFT read results", () => {
  assert.equal(decodeTotalSupply("0x0000000000000000000000000000000000000000000000000000000000000001"), 1n);
  assert.equal(decodeOwnerOf(owner), owner);
  const encodedString = "0x0000000000000000000000000000000000000000000000000000000000000020"
    + "0000000000000000000000000000000000000000000000000000000000000015"
    + "697066733a2f2f6578616d706c652f312e6a736f6e0000000000000000000000";
  assert.equal(decodeTokenUri(encodedString), "ipfs://example/1.json");
});
