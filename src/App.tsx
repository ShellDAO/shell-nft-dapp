import { useMemo, useState } from "react";
import { parseAbi } from "viem";
import { createShellProvider, decryptKeystore } from "shell-sdk";
import {
  deployContract,
  readContract,
  writeContract,
  type ShellContractArtifact,
} from "shell-sdk/contracts";

const ABI = parseAbi([
  "constructor(string name,string symbol)",
  "function mint(address to,string uri) returns (uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
]);

type LogEntry = {
  id: number;
  level: "info" | "ok" | "error";
  text: string;
};

const DEFAULT_BYTECODE_PLACEHOLDER = "Run npm run compile, then paste artifacts/ShellNft.compiled.json bytecode here.";

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
      const provider = createShellProvider({ rpcHttpUrl: rpcUrl });
      const signer = await getSigner();
      const artifact: ShellContractArtifact = {
        contractName: "ShellNft",
        abi: ABI,
        bytecode: bytecode.trim() as `0x${string}`,
      };
      const result = await deployContract({
        provider,
        signer,
        chainId: Number(chainId),
        artifact,
        constructorArgs: ["Shell Tutorial NFT", "SNFT"],
        gasLimit: 1_800_000,
        includePublicKey: true,
        wait: true,
        timeoutMs: 180_000,
      });
      if (!result.contractAddress) throw new Error("Missing contractAddress in deploy receipt");
      setContractAddress(result.contractAddress);
      log("ok", `deploy tx ${result.hash}`);
      log("ok", `contract ${result.contractAddress}`);
    });
  }

  async function mint() {
    await run("Minting NFT", async () => {
      const signer = await getSigner();
      const provider = createShellProvider({ rpcHttpUrl: rpcUrl });
      const to = assertShellAddress(signer.getAddress(), "owner");
      const result = await writeContract({
        provider,
        signer,
        chainId: Number(chainId),
        address: assertShellAddress(contractAddress, "contractAddress"),
        abi: ABI,
        functionName: "mint",
        args: [to, tokenUri],
        gasLimit: 180_000,
        wait: true,
        timeoutMs: 180_000,
      });
      log("ok", `mint tx ${result.hash}`);
    });
  }

  async function read() {
    await run("Reading NFT", async () => {
      const contract = assertShellAddress(contractAddress, "contractAddress");
      const provider = createShellProvider({ rpcHttpUrl: rpcUrl });
      const id = BigInt(tokenId || "1");
      const total = await readContract({ provider, address: contract, abi: ABI, functionName: "totalSupply" });
      const owner = await readContract({ provider, address: contract, abi: ABI, functionName: "ownerOf", args: [id] });
      const uri = await readContract({ provider, address: contract, abi: ABI, functionName: "tokenURI", args: [id] });
      setLastSupply(String(total));
      setLastOwner(String(owner));
      setLastUri(String(uri));
    });
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Shell NFT DAPP</h1>
            <p>Deploy and mint a Shell-native NFT with Solidity address owners.</p>
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
