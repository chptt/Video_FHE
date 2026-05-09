"use client";

import { useState, useRef } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useCreateVideo } from "@/lib/web3/hooks";
import { encryptFile } from "@/lib/crypto/videoCrypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Video,
  Image as ImageIcon,
  Lock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes } from "@/lib/utils";
import { isContractConfigured } from "@/lib/web3/contract";

const MAX_VIDEO_MB = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB || 50);
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

type UploadStep =
  | "idle"
  | "encrypting"
  | "uploading-video"
  | "uploading-thumbnail"
  | "registering-key"
  | "creating-on-chain"
  | "confirming"
  | "done"
  | "error";

export function UploadVideoForm() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const {
    createVideo,
    isPending,
    isConfirming,
    isSuccess,
    error: contractError,
    hash,
  } = useCreateVideo();

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priceEth: "0.01",
    accessDurationHours: "24",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("idle");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Track created video ID for redirect
  const createdVideoIdRef = useRef<number | null>(null);

  // Redirect after on-chain confirmation
  if (isSuccess && createdVideoIdRef.current) {
    router.push(`/videos/${createdVideoIdRef.current}`);
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error("Unsupported video format. Use MP4, WebM, or MOV.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Video must be under ${MAX_VIDEO_MB}MB.`);
      return;
    }
    setVideoFile(file);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Unsupported image format. Use PNG, JPEG, or WebP.");
      return;
    }
    setThumbnailFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!videoFile) {
      toast.error("Select a video file.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Enter a title.");
      return;
    }
    if (!isContractConfigured()) {
      toast.error(
        "Contract not deployed yet. Set NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS."
      );
      return;
    }

    try {
      setErrorMsg("");

      // ── Step 1: Encrypt video ──────────────────────────────
      setStep("encrypting");
      setStepLabel("Encrypting video in your browser...");
      setProgress(5);

      const { encryptedBlob, keyBase64 } = await encryptFile(
        videoFile,
        undefined,
        (pct) => setProgress(5 + Math.floor(pct * 0.3))
      );
      setProgress(35);

      // ── Step 2: Upload encrypted video to Pinata ──────────
      setStep("uploading-video");
      setStepLabel("Uploading encrypted video to IPFS...");

      const videoFormData = new FormData();
      videoFormData.append(
        "file",
        new File([encryptedBlob], `${form.title.replace(/\s+/g, "_")}.enc`, {
          type: "application/octet-stream",
        })
      );
      videoFormData.append("type", "video");

      const videoUploadRes = await fetch("/api/pinata/upload", {
        method: "POST",
        body: videoFormData,
      });
      if (!videoUploadRes.ok) {
        const err = await videoUploadRes.json();
        throw new Error(err.error || "Video upload failed.");
      }
      const { cid: encryptedVideoCID } = await videoUploadRes.json();
      setProgress(60);

      // ── Step 3: Upload thumbnail ───────────────────────────
      let thumbnailCID = "";
      if (thumbnailFile) {
        setStep("uploading-thumbnail");
        setStepLabel("Uploading thumbnail...");

        const thumbFormData = new FormData();
        thumbFormData.append("file", thumbnailFile);
        thumbFormData.append("type", "image");

        const thumbRes = await fetch("/api/pinata/upload", {
          method: "POST",
          body: thumbFormData,
        });
        if (!thumbRes.ok) {
          const err = await thumbRes.json();
          throw new Error(err.error || "Thumbnail upload failed.");
        }
        const { cid } = await thumbRes.json();
        thumbnailCID = cid;
      }
      setProgress(70);

      // ── Step 4: Register AES key (MVP demo) ───────────────
      // TODO (production): Replace with Lit Protocol threshold encryption.
      // The key should be encrypted with the creator's wallet public key
      // and stored in a decentralized key management system.
      setStep("registering-key");
      setStepLabel("Registering encryption key (demo)...");

      const keyRes = await fetch("/api/key/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cid: encryptedVideoCID,
          keyBase64,
          creator: address,
        }),
      });
      if (!keyRes.ok) {
        const err = await keyRes.json();
        throw new Error(err.error || "Key registration failed.");
      }
      setProgress(80);

      // ── Step 5: Create video on-chain ─────────────────────
      setStep("creating-on-chain");
      setStepLabel("Creating video record on Arbitrum...");

      const accessDurationSeconds =
        Math.floor(parseFloat(form.accessDurationHours) * 3600);

      createVideo({
        title: form.title,
        description: form.description,
        encryptedVideoCID,
        thumbnailCID,
        priceEth: form.priceEth,
        accessDurationSeconds,
      });

      setStep("confirming");
      setStepLabel("Waiting for transaction confirmation...");
      setProgress(90);

      // The redirect happens via the isSuccess effect above
      // We need to figure out the video ID — use videoCount + 1 as estimate
      // (In production, parse the VideoCreated event from the receipt)
      toast.success("Video uploaded! Waiting for confirmation...");
    } catch (err) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setErrorMsg(msg);
      setStep("error");
      toast.error(msg);
    }
  };

  const isLoading =
    step !== "idle" && step !== "done" && step !== "error";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contract warning */}
      {!isContractConfigured() && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-600/40 bg-amber-900/20">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              Contract not configured
            </p>
            <p className="text-xs text-amber-400/80 mt-1">
              Deploy the smart contract and set{" "}
              <code className="font-mono">
                NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS
              </code>{" "}
              in your environment variables.
            </p>
          </div>
        </div>
      )}

      {/* Encryption info */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-cyan-600/30 bg-cyan-900/10">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-cyan-300/80 space-y-1">
          <p className="font-medium text-cyan-300">How encryption works</p>
          <p>
            Your video is encrypted with AES-GCM 256-bit in your browser before
            upload. Only the encrypted file reaches IPFS — the original is never
            transmitted.
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="Enter video title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          disabled={isLoading}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your video..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Video file */}
      <div className="space-y-2">
        <Label>Video File * (max {MAX_VIDEO_MB}MB)</Label>
        <div
          onClick={() => !isLoading && videoInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            videoFile
              ? "border-green-600/50 bg-green-900/10"
              : "border-purple-900/40 hover:border-purple-600/50 hover:bg-purple-900/10",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={videoInputRef}
            type="file"
            accept={ALLOWED_VIDEO_TYPES.join(",")}
            onChange={handleVideoSelect}
            className="hidden"
            disabled={isLoading}
          />
          {videoFile ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <p className="text-sm font-medium text-green-300">
                {videoFile.name}
              </p>
              <p className="text-xs text-slate-500">
                {formatBytes(videoFile.size)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Video className="w-8 h-8 text-purple-400" />
              <p className="text-sm text-slate-400">
                Click to select video (MP4, WebM, MOV)
              </p>
              <p className="text-xs text-slate-600">Max {MAX_VIDEO_MB}MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="space-y-2">
        <Label>Thumbnail Image (optional)</Label>
        <div
          onClick={() => !isLoading && thumbInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
            thumbnailFile
              ? "border-green-600/50 bg-green-900/10"
              : "border-purple-900/40 hover:border-purple-600/50 hover:bg-purple-900/10",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={thumbInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={handleThumbnailSelect}
            className="hidden"
            disabled={isLoading}
          />
          {thumbnailFile ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <p className="text-sm text-green-300">{thumbnailFile.name}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="w-6 h-6 text-purple-400" />
              <p className="text-sm text-slate-400">
                Click to select thumbnail (PNG, JPEG, WebP)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Price & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Access Price (ETH) *</Label>
          <Input
            id="price"
            type="number"
            step="0.001"
            min="0.001"
            placeholder="0.01"
            value={form.priceEth}
            onChange={(e) => setForm({ ...form, priceEth: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Access Duration (hours) *</Label>
          <Input
            id="duration"
            type="number"
            step="1"
            min="1"
            placeholder="24"
            value={form.accessDurationHours}
            onChange={(e) =>
              setForm({ ...form, accessDurationHours: e.target.value })
            }
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Progress */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              <p className="text-sm text-slate-300">{stepLabel}</p>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-slate-500">{progress}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {step === "error" && errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-600/40 bg-red-900/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{errorMsg}</p>
        </div>
      )}

      {/* Contract error */}
      {contractError && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-600/40 bg-red-900/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            Transaction failed: {contractError.message}
          </p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isLoading || isPending || isConfirming || !isConnected}
      >
        {isLoading || isPending || isConfirming ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {stepLabel || "Processing..."}
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Encrypt & Upload Video
          </>
        )}
      </Button>

      {!isConnected && (
        <p className="text-center text-sm text-slate-500">
          Connect your wallet to upload a video.
        </p>
      )}
    </form>
  );
}
