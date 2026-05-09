import { NextRequest, NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

const MAX_VIDEO_MB = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB || 50);
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB for thumbnails

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/octet-stream", // encrypted blobs
];
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: NextRequest) {
  // Validate Pinata JWT is configured (server-side only)
  if (!PINATA_JWT) {
    return NextResponse.json(
      { error: "Pinata JWT not configured on server." },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "video" | "image"

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate file type
    if (type === "video") {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported video type: ${file.type}` },
          { status: 400 }
        );
      }
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `Video exceeds ${MAX_VIDEO_MB}MB limit.` },
          { status: 400 }
        );
      }
    } else if (type === "image") {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${file.type}` },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image exceeds 10MB limit." },
          { status: 400 }
        );
      }
    }

    // Build multipart form for Pinata
    const pinataForm = new FormData();
    pinataForm.append("file", file, file.name);

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        app: "CipherStream",
        type: type || "unknown",
        uploadedAt: new Date().toISOString(),
      },
    });
    pinataForm.append("pinataMetadata", metadata);

    // Pin options
    const options = JSON.stringify({ cidVersion: 1 });
    pinataForm.append("pinataOptions", options);

    // Upload to Pinata
    const pinataRes = await fetch(PINATA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: pinataForm,
    });

    if (!pinataRes.ok) {
      const errText = await pinataRes.text();
      console.error("Pinata upload error:", errText);
      return NextResponse.json(
        { error: "Pinata upload failed. Check your JWT and quota." },
        { status: 502 }
      );
    }

    const pinataData = await pinataRes.json();
    const cid: string = pinataData.IpfsHash;

    const gateway =
      process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const gatewayUrl = `https://${gateway}/ipfs/${cid}`;

    return NextResponse.json({ cid, gatewayUrl }, { status: 200 });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: "Internal server error during upload." },
      { status: 500 }
    );
  }
}
