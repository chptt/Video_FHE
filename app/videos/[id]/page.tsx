"use client";

import { use } from "react";
import { useAccount } from "wagmi";
import {
  useGetVideo,
  useHasAccess,
  useGetAccessExpiry,
  useUnlockAccess,
  useUnlockCount,
} from "@/lib/web3/hooks";
import {
  formatVideo,
  shortenAddress,
  formatDuration,
  type VideoFormatted,
} from "@/lib/web3/contract";
import { EncryptedVideoPlayer } from "@/components/video/EncryptedVideoPlayer";
import { CountdownTimer } from "@/components/video/CountdownTimer";
import { AccessBadge } from "@/components/video/AccessBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractWarning } from "@/components/shared/ContractWarning";
import {
  Lock,
  Unlock,
  Clock,
  User,
  Zap,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

interface VideoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function VideoDetailPage({ params }: VideoDetailPageProps) {
  const { id } = use(params);
  const videoId = parseInt(id, 10);

  const { address, isConnected } = useAccount();
  const { data: rawVideo, isLoading: videoLoading } = useGetVideo(videoId);
  const { data: hasAccess, refetch: refetchAccess } = useHasAccess(
    videoId,
    address
  );
  const { data: expiryTimestamp, refetch: refetchExpiry } = useGetAccessExpiry(
    videoId,
    address
  );
  const { data: unlockCount } = useUnlockCount(videoId);

  const {
    unlockAccess,
    isPending,
    isConfirming,
    isSuccess,
    error: unlockError,
  } = useUnlockAccess();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const video: VideoFormatted | null = rawVideo != null ? formatVideo(rawVideo as any) : null;

  useEffect(() => {
    if (isSuccess) {
      toast.success("Access unlocked! Decrypting video...");
      refetchAccess();
      refetchExpiry();
    }
    if (unlockError) {
      toast.error(`Transaction failed: ${unlockError.message}`);
    }
  }, [isSuccess, unlockError, refetchAccess, refetchExpiry]);

  const handleUnlock = () => {
    if (!video) return;
    if (!isConnected) {
      toast.error("Connect your wallet first.");
      return;
    }
    unlockAccess(videoId, video.priceWei);
  };

  if (isNaN(videoId) || videoId <= 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-red-400">Invalid video ID.</p>
      </div>
    );
  }

  if (videoLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <VideoDetailSkeleton />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <p className="text-slate-400">Video not found or contract not configured.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <ContractWarning />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player column */}
          <div className="lg:col-span-2 space-y-6">
            <EncryptedVideoPlayer
              videoId={videoId}
              encryptedVideoCID={video.encryptedVideoCID}
              title={video.title}
              onUnlockClick={handleUnlock}
            />

            {/* Title & description */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-2xl font-bold text-white">{video.title}</h1>
                <AccessBadge
                  hasAccess={!!hasAccess}
                  expiryTimestamp={expiryTimestamp ? Number(expiryTimestamp) : undefined}
                />
              </div>
              {video.description && (
                <p className="text-slate-400 leading-relaxed">
                  {video.description}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {shortenAddress(video.creator)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatDuration(video.accessDurationSeconds)} access
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                {unlockCount !== undefined ? String(unlockCount) : "..."} unlocks
              </span>
              <a
                href={`https://sepolia.arbiscan.io/address/${video.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-purple-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View creator
              </a>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Access card */}
            <div className="glass-card rounded-xl p-6 border border-purple-900/30 space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Video Access
              </h2>

              {/* Price */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Price</span>
                <Badge variant="cyber" className="font-mono text-base px-3 py-1">
                  <Zap className="w-3 h-3 mr-1" />
                  {video.priceEth} ETH
                </Badge>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Access Duration</span>
                <span className="text-slate-200 font-medium">
                  {formatDuration(video.accessDurationSeconds)}
                </span>
              </div>

              {/* Countdown if active */}
              {hasAccess && expiryTimestamp && (
                <CountdownTimer
                  expiryTimestamp={Number(expiryTimestamp)}
                  onExpire={() => {
                    refetchAccess();
                    refetchExpiry();
                  }}
                />
              )}

              {/* Unlock button */}
              {!hasAccess && (
                <Button
                  onClick={handleUnlock}
                  disabled={isPending || isConfirming || !isConnected || !video.active}
                  size="lg"
                  className="w-full"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirm in wallet...
                    </>
                  ) : isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirming...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Access Unlocked!
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Unlock Access — {video.priceEth} ETH
                    </>
                  )}
                </Button>
              )}

              {hasAccess && (
                <Button
                  onClick={handleUnlock}
                  disabled={isPending || isConfirming}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <Clock className="w-4 h-4" />
                  Extend Access
                </Button>
              )}

              {!isConnected && (
                <p className="text-xs text-slate-500 text-center">
                  Connect your wallet to unlock access.
                </p>
              )}

              {!video.active && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-xs text-red-300">
                    This video is currently inactive.
                  </p>
                </div>
              )}
            </div>

            {/* Security info */}
            <div className="glass-card rounded-xl p-4 border border-cyan-900/30 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium">
                <Lock className="w-4 h-4" />
                Security
              </div>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>• AES-GCM 256-bit encrypted storage</li>
                <li>• Access enforced by smart contract</li>
                <li>• Decryption happens in your browser</li>
                <li>• Original file URL never exposed</li>
                <li>• Player disabled on expiry</li>
              </ul>
            </div>
          </div>
        </div>
    </div>
  );
}

function VideoDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton className="aspect-video rounded-xl" />
        <Skeleton className="h-8 w-3/4 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}
