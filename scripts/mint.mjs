import { createShellProvider } from "shell-sdk";
import { writeContract } from "shell-sdk/contracts";
import { shellNftAbi } from "./lib/contract.mjs";
import { resolveContractAddress } from "./lib/deployment.mjs";
import { readConfig } from "./lib/env.mjs";
import { loadSigner } from "./lib/wallet.mjs";

export async function mintShellNft({ tokenUri } = {}) {
  const config = await readConfig();
  const signer = await loadSigner(config);
  const owner = signer.getAddress();
  const provider = createShellProvider({ rpcHttpUrl: config.rpcUrl });
  const contractAddress = await resolveContractAddress(config);
  const uri = tokenUri ?? `${config.baseUri}shell-nft-1.json`;
  const { hash, receipt } = await writeContract({
    provider,
    chainId: config.chainId,
    signer,
    address: contractAddress,
    abi: shellNftAbi,
    functionName: "mint",
    args: [owner, uri],
    gasLimit: 180_000,
    wait: true,
    timeoutMs: 180_000,
  });
  return { hash, receipt, owner, tokenUri: uri, contractAddress };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await mintShellNft({ tokenUri: process.argv[2] });
  console.log(`minted to: ${result.owner}`);
  console.log(`tokenURI: ${result.tokenUri}`);
  console.log(`tx: ${result.hash}`);
}
