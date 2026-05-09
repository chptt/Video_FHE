import { defineChain } from "viem";

/**
 * Arbitrum Sepolia testnet definition for wagmi/viem.
 * Chain ID: 421614
 */
export const arbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
          "https://sepolia-rollup.arbitrum.io/rpc",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
      apiUrl: "https://api-sepolia.arbiscan.io/api",
    },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [arbitrumSepolia] as const;
export const DEFAULT_CHAIN = arbitrumSepolia;
