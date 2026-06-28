import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileShellNft } from "./compile.mjs";
import { buildDeployData } from "./lib/contract.mjs";
import { readConfig } from "./lib/env.mjs";
import { deploymentPath } from "./lib/paths.mjs";
import { getBalance, getChainId, loadSigner, sendShellTransaction } from "./lib/wallet.mjs";

export async function deployShellNft() {
  const config = await readConfig();
  const artifact = await compileShellNft();
  const signer = await loadSigner(config);
  const address = signer.getAddress();
  const detectedChainId = await getChainId(config.rpcUrl);
  if (detectedChainId !== config.chainId) {
    throw new Error(`SHELL_CHAIN_ID=${config.chainId} does not match RPC chain id ${detectedChainId}`);
  }

  const balance = await getBalance(config.rpcUrl, address);
  if (balance <= 0n) {
    throw new Error(`deployer has no balance: ${address}`);
  }

  const data = buildDeployData(artifact.bytecode);
  const { hash, receipt } = await sendShellTransaction({
    rpcUrl: config.rpcUrl,
    chainId: config.chainId,
    signer,
    to: null,
    data,
    gasLimit: 1_800_000,
    includePublicKey: true,
  });

  if (!receipt.contractAddress) {
    throw new Error("deploy receipt did not include contractAddress");
  }

  const deployment = {
    rpcUrl: config.rpcUrl,
    chainId: config.chainId,
    deployer: address,
    contractAddress: receipt.contractAddress,
    deployTxHash: hash,
    deployedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(deploymentPath), { recursive: true });
  await writeFile(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
  return deployment;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const deployment = await deployShellNft();
  console.log(`deployed ShellNft: ${deployment.contractAddress}`);
  console.log(`tx: ${deployment.deployTxHash}`);
  console.log(`saved: ${deploymentPath}`);
}
