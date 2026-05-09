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
import { parseEther, type Address, parseGwei } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI, isContractConfigured } from "./contract";
import { arbitrumSepolia } from "./chains";

// =========================================================
// Gas helper
// Fetches the current base fee and returns maxFeePerGas with
// a generous 2x multiplier so it always clears the base fee.
// Arbitrum Sepolia base fees are tiny (~0.02 gwei) but wagmi's
// internal estimate can be stale. We override it explicitly.
// =========================================================
async function getGasFees(publicClient: ReturnType<typeof usePublicClient>) {
  try {
    if (!publicClient) return {};

    const block = await publicClient.getBlock({ blockTag: "latest" });
    const baseFee = block.baseFeePerGas ?? parseGwei("0.1");

    // 2x the current base fee + 10M wei tip — always safe
    const maxFeePerGas = baseFee * 2n + parseGwei("0.01");
    const maxPriorityFeePerGas = parseGwei("0.01");

    return { maxFeePerGas, maxPriorityFeePerGas };
  } catch {
    // Fallback: use a safe hardcoded value (0.1 gwei) if RPC fails
    return {
      maxFeePerGas: parseGwei("0.1"),
      maxPriorityFeePerGas: parseGwei("0.01"),
    };
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
  }): Promise<void> => {
    const fees = await getGasFees(publicClient);
    return new Promise((resolve, reject) => {
      writeContract(
        {
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
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        },
        {
          onSuccess: () => resolve(),
          onError: (err) => reject(err),
        }
      );
    });
  };

  return { createVideo, hash, isPending, isConfirming, isSuccess, error };
}

export function useUnlockAccess() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  const unlockAccess = async (videoId: number, priceWei: bigint) => {
    const fees = await getGasFees(publicClient);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "unlockAccess",
      args: [BigInt(videoId)],
      value: priceWei,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    });
  };

  return { unlockAccess, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  const withdraw = async () => {
    const fees = await getGasFees(publicClient);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "withdraw",
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    });
  };

  return { withdraw, hash, isPending, isConfirming, isSuccess, error };
}

export function useSetVideoActive() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  const setVideoActive = async (videoId: number, active: boolean) => {
    const fees = await getGasFees(publicClient);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "setVideoActive",
      args: [BigInt(videoId), active],
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    });
  };

  return { setVideoActive, hash, isPending, isConfirming, isSuccess, error };
}
