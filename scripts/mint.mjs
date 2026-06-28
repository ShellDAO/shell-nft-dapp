import { readFile } from "node:fs/promises";
import { encodeMint } from "./lib/contract.mjs";
import { readConfig } from "./lib/env.mjs";
import { deploymentPath } from "./lib/paths.mjs";
import { loadSigner, sendShellTransaction } from "./lib/wallet.mjs";

async function resolveContractAddress(config) {
  if (config.contractAddress) return config.contractAddress;
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8"));
  return deployment.contractAddress;
}

export async function mintShellNft({ tokenUri } = {}) {
  const config = await readConfig();
  const signer = await loadSigner(config);
  const owner = signer.getAddress();
  const contractAddress = await resolveContractAddress(config);
  const uri = tokenUri ?? `${config.baseUri}shell-nft-1.json`;
  const data = encodeMint(owner, uri);
  const { hash, receipt } = await sendShellTransaction({
    rpcUrl: config.rpcUrl,
    chainId: config.chainId,
    signer,
    to: contractAddress,
    data,
    gasLimit: 180_000,
  });
  return { hash, receipt, owner, tokenUri: uri, contractAddress };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await mintShellNft({ tokenUri: process.argv[2] });
  console.log(`minted to: ${result.owner}`);
  console.log(`tokenURI: ${result.tokenUri}`);
  console.log(`tx: ${result.hash}`);
}
