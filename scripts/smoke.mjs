import assert from "node:assert/strict";
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

console.log("smoke ok");
console.log(`contract: ${deployment.contractAddress}`);
console.log(`mint tx: ${minted.hash}`);
console.log(`owner: ${read.owner}`);
console.log(`tokenURI: ${read.tokenUri}`);
