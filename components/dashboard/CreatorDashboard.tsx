"use client";

import { useAccount } from "wagmi";
import { useGetCreatorVideos, usePendingWithdrawals, useWithdraw } from "@/lib/web3/hooks";
import { formatVideo, formatEth } from "@/lib/web3/contract";
import { VideoCard, VideoCardSkeleton } from "@/components/video/VideoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Video,
  TrendingUp,
  Wallet,
  Upload,
  Loader2,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useEffect } from "react";

export function CreatorDashboard() {
  const { address } = useAccount();
  const { data: rawVideos, isLoading: videosLoading } = useGetCreatorVideos(address);
  const { data: pendingBalance } = usePendingWithdrawals(address);
  const { withdraw, isPending, isConfirming, isSuccess, error } = useWithdraw();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videos = rawVideos ? (rawVideos as any[]).map((v) => formatVideo(v)) : [];
  const totalUnlocks = 0; // Would need to sum unlockCount per video
  const pendingEth = pendingBalance ? formatEth(pendingBalance) : "0";

  useEffect(() => {
    if (isSuccess) {
      toast.success("Withdrawal successful!");
    }
    if (error) {
      toast.error(`Withdrawal failed: ${error.message}`);
    }
  }, [isSuccess, error]);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Video}
          label="Videos Uploaded"
          value={videosLoading ? "..." : String(videos.length)}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Unlocks"
          value={String(totalUnlocks)}
          color="cyan"
        />
        <StatCard
          icon={Wallet}
          label="Pending Earnings"
          value={`${pendingEth} ETH`}
          color="green"
        />
      </div>

      {/* Withdraw */}
      {pendingBalance && pendingBalance > 0n && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Available to withdraw</p>
                <p className="text-2xl font-bold text-green-300 font-mono">
                  {pendingEth} ETH
                </p>
              </div>
              <Button
                onClick={withdraw}
                disabled={isPending || isConfirming}
                variant="success"
                size="lg"
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isConfirming ? "Confirming..." : "Withdrawing..."}
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Withdrawn!
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Withdraw Earnings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-100">
            Your Videos
          </h2>
          <Link href="/upload">
            <Button size="sm">
              <Upload className="w-4 h-4" />
              Upload New
            </Button>
          </Link>
        </div>

        {videosLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No videos yet"
            description="Upload your first encrypted video to start earning."
            action={
              <Link href="/upload">
                <Button>
                  <Upload className="w-4 h-4" />
                  Upload Video
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "purple" | "cyan" | "green";
}) {
  const colorMap = {
    purple: "text-purple-400 bg-purple-900/20 border-purple-900/40",
    cyan: "text-cyan-400 bg-cyan-900/20 border-cyan-900/40",
    green: "text-green-400 bg-green-900/20 border-green-900/40",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl border flex items-center justify-center ${colorMap[color]}`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-100 font-mono">
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
