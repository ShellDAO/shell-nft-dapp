import { encodeFunctionData, decodeFunctionResult } from "shell-sdk/contracts";
import { parseAbi } from "viem";

export const shellNftAbi = parseAbi([
  "constructor(string name,string symbol)",
  "event TransferShell(address indexed from,address indexed to,uint256 indexed tokenId)",
  "function mint(address to,string uri) returns (uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
]);

export function assertShellAddress(value, fieldName = "value") {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${fieldName} must be a 32-byte Shell hex value (0x + 64 hex chars)`);
  }
  return value.toLowerCase();
}

export function encodeMint(to, uri) {
  return encodeFunctionData({
    abi: shellNftAbi,
    functionName: "mint",
    args: [assertShellAddress(to, "to"), uri],
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
