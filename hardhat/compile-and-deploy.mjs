/**
 * Compile CipherStream.sol with solc and deploy to Arbitrum Sepolia
 * using ethers.js directly — no Hardhat CLI needed.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { ethers } from "./node_modules/ethers/dist/ethers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const solc = require("./node_modules/solc/index.js");

// ── Load .env.local ──────────────────────────────────────────
function loadEnv(filePath) {
  const content = readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv(resolve(__dirname, "../.env.local"));
const PRIVATE_KEY = env.PRIVATE_KEY;
const RPC_URL =
  env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
  "https://sepolia-rollup.arbitrum.io/rpc";

if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY not set in .env.local");
  process.exit(1);
}

// ── Compile ───────────────────────────────────────────────────
console.log("🔨 Compiling CipherStream.sol...");

const contractSrc = readFileSync(
  resolve(__dirname, "../contracts/CipherStream.sol"),
  "utf8"
);

// Import resolver — walks node_modules for @openzeppelin imports
function findImport(importPath) {
  const candidates = [
    resolve(__dirname, "node_modules", importPath),
    resolve(__dirname, "../node_modules", importPath),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return { contents: readFileSync(p, "utf8") };
    }
  }
  return { error: `File not found: ${importPath}` };
}

const input = {
  language: "Solidity",
  sources: {
    "CipherStream.sol": { content: contractSrc },
  },
  settings: {
    outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    optimizer: { enabled: true, runs: 200 },
  },
};

const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImport })
);

const errors = (output.errors || []).filter((e) => e.severity === "error");
if (errors.length) {
  console.error("❌ Compilation errors:");
  errors.forEach((e) => console.error(e.formattedMessage));
  process.exit(1);
}

const warnings = (output.errors || []).filter((e) => e.severity === "warning");
if (warnings.length) {
  warnings.forEach((w) => console.warn("⚠️ ", w.message));
}

const compiled = output.contracts["CipherStream.sol"]["CipherStream"];
const bytecode = "0x" + compiled.evm.bytecode.object;
const abi = compiled.abi;

console.log("✅ Compilation successful");
console.log(
  "   Functions:",
  abi
    .filter((x) => x.type === "function")
    .map((x) => x.name)
    .join(", ")
);

// ── Deploy ────────────────────────────────────────────────────
console.log("\n🚀 Deploying to Arbitrum Sepolia...");

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(`0x${PRIVATE_KEY}`, provider);

console.log(`📋 Deployer : ${wallet.address}`);
const balance = await provider.getBalance(wallet.address);
console.log(`💰 Balance  : ${ethers.formatEther(balance)} ETH`);

if (balance === 0n) {
  console.error(
    "\n❌ No ETH. Get testnet ETH from:\n   https://faucet.triangleplatform.com/arbitrum/sepolia"
  );
  process.exit(1);
}

const factory = new ethers.ContractFactory(abi, bytecode, wallet);
console.log("\n⏳ Sending deployment transaction...");

const contract = await factory.deploy();
const txHash = contract.deploymentTransaction().hash;
console.log(`📝 Tx hash  : ${txHash}`);
console.log("⏳ Waiting for confirmation (this takes ~15 seconds)...");

await contract.waitForDeployment();
const address = await contract.getAddress();

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
console.log(`\nCONTRACT_ADDRESS=${address}`);
