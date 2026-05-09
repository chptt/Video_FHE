import { type Address } from "viem";
import { CipherStreamABI } from "@/lib/abi/CipherStreamABI";

/**
 * Contract address from environment variable.
 * Set NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS after deploying.
 */
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS || ""
) as Address;

export const CONTRACT_ABI = CipherStreamABI;

/**
 * Returns true if the contract address is configured.
 * Use this to show friendly warnings when the contract isn't deployed yet.
 */
export function isContractConfigured(): boolean {
  const addr = process.env.NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS || "";
  return (
    addr.length === 42 &&
    addr.startsWith("0x") &&
    addr !== "replace_after_deployment"
  );
}

/**
 * Video struct as returned by the contract.
 */
export interface VideoData {
  id: bigint;
  creator: Address;
  title: string;
  description: string;
  encryptedVideoCID: string;
  thumbnailCID: string;
  price: bigint;
  accessDuration: bigint;
  createdAt: bigint;
  active: boolean;
}

/**
 * Formatted video for frontend use.
 */
export interface VideoFormatted {
  id: number;
  creator: Address;
  title: string;
  description: string;
  encryptedVideoCID: string;
  thumbnailCID: string;
  priceWei: bigint;
  priceEth: string;
  accessDurationSeconds: number;
  accessDurationHours: number;
  createdAt: Date;
  active: boolean;
  unlockCount?: number;
}

/**
 * Convert raw contract VideoData to a formatted frontend object.
 * Accepts unknown to handle wagmi's inferred tuple types gracefully.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatVideo(raw: any): VideoFormatted {
  return {
    id: Number(raw.id),
    creator: raw.creator as Address,
    title: raw.title as string,
    description: raw.description as string,
    encryptedVideoCID: raw.encryptedVideoCID as string,
    thumbnailCID: raw.thumbnailCID as string,
    priceWei: raw.price as bigint,
    priceEth: formatEth(raw.price as bigint),
    accessDurationSeconds: Number(raw.accessDuration),
    accessDurationHours: Number(raw.accessDuration) / 3600,
    createdAt: new Date(Number(raw.createdAt) * 1000),
    active: raw.active as boolean,
  };
}

/**
 * Format wei to ETH string with up to 6 decimal places.
 */
export function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0";
  if (eth < 0.000001) return "< 0.000001";
  return eth.toFixed(6).replace(/\.?0+$/, "");
}

/**
 * Format an address to a short display string.
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format seconds to a human-readable duration string.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Format a countdown (seconds remaining) to HH:MM:SS.
 */
export function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return "00:00:00";
  const h = Math.floor(secondsRemaining / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  const s = secondsRemaining % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
