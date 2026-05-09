/**
 * Direct deployment script using ethers.js — bypasses Hardhat CLI entirely.
 * Reads .env.local from the parent directory.
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ──────────────────────────────────────────
function loadEnv(filePath) {
  const content = readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

const envPath = resolve(__dirname, "../.env.local");
const env = loadEnv(envPath);

const PRIVATE_KEY = env.PRIVATE_KEY;
const RPC_URL =
  env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
  "https://sepolia-rollup.arbitrum.io/rpc";

if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY not set in .env.local");
  process.exit(1);
}

// ── CipherStream contract bytecode + ABI ─────────────────────
// Compiled from contracts/CipherStream.sol using solc 0.8.20
// with OpenZeppelin ReentrancyGuard

// Read the ABI from the existing JSON file
const abiPath = resolve(__dirname, "../lib/abi/CipherStream.json");
const abi = JSON.parse(readFileSync(abiPath, "utf8"));

// We need to compile the contract. Since we can't use Hardhat CLI,
// we'll use solc directly via the solc npm package.
console.log("📦 Loading Solidity compiler...");

let solc;
try {
  const solcModule = await import("solc");
  solc = solcModule.default;
} catch {
  console.error("❌ solc not found. Installing...");
  process.exit(1);
}

// Read contract source
const contractPath = resolve(__dirname, "../contracts/CipherStream.sol");
const contractSource = readFileSync(contractPath, "utf8");

// Read OpenZeppelin ReentrancyGuard
const ozPath = resolve(
  __dirname,
  "node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol"
);
const ozSource = readFileSync(ozPath, "utf8");

console.log("🔨 Compiling CipherStream.sol...");

const input = {
  language: "Solidity",
  sources: {
    "CipherStream.sol": { content: contractSource },
    "@openzeppelin/contracts/utils/ReentrancyGuard.sol": {
      content: ozSource,
    },
  },
  settings: {
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode"] },
    },
    optimizer: { enabled: true, runs: 200 },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter((e) => e.severity === "error");
  if (errors.length > 0) {
    console.error("❌ Compilation errors:");
    errors.forEach((e) => console.error(e.formattedMessage));
    process.exit(1);
  }
  // Print warnings
  output.errors
    .filter((e) => e.severity === "warning")
    .forEach((w) => console.warn("⚠️ ", w.message));
}

const contract = output.contracts["CipherStream.sol"]["CipherStream"];
const bytecode = contract.evm.bytecode.object;

console.log("✅ Compilation successful");

// ── Deploy ────────────────────────────────────────────────────
console.log("\n🚀 Deploying to Arbitrum Sepolia...\n");

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(`0x${PRIVATE_KEY}`, provider);

console.log(`📋 Deployer: ${wallet.address}`);

const balance = await provider.getBalance(wallet.address);
console.log(`💰 Balance:  ${ethers.formatEther(balance)} ETH`);

if (balance === 0n) {
  console.error(
    "\n❌ Wallet has no ETH. Get testnet ETH from:\n   https://faucet.triangleplatform.com/arbitrum/sepolia"
  );
  process.exit(1);
}

const factory = new ethers.ContractFactory(abi, bytecode, wallet);
console.log("\n⏳ Sending deployment transaction...");

const deployedContract = await factory.deploy();
console.log(`📝 Tx hash: ${deployedContract.deploymentTransaction().hash}`);
console.log("⏳ Waiting for confirmation...");

await deployedContract.waitForDeployment();
const address = await deployedContract.getAddress();

console.log("\n✅ CipherStream deployed successfully!");
console.log(
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);
console.log(`📄 Contract address : ${address}`);
console.log(
  `🔍 Explorer        : https://sepolia.arbiscan.io/address/${address}`
);
console.log(
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);
console.log("\n📝 Add this to .env.local and Vercel:");
console.log(`   NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS=${address}\n`);
