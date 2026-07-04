import { readFile } from "node:fs/promises";
import { assertShellAddress } from "./contract.mjs";
import { deploymentPath } from "./paths.mjs";

export async function resolveContractAddress(config, { filePath = deploymentPath } = {}) {
  if (config.contractAddress) {
    return assertShellAddress(config.contractAddress, "SHELL_NFT_CONTRACT");
  }

  let deployment;
  try {
    deployment = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error("SHELL_NFT_CONTRACT is required when no deployment file exists");
    }
    throw error;
  }

  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)) {
    throw new Error("deployment file must contain a JSON object");
  }

  return assertShellAddress(deployment.contractAddress, "deployment.contractAddress");
}
