/**
 * Deactivates all videos on the CipherStream contract.
 * Only the creator of each video can deactivate it.
 * Videos with a different creator will be skipped.
 */
import { ethers } from "./node_modules/ethers/dist/ethers.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
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
const RPC_URL = env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const CONTRACT_ADDRESS = env.NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS;

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error("❌ PRIVATE_KEY or CONTRACT_ADDRESS missing in .env.local");
  process.exit(1);
}

// Minimal ABI — only what we need
const ABI = [
  "function videoCount() view returns (uint256)",
  "function getVideo(uint256 videoId) view returns (tuple(uint256 id, address creator, string title, string description, string encryptedVideoCID, string thumbnailCID, uint256 price, uint256 accessDuration, uint256 createdAt, bool active))",
  "function setVideoActive(uint256 videoId, bool active)",
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(`0x${PRIVATE_KEY}`, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

console.log(`\n🔗 Contract : ${CONTRACT_ADDRESS}`);
console.log(`👛 Wallet   : ${wallet.address}`);

// Fetch current gas fees with buffer
async function getGasFees() {
  const block = await provider.getBlock("latest");
  const baseFee = block.baseFeePerGas ?? ethers.parseUnits("0.1", "gwei");
  return {
    maxFeePerGas: baseFee * 2n + ethers.parseUnits("0.01", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei"),
  };
}

async function main() {
  const count = await contract.videoCount();
  console.log(`\n📹 Total videos on-chain: ${count}\n`);

  if (count === 0n) {
    console.log("No videos to deactivate.");
    return;
  }

  let deactivated = 0;
  let skipped = 0;
  let alreadyInactive = 0;

  for (let i = 1; i <= Number(count); i++) {
    const video = await contract.getVideo(i);
    const title = video.title || `Video #${i}`;
    const creator = video.creator.toLowerCase();
    const isActive = video.active;

    console.log(`Video #${i}: "${title}" | creator: ${creator.slice(0,10)}... | active: ${isActive}`);

    // Skip if not our wallet
    if (creator !== wallet.address.toLowerCase()) {
      console.log(`  ⏭️  Skipped — not your video\n`);
      skipped++;
      continue;
    }

    // Skip if already inactive
    if (!isActive) {
      console.log(`  ✅ Already inactive\n`);
      alreadyInactive++;
      continue;
    }

    // Deactivate
    try {
      const fees = await getGasFees();
      console.log(`  ⏳ Deactivating...`);
      const tx = await contract.setVideoActive(i, false, fees);
      console.log(`  📝 Tx: ${tx.hash}`);
      await tx.wait();
      console.log(`  ✅ Deactivated\n`);
      deactivated++;
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}\n`);
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Deactivated : ${deactivated}`);
  console.log(`⏭️  Skipped     : ${skipped} (not your videos)`);
  console.log(`ℹ️  Already off : ${alreadyInactive}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nDone! Inactive videos are hidden from the Explore page.\n");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
