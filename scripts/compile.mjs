import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import solc from "solc";
import { artifactPath, contractPath } from "./lib/paths.mjs";

export async function compileShellNft({ write = true, outputPath = artifactPath } = {}) {
  const source = await readFile(contractPath, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "ShellNft.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
  if (errors.length > 0) {
    const message = errors.map((entry) => entry.formattedMessage ?? entry.message).join("\n");
    throw new Error(`Solidity compile failed:\n${message}`);
  }

  const contract = output.contracts?.["ShellNft.sol"]?.ShellNft;
  if (!contract?.abi || !contract?.evm?.bytecode?.object) {
    throw new Error("Missing ABI/bytecode output for ShellNft");
  }

  const artifact = {
    contractName: "ShellNft",
    sourcePath: "contracts/ShellNft.sol",
    solcVersion: solc.version(),
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  };

  if (write) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }

  return artifact;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const artifact = await compileShellNft();
  console.log(`compiled ${artifactPath}`);
  console.log(`contract=${artifact.contractName} bytecode=${(artifact.bytecode.length - 2) / 2} bytes`);
}
