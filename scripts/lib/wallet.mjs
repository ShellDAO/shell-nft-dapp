import { readFile } from "node:fs/promises";
import path from "node:path";
import { decryptKeystore } from "shell-sdk";
import { repoRoot } from "./paths.mjs";
import { rpcRequest } from "./rpc.mjs";

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
