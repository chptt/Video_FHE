import { NextResponse } from "next/server";

export async function GET() {
  const contractAddress =
    process.env.NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS || "";
  const pinataConfigured = !!process.env.PINATA_JWT;
  const rpcUrl =
    process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
    "https://sepolia-rollup.arbitrum.io/rpc";

  return NextResponse.json({
    status: "ok",
    app: process.env.NEXT_PUBLIC_APP_NAME || "CipherStream",
    network: {
      name: "Arbitrum Sepolia",
      chainId: 421614,
      rpcUrl,
    },
    contract: {
      address: contractAddress || null,
      configured:
        contractAddress.startsWith("0x") && contractAddress.length === 42,
    },
    pinata: {
      configured: pinataConfigured,
    },
    timestamp: new Date().toISOString(),
  });
}
