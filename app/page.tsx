import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Lock,
  Clock,
  Eye,
  Upload,
  Play,
  Zap,
  Globe,
  Key,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-600/30 bg-purple-600/10 text-purple-300 text-sm mb-8">
            <Shield className="w-4 h-4" />
            Encryption-first video access platform
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none">
            <span className="gradient-text">Cipher</span>
            <span className="text-white">Stream</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-400 mb-4 max-w-2xl mx-auto">
            Encrypted time-locked video access on Arbitrum
          </p>
          <p className="text-slate-500 mb-10 max-w-xl mx-auto">
            Creators upload AES-GCM encrypted videos. Viewers unlock
            smart-contract-controlled access. Everything decrypts in your
            browser — the original file is never exposed.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/videos">
              <Button size="xl" className="group">
                <Play className="w-5 h-5" />
                Explore Videos
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="xl" variant="outline">
                <Upload className="w-5 h-5" />
                Upload Video
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A fully on-chain access control system with client-side
              encryption. No middlemen, no centralized servers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Creator flow */}
            <div className="glass-card rounded-2xl p-8 border border-purple-900/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-600/30 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  For Creators
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: Key,
                    text: "AES-GCM 256-bit key generated in your browser",
                  },
                  {
                    icon: Lock,
                    text: "Video encrypted client-side before any upload",
                  },
                  {
                    icon: Globe,
                    text: "Encrypted file stored on IPFS via Pinata",
                  },
                  {
                    icon: Zap,
                    text: "CID + price + duration recorded on Arbitrum",
                  },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3 h-3 text-purple-400" />
                    </div>
                    <p className="text-slate-400 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Viewer flow */}
            <div className="glass-card rounded-2xl p-8 border border-cyan-900/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-600/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  For Viewers
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: Zap,
                    text: "Connect MetaMask wallet on Arbitrum Sepolia",
                  },
                  {
                    icon: Lock,
                    text: "Pay ETH to unlock time-limited access on-chain",
                  },
                  {
                    icon: Globe,
                    text: "Encrypted video fetched from IPFS gateway",
                  },
                  {
                    icon: Play,
                    text: "Decrypted in browser — original URL never shown",
                  },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3 h-3 text-cyan-400" />
                    </div>
                    <p className="text-slate-400 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 border-t border-purple-900/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for Privacy
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Every design decision prioritizes encryption and access control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Architecture diagram */}
      <section className="py-24 px-4 border-t border-purple-900/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Architecture
            </h2>
          </div>
          <div className="glass-card rounded-2xl p-8 border border-purple-900/30 font-mono text-sm">
            <pre className="text-slate-400 leading-relaxed overflow-x-auto">
{`Creator
  └─ Browser AES-GCM encryption
       └─ Pinata/IPFS (encrypted video blob)
            └─ Arbitrum smart contract
                 └─ stores: CID + price + duration

Viewer
  └─ Connect wallet (MetaMask)
       └─ unlockAccess() → pay ETH on Arbitrum
            └─ hasAccess() → check expiry on-chain
                 └─ fetch encrypted video from IPFS
                      └─ decrypt in browser (AES-GCM)
                           └─ play via Blob URL
                                └─ timer expires → player disabled`}
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 border-t border-purple-900/20">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to stream?
          </h2>
          <p className="text-slate-400 mb-8">
            Connect your MetaMask wallet and start exploring encrypted videos on
            Arbitrum Sepolia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/videos">
              <Button size="xl">
                <Play className="w-5 h-5" />
                Explore Videos
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="xl" variant="outline">
                <Upload className="w-5 h-5" />
                Upload Video
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: Lock,
    title: "AES-GCM Encryption",
    description:
      "Videos are encrypted with 256-bit AES-GCM in your browser before upload. The original file never leaves your device unencrypted.",
    color: "purple",
  },
  {
    icon: Clock,
    title: "Time-Locked Access",
    description:
      "Smart contract enforces access expiry on-chain. When time runs out, the player is disabled and the blob URL is revoked.",
    color: "cyan",
  },
  {
    icon: Shield,
    title: "No Raw URL Exposure",
    description:
      "Viewers only ever see a temporary browser Blob URL. The IPFS CID of the encrypted file is never shown in the player.",
    color: "green",
  },
  {
    icon: Zap,
    title: "Arbitrum Sepolia",
    description:
      "Low-cost, fast transactions on Arbitrum L2. Access unlocks cost a fraction of Ethereum mainnet gas fees.",
    color: "blue",
  },
  {
    icon: Globe,
    title: "Decentralized Storage",
    description:
      "Encrypted videos are stored on IPFS via Pinata. Content is censorship-resistant and permanently accessible.",
    color: "purple",
  },
  {
    icon: Key,
    title: "Creator Earnings",
    description:
      "Creators receive ETH directly to their wallet. Withdraw earnings at any time with a single transaction.",
    color: "cyan",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    purple: "text-purple-400 bg-purple-900/20 border-purple-900/40",
    cyan: "text-cyan-400 bg-cyan-900/20 border-cyan-900/40",
    green: "text-green-400 bg-green-900/20 border-green-900/40",
    blue: "text-blue-400 bg-blue-900/20 border-blue-900/40",
  };

  return (
    <div className="glass-card rounded-xl p-6 border border-purple-900/30 hover:border-purple-600/40 transition-all group">
      <div
        className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${colorMap[color]}`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
