import { UploadVideoForm } from "@/components/video/UploadVideoForm";
import { ContractWarning } from "@/components/shared/ContractWarning";
import { Shield, Lock, Globe, Zap } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <ContractWarning />

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Upload Video</h1>
        <p className="text-slate-400">
          Your video is encrypted in your browser before upload. Viewers pay
          ETH to unlock time-limited access.
        </p>
      </div>

      {/* Encryption flow */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Lock, label: "Browser Encrypt", color: "purple" },
          { icon: Globe, label: "Upload to IPFS", color: "blue" },
          { icon: Zap, label: "Record on Arbitrum", color: "cyan" },
          { icon: Shield, label: "Access Controlled", color: "green" },
        ].map(({ icon: Icon, label, color }, i) => (
          <div
            key={i}
            className="glass-card rounded-xl p-4 border border-purple-900/30 text-center"
          >
            <div
              className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center
              ${color === "purple" ? "bg-purple-900/30 text-purple-400" : ""}
              ${color === "blue" ? "bg-blue-900/30 text-blue-400" : ""}
              ${color === "cyan" ? "bg-cyan-900/30 text-cyan-400" : ""}
              ${color === "green" ? "bg-green-900/30 text-green-400" : ""}
            `}
            >
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="glass-card rounded-2xl p-8 border border-purple-900/30">
        <UploadVideoForm />
      </div>
    </div>
  );
}
