# CipherStream — Encrypted Time-Locked Video Player on Arbitrum

> Encryption-first video access platform. Creators upload AES-GCM encrypted videos; viewers unlock smart-contract-controlled time-limited access on Arbitrum Sepolia.

---

## Overview

CipherStream is a production-ready dApp that combines client-side AES-GCM encryption, IPFS decentralized storage, and Arbitrum smart contracts to create a privacy-preserving video access platform.

**This is NOT a donation platform.** It is an encrypted video player where:
- Creators upload encrypted videos and set a price + access duration
- Viewers pay ETH to unlock time-limited viewing rights
- Access is enforced on-chain; the player checks expiry before decrypting
- The original video URL is never exposed — only a temporary browser Blob URL

---

## Problem Statement

Existing video platforms expose raw video URLs, making content trivially downloadable. Blockchain-based access control without encryption is meaningless — anyone with the URL can watch without paying.

CipherStream solves this by:
1. Encrypting video files client-side before they ever leave the creator's browser
2. Storing only the encrypted blob on IPFS
3. Using a smart contract to enforce time-limited access
4. Decrypting in the viewer's browser only after on-chain access is verified

---

## Features

- 🔐 **AES-GCM 256-bit encryption** — client-side, before upload
- ⛓️ **On-chain access control** — Arbitrum Sepolia smart contract
- ⏱️ **Time-locked access** — countdown timer, player disabled on expiry
- 🌐 **IPFS storage** — encrypted blobs via Pinata
- 💰 **Creator earnings** — ETH payments, withdraw anytime
- 🎨 **Dark cyber UI** — glassmorphism, gradients, responsive
- 🔒 **No raw URL exposure** — only Blob URLs in the player
- 📱 **Mobile responsive** — works on all screen sizes

---

## Architecture

```
Creator
  └─ Browser AES-GCM encryption (Web Crypto API)
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
                                └─ timer expires → player disabled
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS |
| Web3 | wagmi v2, viem v2, @tanstack/react-query |
| Wallet | MetaMask (injected connector) |
| Smart Contract | Solidity ^0.8.20, OpenZeppelin ReentrancyGuard |
| Development | Hardhat, hardhat-toolbox |
| Encryption | Web Crypto API (AES-GCM 256-bit) |
| Storage | IPFS via Pinata |
| Network | Arbitrum Sepolia (Chain ID: 421614) |
| Deployment | Vercel |

---

## Smart Contract Design

**Contract:** `CipherStream.sol`

### Key functions:
- `createVideo()` — Creator registers encrypted video with price + duration
- `unlockAccess()` — Viewer pays ETH, gets time-limited access; extends if already active
- `hasAccess()` — View function: returns true if viewer's expiry > block.timestamp
- `withdraw()` — Creator withdraws accumulated ETH earnings
- `setVideoActive()` — Creator can deactivate/reactivate their video

### Security:
- `ReentrancyGuard` on all ETH-moving functions
- Checks-effects-interactions pattern in `withdraw()`
- Excess ETH refunded automatically in `unlockAccess()`
- No owner-only centralization

---

## Encryption Flow

1. Creator selects video file in browser
2. `generateAesKey()` creates a random AES-GCM 256-bit key
3. `encryptFile()` encrypts the video: `[12-byte IV][ciphertext]`
4. Encrypted blob uploaded to Pinata via `/api/pinata/upload`
5. AES key stored in server-side demo registry via `/api/key/register`
6. Smart contract records: CID, price, duration, creator address

**Decryption:**
1. Viewer unlocks access on-chain
2. Player fetches encrypted blob from IPFS gateway
3. AES key retrieved from server registry
4. `decryptFile()` decrypts in browser using Web Crypto API
5. `URL.createObjectURL()` creates a Blob URL for the `<video>` element
6. Blob URL revoked on expiry or unmount

---

## Access Control Flow

```
viewer calls unlockAccess(videoId) with msg.value >= price
  → contract sets accessExpiry[videoId][viewer] = block.timestamp + duration
  → credits pendingWithdrawals[creator] += price
  → refunds excess ETH

player checks hasAccess(videoId, viewer)
  → true: fetch + decrypt + play
  → false: show locked state

countdown timer reaches 0
  → player paused, Blob URL revoked, src cleared
  → viewer must unlock again to continue
```

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_APP_NAME` | Frontend | App display name |
| `NEXT_PUBLIC_APP_URL` | Frontend | App URL |
| `NEXT_PUBLIC_ARBITRUM_SEPOLIA_CHAIN_ID` | Frontend | `421614` |
| `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` | Frontend | Arbitrum Sepolia RPC |
| `NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS` | Frontend | Deployed contract address |
| `PINATA_JWT` | **Server only** | Pinata API JWT — never expose to frontend |
| `PINATA_GATEWAY` | Server + Frontend | Your Pinata gateway domain |
| `PRIVATE_KEY` | **Hardhat only** | Deployer wallet private key — never expose |
| `ARBISCAN_API_KEY` | Hardhat | Optional, for contract verification |
| `NEXT_PUBLIC_MAX_VIDEO_SIZE_MB` | Frontend | Max upload size (default: 50) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Pinata account (free tier works)
- Arbitrum Sepolia testnet ETH ([faucet](https://faucet.triangleplatform.com/arbitrum/sepolia))

### 1. Install dependencies

```bash
cd cipherstream
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and fill in:
# - PINATA_JWT (from https://app.pinata.cloud/keys)
# - PINATA_GATEWAY (your gateway subdomain)
# - PRIVATE_KEY (test wallet, no 0x prefix)
```

### 3. Compile the contract

```bash
npx hardhat compile
```

### 4. Run tests

```bash
npx hardhat test
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Contract Deployment

### Deploy to Arbitrum Sepolia

```bash
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
```

The script will print:
```
✅ CipherStream deployed successfully!
📄 Contract address: 0x...
🔍 Explorer: https://sepolia.arbiscan.io/address/0x...

📝 Next steps:
   1. Copy the contract address into .env.local:
      NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS=0x...
```

### Verify on Arbiscan (optional)

```bash
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS>
```

---

## Vercel Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial CipherStream deployment"
   git remote add origin https://github.com/your-username/cipherstream.git
   git push -u origin main
   ```

2. **Import in Vercel**
   - Go to [vercel.com](https://vercel.com) → New Project
   - Import your GitHub repository

3. **Add environment variables** in Vercel dashboard:
   ```
   NEXT_PUBLIC_APP_NAME=CipherStream
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   NEXT_PUBLIC_ARBITRUM_SEPOLIA_CHAIN_ID=421614
   NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   NEXT_PUBLIC_CIPHERSTREAM_CONTRACT_ADDRESS=0x... (after deployment)
   PINATA_JWT=your_pinata_jwt
   PINATA_GATEWAY=your-gateway.mypinata.cloud
   NEXT_PUBLIC_MAX_VIDEO_SIZE_MB=50
   ```

4. **Deploy** — Vercel will build and deploy automatically

5. **Test the deployment:**
   - [ ] Connect MetaMask on Arbitrum Sepolia
   - [ ] Upload a small test video
   - [ ] Verify it appears on the Explore page
   - [ ] Unlock access and verify the countdown timer
   - [ ] Verify the player decrypts and plays the video
   - [ ] Wait for expiry and verify the player is disabled
   - [ ] Test the creator dashboard and withdrawal

---

## Security Limitations

### What CipherStream protects:
- ✅ Storage: encrypted blob on IPFS, unreadable without the key
- ✅ Access control: on-chain expiry enforced before decryption
- ✅ URL exposure: only Blob URLs shown, never the IPFS CID in the player
- ✅ Casual piracy: no direct download link

### What it does NOT protect against:
- ❌ Screen recording — browser-based playback cannot prevent this
- ❌ Memory extraction — a determined attacker can extract the decrypted video from browser memory
- ❌ Key theft — the demo key registry is in-memory and not authenticated

> **Note:** Browser-based playback cannot fully prevent screen recording or advanced extraction. This project protects storage, access control, and casual URL exposure, but production DRM needs stronger infrastructure (e.g., Widevine, PlayReady, or hardware-backed TEE).

---

## Future FHE Enhancements

This MVP uses AES-GCM for actual video encryption and blockchain for time-locked access control. FHE is not used to encrypt the video file directly because FHE is not practical for full video streaming.

Future FHE integration can be added for:
- **Private access tiers** — encrypt tier logic with FHE, viewers can't see pricing structure
- **Private pricing logic** — creators set prices without revealing them publicly
- **Encrypted watch analytics** — aggregate view counts without revealing individual viewers
- **Encrypted eligibility checks** — verify NFT ownership or token balance without revealing holdings
- **Private subscription scoring** — compute reputation scores on encrypted data

Recommended tools:
- [Lit Protocol](https://litprotocol.com) — threshold encryption for key management
- [Zama TFHE](https://zama.ai) — FHE for private computation
- [Phala Network](https://phala.network) — TEE-based confidential computing

---

## Demo Flow

1. Open the app and connect MetaMask to Arbitrum Sepolia
2. Go to **Upload** → select a video, set price (e.g., 0.001 ETH), duration (e.g., 1 hour)
3. Click **Encrypt & Upload Video** — watch the encryption + IPFS upload progress
4. Confirm the MetaMask transaction to create the video on-chain
5. Go to **Explore** — your video appears as a card
6. Click **View Details** → click **Unlock Access** → confirm the ETH payment
7. The player decrypts the video in your browser and starts playing
8. Watch the countdown timer — when it hits 00:00:00, the player stops
9. Go to **Dashboard** → Creator tab to see earnings and withdraw

---

## Screenshots

> Add screenshots here after deployment.

---

## License

MIT
