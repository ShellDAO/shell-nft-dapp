import { readFile } from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./paths.mjs";

export async function loadDotEnv(filePath = path.join(repoRoot, ".env")) {
  let content = "";
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export async function readConfig() {
  await loadDotEnv();
  return {
    rpcUrl: process.env.SHELL_RPC_URL ?? "http://127.0.0.1:8545",
    chainId: Number(process.env.SHELL_CHAIN_ID ?? "1337"),
    keystorePath: process.env.SHELL_KEYSTORE_PATH ?? "./keystore.json",
    keystorePassword: process.env.SHELL_KEYSTORE_PASSWORD ?? "",
    baseUri: process.env.NFT_BASE_URI ?? "ipfs://example/",
    contractAddress: process.env.SHELL_NFT_CONTRACT ?? "",
  };
}
