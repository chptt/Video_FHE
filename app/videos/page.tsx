"use client";

import { useGetAllVideos } from "@/lib/web3/hooks";
import { formatVideo } from "@/lib/web3/contract";
import { VideoCard, VideoCardSkeleton } from "@/components/video/VideoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContractWarning } from "@/components/shared/ContractWarning";
import { Button } from "@/components/ui/button";
import { Play, Upload, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function VideosPage() {
  const { data: rawVideos, isLoading, error } = useGetAllVideos();
  const [search, setSearch] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allVideos = rawVideos ? (rawVideos as any[]).map((v) => formatVideo(v)) : [];
  const activeVideos = allVideos.filter((v) => v.active);

  const filtered = search.trim()
    ? activeVideos.filter(
        (v) =>
          v.title.toLowerCase().includes(search.toLowerCase()) ||
          v.description.toLowerCase().includes(search.toLowerCase())
      )
    : activeVideos;

  return (
    <div className="container mx-auto px-4 py-12">
      <ContractWarning />

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">
          Explore Videos
        </h1>
        <p className="text-slate-400">
          Encrypted videos with time-locked access on Arbitrum Sepolia
        </p>
      </div>

      {/* Search + Upload */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href="/upload">
          <Button>
            <Upload className="w-4 h-4" />
            Upload Video
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">
            Failed to load videos. Make sure the contract is deployed and
            configured.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Play}
          title={search ? "No videos match your search" : "No videos yet"}
          description={
            search
              ? "Try a different search term."
              : "Be the first to upload an encrypted video."
          }
          action={
            !search ? (
              <Link href="/upload">
                <Button>
                  <Upload className="w-4 h-4" />
                  Upload Video
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-6">
            {filtered.length} video{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
