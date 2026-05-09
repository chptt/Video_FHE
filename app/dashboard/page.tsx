"use client";

import { useAccount } from "wagmi";
import { CreatorDashboard } from "@/components/dashboard/CreatorDashboard";
import { ViewerDashboard } from "@/components/dashboard/ViewerDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractWarning } from "@/components/shared/ContractWarning";
import { WalletButton } from "@/components/web3/WalletButton";
import { Upload, Play, Wallet } from "lucide-react";

export default function DashboardPage() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-purple-900/20 border border-purple-900/40 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Dashboard</h1>
          <p className="text-slate-400 mb-8">
            Connect your wallet to view your creator earnings and video access
            history.
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <ContractWarning />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400 font-mono text-sm">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      </div>

      <Tabs defaultValue="creator">
        <TabsList className="mb-8">
          <TabsTrigger value="creator" className="gap-2">
            <Upload className="w-4 h-4" />
            Creator
          </TabsTrigger>
          <TabsTrigger value="viewer" className="gap-2">
            <Play className="w-4 h-4" />
            Viewer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creator">
          <CreatorDashboard />
        </TabsContent>

        <TabsContent value="viewer">
          <ViewerDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
