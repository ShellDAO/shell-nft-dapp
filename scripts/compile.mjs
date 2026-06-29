import { readFile } from "node:fs/promises";
import { compileSolidity, saveContractArtifact } from "shell-sdk/contracts/compiler";
import { artifactPath, contractPath } from "./lib/paths.mjs";

export async function compileShellNft({ write = true, outputPath = artifactPath } = {}) {
  const artifact = await compileSolidity({
    sources: [{ path: "contracts/ShellNft.sol", content: await readFile(contractPath, "utf8") }],
    contractName: "ShellNft",
  });
  if (write) {
    await saveContractArtifact(outputPath, artifact);
  }
  return artifact;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const artifact = await compileShellNft();
  console.log(`compiled ${artifactPath}`);
  console.log(`contract=${artifact.contractName} bytecode=${(artifact.bytecode.length - 2) / 2} bytes`);
}
