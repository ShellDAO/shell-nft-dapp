import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { rpcRequest } from "../scripts/lib/rpc.mjs";

test("rpcRequest returns JSON-RPC result", async () => {
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    let result = null;
    if (body.method === "eth_chainId") result = "0x539";
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}`;
    assert.equal(await rpcRequest(url, "eth_chainId", []), "0x539");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
