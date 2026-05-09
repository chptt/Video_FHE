"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortenAddress } from "@/lib/web3/contract";
import { useIsCorrectNetwork, useSwitchToArbitrumSepolia } from "@/lib/web3/hooks";
import { Wallet, AlertTriangle, ChevronDown, LogOut, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const isCorrectNetwork = useIsCorrectNetwork();
  const { switchToArbitrumSepolia, isSwitching } = useSwitchToArbitrumSepolia();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleConnect = () => {
    connect({ connector: connectors[0] });
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
    setDropdownOpen(false);
  };

  const handleViewExplorer = () => {
    if (address) {
      window.open(`https://sepolia.arbiscan.io/address/${address}`, "_blank");
    }
    setDropdownOpen(false);
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-gradient-to-r from-purple-600 to-blue-600 text-white",
          "hover:from-purple-500 hover:to-blue-500 hover:glow-purple",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Wallet className="w-4 h-4" />
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button
        onClick={switchToArbitrumSepolia}
        disabled={isSwitching}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-amber-600/20 border border-amber-600/40 text-amber-400",
          "hover:bg-amber-600/30",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <AlertTriangle className="w-4 h-4" />
        {isSwitching ? "Switching..." : "Switch to Arbitrum Sepolia"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-purple-600/20 border border-purple-600/30 text-purple-300",
          "hover:bg-purple-600/30"
        )}
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        {shortenAddress(address!)}
        <ChevronDown className={cn("w-4 h-4 transition-transform", dropdownOpen && "rotate-180")} />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-52 z-20 glass-card rounded-xl border border-purple-900/30 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-purple-900/30">
              <p className="text-xs text-slate-500">Connected to</p>
              <p className="text-sm font-medium text-purple-300">
                Arbitrum Sepolia
              </p>
            </div>
            <div className="p-1">
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </button>
              <button
                onClick={handleViewExplorer}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Arbiscan
              </button>
              <button
                onClick={() => {
                  disconnect();
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
