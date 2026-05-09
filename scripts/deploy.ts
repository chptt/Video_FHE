import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying CipherStream to Arbitrum Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📋 Deployer address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error(
      "Deployer has no ETH. Get testnet ETH from https://faucet.triangleplatform.com/arbitrum/sepolia"
    );
  }

  // Deploy CipherStream
  const CipherStream = await ethers.getContractFactory("CipherStream");
  console.log("⏳ Deploying contract...");
  const cipherStream = await CipherStream.deploy();
  await cipherStream.waitForDeployment();

  const address = await cipherStream.getAddress();

  console.log("\n✅ CipherStream deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📄 Contract address: ${address}`);
  console.log(
    `🔍 Explorer:         https://sepolia.arbiscan.io/address/${address}`
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📝 Next steps:");
  console.log(
    `   1. Copy the contract address above into your .env.local file:`
  );
  console.log(
    `      NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS=${address}`
  );
  console.log(
    `   2. Also add it to your Vercel environment variables with the same key.`
  );
  console.log(
    `   3. (Optional) Verify the contract on Arbiscan:`
  );
  console.log(
    `      npx hardhat verify --network arbitrumSepolia ${address}`
  );
  console.log("\n🎉 Happy streaming!\n");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
