"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSwitchChain,
  useChainId,
  usePublicClient,
} from "wagmi";
import { parseEther, type Address } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI, isContractConfigured } from "./contract";
import { arbitrumSepolia } from "./chains";

// =========================================================
// Gas helper — fetches current base fee and adds 50% buffer
// so maxFeePerGas is always above the block base fee.
// Arbitrum Sepolia base fees can fluctuate; this prevents
// "max fee per gas less than block base fee" errors.
// =========================================================
async function getGasOverrides(publicClient: ReturnType<typeof usePublicClient>) {
  try {
    if (!publicClient) return {};
    const block = await publicClient.getBlock({ blockTag: "latest" });
    if (!block.baseFeePerGas) return {};

    // Add 50% buffer on top of current base fee
    const baseFee = block.baseFeePerGas;
    const buffer = baseFee / 2n; // 50%
    const maxFeePerGas = baseFee + buffer + 1_000_000n; // extra 0.001 gwei safety margin
    const maxPriorityFeePerGas = 1_000_000n; // 0.001 gwei tip

    return { maxFeePerGas, maxPriorityFeePerGas };
  } catch {
    // If we can't fetch, let the wallet handle it
    return {};
  }
}

// =========================================================
// Network helpers
// =========================================================

export function useIsCorrectNetwork() {
  const chainId = useChainId();
  return chainId === arbitrumSepolia.id;
}

export function useSwitchToArbitrumSepolia() {
  const { switchChain, isPending } = useSwitchChain();
  return {
    switchToArbitrumSepolia: () => switchChain({ chainId: arbitrumSepolia.id }),
    isSwitching: isPending,
  };
}

// =========================================================
// Read hooks
// =========================================================

export function useVideoCount() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "videoCount",
    query: { enabled: isContractConfigured() },
  });
}

export function useGetVideo(videoId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getVideo",
    args: [BigInt(videoId)],
    query: { enabled: isContractConfigured() && videoId > 0 },
  });
}

export function useGetAllVideos() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getAllVideos",
    query: { enabled: isContractConfigured() },
  });
}

export function useGetCreatorVideos(creator: Address | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getCreatorVideos",
    args: creator ? [creator] : undefined,
    query: { enabled: isContractConfigured() && !!creator },
  });
}

export function useHasAccess(videoId: number, viewer: Address | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "hasAccess",
    args: viewer ? [BigInt(videoId), viewer] : undefined,
    query: {
      enabled: isContractConfigured() && videoId > 0 && !!viewer,
      refetchInterval: 10_000,
    },
  });
}

export function useGetAccessExpiry(videoId: number, viewer: Address | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getAccessExpiry",
    args: viewer ? [BigInt(videoId), viewer] : undefined,
    query: {
      enabled: isContractConfigured() && videoId > 0 && !!viewer,
      refetchInterval: 10_000,
    },
  });
}

export function usePendingWithdrawals(creator: Address | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "pendingWithdrawals",
    args: creator ? [creator] : undefined,
    query: { enabled: isContractConfigured() && !!creator },
  });
}

export function useUnlockCount(videoId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "unlockCount",
    args: [BigInt(videoId)],
    query: { enabled: isContractConfigured() && videoId > 0 },
  });
}

// =========================================================
// Write hooks
// =========================================================

export function useCreateVideo() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  const createVideo = async (params: {
    title: string;
    description: string;
    encryptedVideoCID: string;
    thumbnailCID: string;
    priceEth: string;
    accessDurationSeconds: number;
  }) => {
    const gasOverrides = await getGasOverrides(publicClient);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "createVideo",
      args: [
        params.title,
        params.description,
        params.encryptedVideoCID,
        params.thumbnailCID,
        parseEther(params.priceEth),
        BigInt(params.accessDurationSeconds),
      ],
      ...gasOverrides,
    });
  };

  return { createVideo, hash, isPending, isConfirming, isSuccess, error };
}

export function useUnlockAccess() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  const unlockAccess = async (videoId: number, priceWei: bigint) => {
    const gasOverrides = await getGasOverrides(publicClient);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "unlockAccess",
      args: [BigInt(videoId)],
      value: priceWei,
      ...gasOverrides,
    });
  };

  return { unlockAccess, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  const withdraw = async () => {
    const gasOverrides = await getGasOverrides(publicClient);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "withdraw",
      ...gasOverrides,
    });
  };

  return { withdraw, hash, isPending, isConfirming, isSuccess, error };
}

export function useSetVideoActive() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  const setVideoActive = async (videoId: number, active: boolean) => {
    const gasOverrides = await getGasOverrides(publicClient);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "setVideoActive",
      args: [BigInt(videoId), active],
      ...gasOverrides,
    });
  };

  return { setVideoActive, hash, isPending, isConfirming, isSuccess, error };
}
