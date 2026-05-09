"use client";

import Link from "next/link";
import Image from "next/image";
import { VideoFormatted, shortenAddress, formatDuration } from "@/lib/web3/contract";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Lock, Play, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: VideoFormatted;
  className?: string;
}

export function VideoCard({ video, className }: VideoCardProps) {
  const thumbnailUrl = video.thumbnailCID
    ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud"}/ipfs/${video.thumbnailCID}`
    : null;

  return (
    <div
      className={cn(
        "group glass-card rounded-xl overflow-hidden border border-purple-900/30",
        "hover:border-purple-600/50 hover:glow-purple transition-all duration-300",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-900/30 to-blue-900/30 overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-12 h-12 text-purple-400/50" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Price badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="cyber" className="font-mono">
            <Zap className="w-3 h-3 mr-1" />
            {video.priceEth} ETH
          </Badge>
        </div>

        {/* Active/inactive */}
        {!video.active && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="expired">Inactive</Badge>
          </div>
        )}

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-purple-600/80 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-100 line-clamp-1 group-hover:text-purple-300 transition-colors">
            {video.title}
          </h3>
          {video.description && (
            <p className="text-sm text-slate-400 line-clamp-2 mt-1">
              {video.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(video.accessDurationSeconds)} access
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {shortenAddress(video.creator)}
          </span>
        </div>

        {/* CTA */}
        <Link href={`/videos/${video.id}`} className="block">
          <Button
            variant={video.active ? "default" : "outline"}
            size="sm"
            className="w-full"
            disabled={!video.active}
          >
            {video.active ? (
              <>
                <Lock className="w-4 h-4" />
                View Details
              </>
            ) : (
              "Unavailable"
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Skeleton loader
export function VideoCardSkeleton() {
  return (
    <div className="glass-card rounded-xl overflow-hidden border border-purple-900/30">
      <div className="aspect-video skeleton" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-5 rounded w-3/4" />
        <div className="skeleton h-4 rounded w-full" />
        <div className="skeleton h-4 rounded w-2/3" />
        <div className="skeleton h-9 rounded-lg w-full" />
      </div>
    </div>
  );
}
