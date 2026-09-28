import assert from "node:assert/strict";
import { decodeErrorResult, keccak256, stringToHex, toHex } from "viem";
import { createShellProvider } from "shell-sdk";
import { writeContract } from "shell-sdk/contracts";
import { shellNftAbi } from "./lib/contract.mjs";
import { readConfig } from "./lib/env.mjs";
import { loadSigner } from "./lib/wallet.mjs";
import { deployShellNft } from "./deploy.mjs";
import { mintShellNft } from "./mint.mjs";
import { readShellNft } from "./read.mjs";

const deployment = await deployShellNft();
const minted = await mintShellNft({ tokenUri: "ipfs://example/shell-nft-1.json" });
const read = await readShellNft({ tokenId: 1n });

assert.match(deployment.contractAddress, /^0x[0-9a-fA-F]{64}$/);
assert.equal(read.totalSupply, 1n);
assert.equal(read.owner.toLowerCase(), minted.owner.toLowerCase());
assert.equal(read.tokenUri, minted.tokenUri);
assert.equal(minted.receipt.status, "0x1");
assert.notEqual(minted.owner.slice(2, 26), "0".repeat(24), "exercise high owner bytes");
const transfer = minted.receipt.logs.find((log) => log.address.toLowerCase() === deployment.contractAddress.toLowerCase());
assert.ok(transfer, "mint emits TransferShell");
assert.deepEqual(transfer.topics.map((topic) => topic.toLowerCase()), [
  keccak256(stringToHex("TransferShell(bytes32,bytes32,uint256)")),
  toHex(0n, { size: 32 }),
  minted.owner.toLowerCase(),
  toHex(1n, { size: 32 }),
]);
assert.equal(transfer.data, "0x");

await assert.rejects(mintShellNft({ tokenUri: "" }), /contract write reverted/);
const config = await readConfig();
await assert.rejects(writeContract({
  provider: createShellProvider({ rpcHttpUrl: config.rpcUrl }),
  signer: await loadSigner(config),
  chainId: config.chainId,
  address: deployment.contractAddress,
  abi: shellNftAbi,
  functionName: "mint",
  args: [toHex(0n, { size: 32 }), "ipfs://example/invalid.json"],
  gasLimit: 180_000,
  wait: true,
  timeoutMs: 180_000,
}), /contract write reverted/);
assert.deepEqual(await readShellNft({ tokenId: 1n }), read, "rejected mints preserve supply, owner and URI");
await assert.rejects(readShellNft({ tokenId: 2n }), (error) => {
  for (let cause = error; cause; cause = cause.cause) {
    if (typeof cause.data === "string") {
      return decodeErrorResult({ data: cause.data }).args?.[0] === "ShellNft: nonexistent token";
    }
  }
  return false;
});


console.log("smoke ok");
console.log(`contract: ${deployment.contractAddress}`);
console.log(`mint tx: ${minted.hash}`);
console.log(`owner: ${read.owner}`);
console.log(`tokenURI: ${read.tokenUri}`);
