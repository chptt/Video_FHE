"use client";

import { useAccount } from "wagmi";
import { useGetAllVideos, useGetAccessExpiry } from "@/lib/web3/hooks";
import { formatVideo, formatEth, shortenAddress, formatDuration } from "@/lib/web3/contract";
import { CountdownTimer } from "@/components/video/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Clock, Lock } from "lucide-react";
import Link from "next/link";

export function ViewerDashboard() {
  const { address } = useAccount();
  const { data: rawVideos, isLoading } = useGetAllVideos();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videos = rawVideos ? (rawVideos as any[]).map((v) => formatVideo(v)) : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!address) {
    return (
      <EmptyState
        icon={Lock}
        title="Connect your wallet"
        description="Connect your wallet to see your video access history."
      />
    );
  }

  return (
    <div className="space-y-4">
      {videos.length === 0 ? (
        <EmptyState
          icon={Play}
          title="No videos available"
          description="Explore videos and unlock access to start watching."
          action={
            <Link href="/videos">
              <Button>Explore Videos</Button>
            </Link>
          }
        />
      ) : (
        videos.map((video) => (
          <ViewerAccessRow
            key={video.id}
            videoId={video.id}
            title={video.title}
            creator={video.creator}
            priceEth={video.priceEth}
            accessDurationSeconds={video.accessDurationSeconds}
            viewer={address}
          />
        ))
      )}
    </div>
  );
}

function ViewerAccessRow({
  videoId,
  title,
  creator,
  priceEth,
  accessDurationSeconds,
  viewer,
}: {
  videoId: number;
  title: string;
  creator: string;
  priceEth: string;
  accessDurationSeconds: number;
  viewer: `0x${string}`;
}) {
  const { data: expiry } = useGetAccessExpiry(videoId, viewer);
  const now = Math.floor(Date.now() / 1000);
  const expiryNum = expiry ? Number(expiry) : 0;
  const hasAccess = expiryNum > now;
  const isExpired = expiryNum > 0 && expiryNum <= now;

  // Only show rows where user has had access (expiry > 0)
  if (expiryNum === 0) return null;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 border border-purple-900/40 flex items-center justify-center flex-shrink-0">
            <Play className="w-5 h-5 text-purple-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-200 truncate">{title}</p>
            <p className="text-xs text-slate-500">
              by {shortenAddress(creator)} · {formatDuration(accessDurationSeconds)} access · {priceEth} ETH
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {hasAccess ? (
              <CountdownTimer
                expiryTimestamp={expiryNum}
                compact
              />
            ) : (
              <Badge variant="expired">
                <Clock className="w-3 h-3 mr-1" />
                Expired
              </Badge>
            )}

            <Link href={`/videos/${videoId}`}>
              <Button size="sm" variant={hasAccess ? "default" : "outline"}>
                {hasAccess ? (
                  <>
                    <Play className="w-3 h-3" />
                    Watch
                  </>
                ) : (
                  "Unlock Again"
                )}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
