"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useHasAccess, useGetAccessExpiry } from "@/lib/web3/hooks";
import { decryptFile, createBlobUrl } from "@/lib/crypto/videoCrypto";
import { CountdownTimer } from "./CountdownTimer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EncryptedVideoPlayerProps {
  videoId: number;
  encryptedVideoCID: string;
  title: string;
  onUnlockClick?: () => void;
}

type PlayerState =
  | "checking"
  | "locked"
  | "fetching"
  | "decrypting"
  | "ready"
  | "expired"
  | "error";

export function EncryptedVideoPlayer({
  videoId,
  encryptedVideoCID,
  title,
  onUnlockClick,
}: EncryptedVideoPlayerProps) {
  const { address, isConnected } = useAccount();
  const { data: hasAccess, refetch: refetchAccess } = useHasAccess(
    videoId,
    address
  );
  const { data: expiryTimestamp } = useGetAccessExpiry(videoId, address);

  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [playerState, setPlayerState] = useState<PlayerState>("checking");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Determine initial state based on access
  useEffect(() => {
    if (!isConnected) {
      setPlayerState("locked");
      return;
    }
    if (hasAccess === undefined) {
      setPlayerState("checking");
      return;
    }
    if (!hasAccess) {
      setPlayerState("locked");
      return;
    }
    // Has access — start loading if not already loaded
    if (playerState === "checking" || playerState === "locked") {
      loadAndDecryptVideo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, isConnected]);

  const loadAndDecryptVideo = useCallback(async () => {
    if (!encryptedVideoCID) {
      setPlayerState("error");
      setErrorMessage("No encrypted video CID found.");
      return;
    }

    try {
      setPlayerState("fetching");
      setProgress(10);

      // Fetch the AES key from the server-side key registry
      // TODO (production): Replace with Lit Protocol or wallet-based key retrieval
      const keyRes = await fetch(
        `/api/key/retrieve?videoId=${videoId}&cid=${encryptedVideoCID}`
      );
      if (!keyRes.ok) {
        throw new Error("Could not retrieve decryption key from server.");
      }
      const { keyBase64 } = await keyRes.json();
      setProgress(25);

      // Fetch encrypted video from IPFS gateway
      const gateway =
        process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
      const videoUrl = `https://${gateway}/ipfs/${encryptedVideoCID}`;

      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch encrypted video: ${response.status}`);
      }
      setProgress(50);

      const encryptedBlob = await response.blob();
      setProgress(60);

      // Decrypt in browser
      setPlayerState("decrypting");
      const { decryptedBlob } = await decryptFile(
        encryptedBlob,
        keyBase64,
        "video/mp4",
        (pct) => setProgress(60 + Math.floor(pct * 0.4))
      );

      // Create blob URL — never expose the original IPFS URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const blobUrl = createBlobUrl(decryptedBlob);
      blobUrlRef.current = blobUrl;

      if (videoRef.current) {
        videoRef.current.src = blobUrl;
        videoRef.current.load();
      }

      setProgress(100);
      setPlayerState("ready");
    } catch (err) {
      console.error("Video decryption error:", err);
      setPlayerState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to decrypt video."
      );
      toast.error("Decryption failed. Please try again.");
    }
  }, [encryptedVideoCID, videoId]);

  const handleExpire = useCallback(() => {
    setPlayerState("expired");
    if (videoRef.current) {
      videoRef.current.pause();
    }
    // Revoke blob URL on expiry
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.src = "";
    }
    toast.warning("Your access has expired.");
  }, []);

  const handleRetry = () => {
    setErrorMessage("");
    refetchAccess();
    loadAndDecryptVideo();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  // =========================================================
  // Render states
  // =========================================================

  const renderOverlay = () => {
    switch (playerState) {
      case "checking":
        return (
          <PlayerOverlay>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              <p className="text-slate-300 text-sm">Checking access...</p>
            </div>
          </PlayerOverlay>
        );

      case "locked":
        return (
          <PlayerOverlay>
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-purple-600/40 flex items-center justify-center">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  Access Locked
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {!isConnected
                    ? "Connect your wallet to unlock access."
                    : "Unlock limited-time viewing to decrypt this video."}
                </p>
              </div>
              {isConnected && onUnlockClick && (
                <Button onClick={onUnlockClick} size="lg">
                  <Lock className="w-4 h-4" />
                  Unlock Access
                </Button>
              )}
            </div>
          </PlayerOverlay>
        );

      case "fetching":
        return (
          <PlayerOverlay>
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <ShieldCheck className="w-10 h-10 text-cyan-400 animate-pulse" />
              <p className="text-slate-300 text-sm">
                Fetching encrypted video...
              </p>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-slate-500">{progress}%</p>
            </div>
          </PlayerOverlay>
        );

      case "decrypting":
        return (
          <PlayerOverlay>
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <div className="relative">
                <ShieldCheck className="w-10 h-10 text-purple-400" />
                <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              </div>
              <p className="text-slate-300 text-sm font-medium">
                Access active. Decrypting securely in your browser.
              </p>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-slate-500">{progress}%</p>
            </div>
          </PlayerOverlay>
        );

      case "expired":
        return (
          <PlayerOverlay>
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-600/40 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-300">
                  Access Expired
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Access expired. Unlock again to continue watching.
                </p>
              </div>
              {onUnlockClick && (
                <Button onClick={onUnlockClick} variant="outline" size="lg">
                  Unlock Again
                </Button>
              )}
            </div>
          </PlayerOverlay>
        );

      case "error":
        return (
          <PlayerOverlay>
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-600/40 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-300">
                  Playback Error
                </h3>
                <p className="text-sm text-slate-400 mt-1">{errorMessage}</p>
              </div>
              <Button onClick={handleRetry} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </PlayerOverlay>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Player */}
      <div className="video-container aspect-video bg-black rounded-xl overflow-hidden relative group">
        {/* HTML5 video element — src is always a blob URL, never the raw IPFS URL */}
        <video
          ref={videoRef}
          className={cn(
            "w-full h-full object-contain",
            playerState !== "ready" && "opacity-0"
          )}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Overlay for non-ready states */}
        {playerState !== "ready" && renderOverlay()}

        {/* Custom controls (shown when ready) */}
        {playerState === "ready" && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-purple-300 transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={toggleMute}
                className="text-white hover:text-purple-300 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <div className="flex-1" />
              <button
                onClick={handleFullscreen}
                className="text-white hover:text-purple-300 transition-colors"
                aria-label="Fullscreen"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Countdown timer (shown when access is active) */}
      {playerState === "ready" && expiryTimestamp !== undefined && (
        <CountdownTimer
          expiryTimestamp={Number(expiryTimestamp)}
          onExpire={handleExpire}
        />
      )}

      {/* Security note */}
      <p className="text-xs text-slate-600 text-center">
        🔒 Video is decrypted locally in your browser. The original encrypted
        file URL is never exposed.
      </p>
    </div>
  );
}

function PlayerOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {children}
    </div>
  );
}
