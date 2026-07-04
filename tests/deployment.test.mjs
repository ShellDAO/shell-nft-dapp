import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveContractAddress } from "../scripts/lib/deployment.mjs";

const contractAddress = `0x${"22".repeat(32)}`;

test("resolveContractAddress prefers configured contract address", async () => {
  const filePath = path.join(os.tmpdir(), "missing-shell-nft-deployment.json");

  assert.equal(
    await resolveContractAddress({ contractAddress }, { filePath }),
    contractAddress,
  );
});

test("resolveContractAddress reads and validates deployment files", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "shell-nft-deployment-"));
  const filePath = path.join(dir, "local.json");

  try {
    await writeFile(filePath, JSON.stringify({ contractAddress }), "utf8");

    assert.equal(
      await resolveContractAddress({ contractAddress: "" }, { filePath }),
      contractAddress,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("resolveContractAddress rejects missing and malformed deployment addresses", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "shell-nft-deployment-"));
  const filePath = path.join(dir, "local.json");

  try {
    await assert.rejects(
      () => resolveContractAddress({ contractAddress: "" }, { filePath }),
      /SHELL_NFT_CONTRACT is required/,
    );

    await writeFile(filePath, JSON.stringify({ contractAddress: "0x1234" }), "utf8");
    await assert.rejects(
      () => resolveContractAddress({ contractAddress: "" }, { filePath }),
      /deployment\.contractAddress must be a 32-byte Shell hex value/,
    );

    await writeFile(filePath, JSON.stringify([]), "utf8");
    await assert.rejects(
      () => resolveContractAddress({ contractAddress: "" }, { filePath }),
      /deployment file must contain a JSON object/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
