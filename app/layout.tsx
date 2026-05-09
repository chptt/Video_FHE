import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CipherStream — Encrypted Video Access on Arbitrum",
  description:
    "Encryption-first video access platform. Creators upload encrypted videos; viewers unlock time-limited access on Arbitrum Sepolia.",
  keywords: [
    "encrypted video",
    "blockchain",
    "Arbitrum",
    "time-locked access",
    "Web3",
    "IPFS",
  ],
  openGraph: {
    title: "CipherStream",
    description: "Encrypted time-locked video access on Arbitrum",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-purple-900/30 py-6 mt-12">
              <div className="container mx-auto px-4 text-center text-sm text-slate-500">
                <p>
                  CipherStream — Encryption-first video access on Arbitrum
                  Sepolia
                </p>
                <p className="mt-1 text-xs">
                  AES-GCM encrypted storage · Smart contract access control ·
                  Browser-side decryption
                </p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
