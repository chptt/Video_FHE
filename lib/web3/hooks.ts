"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { parseEther, type Address } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI, isContractConfigured } from "./contract";
import { arbitrumSepolia } from "./chains";

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
      // Poll every 10 seconds to keep access status fresh
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
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createVideo = (params: {
    title: string;
    description: string;
    encryptedVideoCID: string;
    thumbnailCID: string;
    priceEth: string;
    accessDurationSeconds: number;
  }) => {
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
    });
  };

  return {
    createVideo,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useUnlockAccess() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const unlockAccess = (videoId: number, priceWei: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "unlockAccess",
      args: [BigInt(videoId)],
      value: priceWei,
    });
  };

  return {
    unlockAccess,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "withdraw",
    });
  };

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useSetVideoActive() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const setVideoActive = (videoId: number, active: boolean) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "setVideoActive",
      args: [BigInt(videoId), active],
    });
  };

  return {
    setVideoActive,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
