import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { rpcRequest, waitForReceipt } from "../scripts/lib/rpc.mjs";

test("rpcRequest returns result and waitForReceipt polls until receipt exists", async () => {
  let receiptCalls = 0;
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    let result = null;
    if (body.method === "eth_chainId") result = "0x539";
    if (body.method === "eth_getTransactionReceipt") {
      receiptCalls += 1;
      result = receiptCalls > 1 ? { status: "0x1", contractAddress: `0x${"22".repeat(32)}` } : null;
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}`;
    assert.equal(await rpcRequest(url, "eth_chainId", []), "0x539");
    const receipt = await waitForReceipt(url, `0x${"ab".repeat(32)}`, 2_000, 10);
    assert.equal(receipt.status, "0x1");
    assert.equal(receipt.contractAddress, `0x${"22".repeat(32)}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
