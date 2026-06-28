import { decodeFunctionResult, encodeDeployData, encodeFunctionData, parseAbi } from "viem";

export const shellNftAbi = parseAbi([
  "constructor(string name,string symbol)",
  "event TransferShell(bytes32 indexed from, bytes32 indexed to, uint256 indexed tokenId)",
  "function mint(bytes32 to,string uri) returns (uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (bytes32)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
]);

export function assertShellBytes32(value, fieldName = "value") {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${fieldName} must be a 32-byte Shell hex value (0x + 64 hex chars)`);
  }
  return value.toLowerCase();
}

export function buildDeployData(bytecode, name = "Shell Tutorial NFT", symbol = "SNFT") {
  return encodeDeployData({
    abi: shellNftAbi,
    bytecode,
    args: [name, symbol],
  });
}

export function encodeMint(to, uri) {
  return encodeFunctionData({
    abi: shellNftAbi,
    functionName: "mint",
    args: [assertShellBytes32(to, "to"), uri],
  });
}

export function encodeOwnerOf(tokenId) {
  return encodeFunctionData({
    abi: shellNftAbi,
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
  });
}

export function encodeTokenUri(tokenId) {
  return encodeFunctionData({
    abi: shellNftAbi,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });
}

export function encodeTotalSupply() {
  return encodeFunctionData({
    abi: shellNftAbi,
    functionName: "totalSupply",
    args: [],
  });
}

export function decodeOwnerOf(data) {
  return decodeFunctionResult({ abi: shellNftAbi, functionName: "ownerOf", data });
}

export function decodeTokenUri(data) {
  return decodeFunctionResult({ abi: shellNftAbi, functionName: "tokenURI", data });
}

export function decodeTotalSupply(data) {
  return decodeFunctionResult({ abi: shellNftAbi, functionName: "totalSupply", data });
}
