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
