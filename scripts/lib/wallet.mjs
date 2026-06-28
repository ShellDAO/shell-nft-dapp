import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildTransaction, createShellProvider, decryptKeystore } from "shell-sdk";
import { repoRoot } from "./paths.mjs";
import { rpcRequest, waitForReceipt } from "./rpc.mjs";

export async function loadSigner(config) {
  if (!config.keystorePassword) {
    throw new Error("SHELL_KEYSTORE_PASSWORD is required");
  }
  const keystorePath = path.isAbsolute(config.keystorePath)
    ? config.keystorePath
    : path.join(repoRoot, config.keystorePath);
  const keystore = JSON.parse(await readFile(keystorePath, "utf8"));
  return decryptKeystore(keystore, config.keystorePassword);
}

export async function getPendingNonce(rpcUrl, address) {
  const nonceHex = await rpcRequest(rpcUrl, "eth_getTransactionCount", [address, "pending"]);
  return Number(BigInt(nonceHex));
}

export async function getBalance(rpcUrl, address) {
  const balanceHex = await rpcRequest(rpcUrl, "eth_getBalance", [address, "latest"]);
  return BigInt(balanceHex);
}

export async function getChainId(rpcUrl) {
  const chainIdHex = await rpcRequest(rpcUrl, "eth_chainId", []);
  return Number(BigInt(chainIdHex));
}

export async function sendShellTransaction({
  rpcUrl,
  chainId,
  signer,
  to,
  data,
  gasLimit,
  value = 0n,
  includePublicKey = false,
  maxFeePerGas = 2_000_000_000,
  maxPriorityFeePerGas = 200_000_000,
}) {
  const provider = createShellProvider({ rpcHttpUrl: rpcUrl });
  const nonce = await getPendingNonce(rpcUrl, signer.getAddress());
  const tx = buildTransaction({
    chainId,
    nonce,
    to,
    value,
    data,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  const signed = await signer.buildSignedTransaction({ tx, includePublicKey });
  const hash = await provider.sendTransaction(signed);
  const receipt = await waitForReceipt(rpcUrl, hash);
  if (receipt.status !== "0x1") {
    throw new Error(`transaction reverted: ${hash}`);
  }
  return { hash, receipt, nonce };
}
