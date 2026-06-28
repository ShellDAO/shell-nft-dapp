import { useMemo, useState } from "react";
import { decodeFunctionResult, encodeDeployData, encodeFunctionData, parseAbi } from "viem";
import { buildTransaction, createShellProvider, decryptKeystore } from "shell-sdk";

const ABI = parseAbi([
  "constructor(string name,string symbol)",
  "function mint(bytes32 to,string uri) returns (uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (bytes32)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
]);

type LogEntry = {
  id: number;
  level: "info" | "ok" | "error";
  text: string;
};

const DEFAULT_BYTECODE_PLACEHOLDER = "Run npm run compile, then paste artifacts/ShellNft.compiled.json bytecode here.";

async function rpcRequest<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`[${body.error.code}] ${body.error.message}`);
  return body.result as T;
}

async function waitForReceipt(rpcUrl: string, txHash: string): Promise<Record<string, any>> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const receipt = await rpcRequest<Record<string, any> | null>(rpcUrl, "eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Timed out waiting for ${txHash}`);
}

function assertShellAddress(value: string, fieldName: string): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${fieldName} must be 0x + 64 hex chars`);
  }
  return value.toLowerCase() as `0x${string}`;
}

export default function App() {
  const [rpcUrl, setRpcUrl] = useState("http://127.0.0.1:8545");
  const [chainId, setChainId] = useState("1337");
  const [keystoreJson, setKeystoreJson] = useState("");
  const [password, setPassword] = useState("");
  const [bytecode, setBytecode] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [tokenUri, setTokenUri] = useState("ipfs://example/shell-nft-1.json");
  const [tokenId, setTokenId] = useState("1");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastOwner, setLastOwner] = useState("");
  const [lastSupply, setLastSupply] = useState("");
  const [lastUri, setLastUri] = useState("");

  const canTransact = useMemo(() => keystoreJson.trim() && password.trim() && Number(chainId) > 0, [keystoreJson, password, chainId]);

  function log(level: LogEntry["level"], text: string) {
    setLogs((entries) => [{ id: Date.now() + Math.random(), level, text }, ...entries].slice(0, 30));
  }

  async function getSigner() {
    const keystore = JSON.parse(keystoreJson);
    return decryptKeystore(keystore, password);
  }

  async function sendTx(to: string | null, data: `0x${string}`, gasLimit: number, includePublicKey = false) {
    const signer = await getSigner();
    const from = signer.getAddress();
    const nonceHex = await rpcRequest<string>(rpcUrl, "eth_getTransactionCount", [from, "pending"]);
    const tx = buildTransaction({
      chainId: Number(chainId),
      nonce: Number(BigInt(nonceHex)),
      to,
      data,
      gasLimit,
      maxFeePerGas: 2_000_000_000,
      maxPriorityFeePerGas: 200_000_000,
    });
    const provider = createShellProvider({ rpcHttpUrl: rpcUrl });
    const signed = await signer.buildSignedTransaction({ tx, includePublicKey });
    const hash = await provider.sendTransaction(signed);
    const receipt = await waitForReceipt(rpcUrl, hash);
    if (receipt.status !== "0x1") throw new Error(`Transaction reverted: ${hash}`);
    return { hash, receipt, from };
  }

  async function run<T>(label: string, fn: () => Promise<T>) {
    setBusy(true);
    log("info", label);
    try {
      const result = await fn();
      log("ok", `${label} complete`);
      return result;
    } catch (error) {
      log("error", error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function deploy() {
    await run("Deploying ShellNft", async () => {
      if (!bytecode.trim().startsWith("0x")) throw new Error(DEFAULT_BYTECODE_PLACEHOLDER);
      const data = encodeDeployData({
        abi: ABI,
        bytecode: bytecode.trim() as `0x${string}`,
        args: ["Shell Tutorial NFT", "SNFT"],
      });
      const { hash, receipt } = await sendTx(null, data, 1_800_000, true);
      if (!receipt.contractAddress) throw new Error("Missing contractAddress in deploy receipt");
      setContractAddress(receipt.contractAddress);
      log("ok", `deploy tx ${hash}`);
      log("ok", `contract ${receipt.contractAddress}`);
    });
  }

  async function mint() {
    await run("Minting NFT", async () => {
      const signer = await getSigner();
      const to = assertShellAddress(signer.getAddress(), "owner");
      const data = encodeFunctionData({ abi: ABI, functionName: "mint", args: [to, tokenUri] });
      const { hash } = await sendTx(assertShellAddress(contractAddress, "contractAddress"), data, 180_000);
      log("ok", `mint tx ${hash}`);
    });
  }

  async function read() {
    await run("Reading NFT", async () => {
      const contract = assertShellAddress(contractAddress, "contractAddress");
      const id = BigInt(tokenId || "1");
      const totalHex = await rpcRequest<`0x${string}`>(rpcUrl, "eth_call", [
        { to: contract, data: encodeFunctionData({ abi: ABI, functionName: "totalSupply", args: [] }) },
        "latest",
      ]);
      const ownerHex = await rpcRequest<`0x${string}`>(rpcUrl, "eth_call", [
        { to: contract, data: encodeFunctionData({ abi: ABI, functionName: "ownerOf", args: [id] }) },
        "latest",
      ]);
      const uriHex = await rpcRequest<`0x${string}`>(rpcUrl, "eth_call", [
        { to: contract, data: encodeFunctionData({ abi: ABI, functionName: "tokenURI", args: [id] }) },
        "latest",
      ]);
      const total = decodeFunctionResult({ abi: ABI, functionName: "totalSupply", data: totalHex });
      const owner = decodeFunctionResult({ abi: ABI, functionName: "ownerOf", data: ownerHex });
      const uri = decodeFunctionResult({ abi: ABI, functionName: "tokenURI", data: uriHex });
      setLastSupply(total.toString());
      setLastOwner(owner);
      setLastUri(uri);
    });
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Shell NFT DAPP</h1>
            <p>Deploy and mint a Shell-native NFT with 32-byte owners.</p>
          </div>
          <span className={busy ? "status busy" : "status"}>{busy ? "Working" : "Ready"}</span>
        </header>

        <div className="grid">
          <section className="panel">
            <h2>Connection</h2>
            <label>
              RPC URL
              <input value={rpcUrl} onChange={(event) => setRpcUrl(event.target.value)} />
            </label>
            <label>
              Chain ID
              <input value={chainId} onChange={(event) => setChainId(event.target.value)} />
            </label>
            <label>
              Keystore JSON
              <textarea rows={8} value={keystoreJson} onChange={(event) => setKeystoreJson(event.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          </section>

          <section className="panel">
            <h2>Contract</h2>
            <label>
              Bytecode
              <textarea rows={6} placeholder={DEFAULT_BYTECODE_PLACEHOLDER} value={bytecode} onChange={(event) => setBytecode(event.target.value)} />
            </label>
            <label>
              Contract Address
              <input value={contractAddress} onChange={(event) => setContractAddress(event.target.value)} placeholder="0x + 64 hex" />
            </label>
            <div className="button-row">
              <button disabled={busy || !canTransact} onClick={deploy}>Deploy</button>
              <button disabled={busy || !contractAddress} onClick={read}>Read</button>
            </div>
          </section>

          <section className="panel">
            <h2>Mint</h2>
            <label>
              Token URI
              <input value={tokenUri} onChange={(event) => setTokenUri(event.target.value)} />
            </label>
            <label>
              Token ID
              <input value={tokenId} onChange={(event) => setTokenId(event.target.value)} />
            </label>
            <div className="button-row">
              <button disabled={busy || !canTransact || !contractAddress} onClick={mint}>Mint to Signer</button>
            </div>
            <dl className="results">
              <dt>Total Supply</dt>
              <dd>{lastSupply || "-"}</dd>
              <dt>Owner</dt>
              <dd>{lastOwner || "-"}</dd>
              <dt>Token URI</dt>
              <dd>{lastUri || "-"}</dd>
            </dl>
          </section>

          <section className="panel log-panel">
            <h2>Activity</h2>
            <div className="logs">
              {logs.length === 0 ? <p className="muted">No activity yet</p> : logs.map((entry) => (
                <div className={`log ${entry.level}`} key={entry.id}>{entry.text}</div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
