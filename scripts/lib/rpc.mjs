export async function rpcRequest(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) {
    throw new Error(`rpc request failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (body.error) {
    throw new Error(`rpc error [${body.error.code}] ${body.error.message}`);
  }
  return body.result;
}

export async function waitForReceipt(url, txHash, timeoutMs = 180_000, pollMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = await rpcRequest(url, "eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`timeout waiting for receipt: ${txHash}`);
}

export async function ethCall(url, to, data) {
  return rpcRequest(url, "eth_call", [{ to, data }, "latest"]);
}
