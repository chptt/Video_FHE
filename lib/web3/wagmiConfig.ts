import { createConfig, http } from "wagmi";
import { arbitrumSepolia } from "./chains";
import { metaMask } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [metaMask()],
  transports: {
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
        "https://sepolia-rollup.arbitrum.io/rpc"
    ),
  },
  ssr: true,
});
