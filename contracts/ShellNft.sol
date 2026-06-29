// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ShellNft {
    string public name;
    string public symbol;

    uint256 private _totalSupply;
    mapping(uint256 => address) private _owners;
    mapping(uint256 => string) private _tokenUris;

    event TransferShell(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function mint(address to, string calldata uri) external returns (uint256 tokenId) {
        require(to != address(0), "ShellNft: zero owner");
        require(bytes(uri).length > 0, "ShellNft: empty uri");

        tokenId = _totalSupply + 1;
        _totalSupply = tokenId;
        _owners[tokenId] = to;
        _tokenUris[tokenId] = uri;

        emit TransferShell(address(0), to, tokenId);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ShellNft: nonexistent token");
        return owner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "ShellNft: nonexistent token");
        return _tokenUris[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
}
