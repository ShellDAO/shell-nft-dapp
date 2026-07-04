export async function rpcRequest(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) {
    throw new Error(`rpc request failed: ${response.status} ${response.statusText}`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("rpc response was not valid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("rpc response must be a JSON-RPC object");
  }
  if (body.error) {
    const code = body.error.code ?? "unknown";
    const message = body.error.message ?? "unknown error";
    throw new Error(`rpc error [${code}] ${message}`);
  }
  if (!Object.hasOwn(body, "result")) {
    throw new Error("rpc response missing result");
  }
  return body.result;
}
