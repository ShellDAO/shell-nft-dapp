import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { rpcRequest } from "../scripts/lib/rpc.mjs";

async function withRpcServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("rpcRequest returns JSON-RPC result", async () => {
  await withRpcServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    let result = null;
    if (body.method === "eth_chainId") result = "0x539";
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
  }, async (url) => {
    assert.equal(await rpcRequest(url, "eth_chainId", []), "0x539");
  });
});

test("rpcRequest rejects non-JSON responses", async () => {
  await withRpcServer((_request, response) => {
    response.setHeader("content-type", "text/plain");
    response.end("not json");
  }, async (url) => {
    await assert.rejects(() => rpcRequest(url, "eth_chainId", []), /not valid JSON/);
  });
});

test("rpcRequest rejects malformed JSON-RPC objects", async () => {
  await withRpcServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: 1 }));
  }, async (url) => {
    await assert.rejects(() => rpcRequest(url, "eth_chainId", []), /missing result/);
  });
});

test("rpcRequest includes fallback JSON-RPC error details", async () => {
  await withRpcServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: 1, error: {} }));
  }, async (url) => {
    await assert.rejects(() => rpcRequest(url, "eth_chainId", []), /rpc error \[unknown\] unknown error/);
  });
});
