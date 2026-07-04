import { readFile } from "node:fs/promises";
import { createShellProvider } from "shell-sdk";
import { readContract } from "shell-sdk/contracts";
import { parseTokenId, shellNftAbi } from "./lib/contract.mjs";
import { readConfig } from "./lib/env.mjs";
import { deploymentPath } from "./lib/paths.mjs";

async function resolveContractAddress(config) {
  if (config.contractAddress) return config.contractAddress;
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8"));
  return deployment.contractAddress;
}

export async function readShellNft({ tokenId = 1n } = {}) {
  const config = await readConfig();
  const contractAddress = await resolveContractAddress(config);
  const provider = createShellProvider({ rpcHttpUrl: config.rpcUrl });
  const parsedTokenId = parseTokenId(tokenId);
  const totalSupply = await readContract({
    provider,
    address: contractAddress,
    abi: shellNftAbi,
    functionName: "totalSupply",
  });
  const owner = await readContract({
    provider,
    address: contractAddress,
    abi: shellNftAbi,
    functionName: "ownerOf",
    args: [parsedTokenId],
  });
  const tokenUri = await readContract({
    provider,
    address: contractAddress,
    abi: shellNftAbi,
    functionName: "tokenURI",
    args: [parsedTokenId],
  });
  return { contractAddress, tokenId: parsedTokenId, totalSupply, owner, tokenUri };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tokenId = process.argv[2] ? parseTokenId(process.argv[2]) : 1n;
  const result = await readShellNft({ tokenId });
  console.log(`contract: ${result.contractAddress}`);
  console.log(`totalSupply: ${result.totalSupply.toString()}`);
  console.log(`ownerOf(${result.tokenId}): ${result.owner}`);
  console.log(`tokenURI(${result.tokenId}): ${result.tokenUri}`);
}
