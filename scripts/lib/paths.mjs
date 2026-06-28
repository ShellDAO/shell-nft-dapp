import path from "node:path";
import { fileURLToPath } from "node:url";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "../..");
export const contractPath = path.join(repoRoot, "contracts", "ShellNft.sol");
export const artifactPath = path.join(repoRoot, "artifacts", "ShellNft.compiled.json");
export const deploymentPath = path.join(repoRoot, "deployments", "local.json");
