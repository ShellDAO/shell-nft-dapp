import { readFile } from "node:fs/promises";
import {
  decodeOwnerOf,
  decodeTokenUri,
  decodeTotalSupply,
  encodeOwnerOf,
  encodeTokenUri,
  encodeTotalSupply,
} from "./lib/contract.mjs";
import { readConfig } from "./lib/env.mjs";
import { deploymentPath } from "./lib/paths.mjs";
import { ethCall } from "./lib/rpc.mjs";

async function resolveContractAddress(config) {
  if (config.contractAddress) return config.contractAddress;
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8"));
  return deployment.contractAddress;
}

export async function readShellNft({ tokenId = 1n } = {}) {
  const config = await readConfig();
  const contractAddress = await resolveContractAddress(config);
  const totalSupply = decodeTotalSupply(await ethCall(config.rpcUrl, contractAddress, encodeTotalSupply()));
  const owner = decodeOwnerOf(await ethCall(config.rpcUrl, contractAddress, encodeOwnerOf(tokenId)));
  const tokenUri = decodeTokenUri(await ethCall(config.rpcUrl, contractAddress, encodeTokenUri(tokenId)));
  return { contractAddress, tokenId: BigInt(tokenId), totalSupply, owner, tokenUri };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tokenId = process.argv[2] ? BigInt(process.argv[2]) : 1n;
  const result = await readShellNft({ tokenId });
  console.log(`contract: ${result.contractAddress}`);
  console.log(`totalSupply: ${result.totalSupply.toString()}`);
  console.log(`ownerOf(${result.tokenId}): ${result.owner}`);
  console.log(`tokenURI(${result.tokenId}): ${result.tokenUri}`);
}
