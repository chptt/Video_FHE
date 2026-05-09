import { AlertTriangle } from "lucide-react";
import { isContractConfigured } from "@/lib/web3/contract";

export function ContractWarning() {
  if (isContractConfigured()) return null;

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-600/40 bg-amber-900/20">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">
            Smart contract not deployed
          </p>
          <p className="text-xs text-amber-400/80 mt-1">
            Deploy the contract with{" "}
            <code className="font-mono bg-amber-900/30 px-1 rounded">
              npx hardhat run scripts/deploy.ts --network arbitrumSepolia
            </code>{" "}
            and set{" "}
            <code className="font-mono bg-amber-900/30 px-1 rounded">
              NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS
            </code>{" "}
            in your environment variables.
          </p>
        </div>
      </div>
    </div>
  );
}
