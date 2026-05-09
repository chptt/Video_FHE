import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Build an IPFS gateway URL from a CID.
 */
export function ipfsGatewayUrl(cid: string): string {
  if (!cid) return "";
  const gateway =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud")
      : (process.env.PINATA_GATEWAY || "gateway.pinata.cloud");
  const cleanCid = cid.replace("ipfs://", "").replace(/^\/ipfs\//, "");
  return `https://${gateway}/ipfs/${cleanCid}`;
}

/**
 * Format bytes to a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
