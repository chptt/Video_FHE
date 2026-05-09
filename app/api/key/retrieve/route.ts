import { NextRequest, NextResponse } from "next/server";
import { getKey } from "@/lib/keyStore";

// TODO (production): Verify wallet signature + on-chain access before returning key.

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cid = searchParams.get("cid");
    const videoId = searchParams.get("videoId");

    if (!cid) {
      return NextResponse.json(
        { error: "Missing cid parameter." },
        { status: 400 }
      );
    }

    const entry = getKey(cid);

    if (!entry) {
      return NextResponse.json(
        {
          error:
            "Decryption key not found. The server may have restarted (demo limitation). " +
            "In production, keys are stored in a persistent decentralized key management system.",
        },
        { status: 404 }
      );
    }

    console.log(
      `[KeyRegistry] Key retrieved for CID: ${cid.slice(0, 20)}... videoId: ${videoId}`
    );

    return NextResponse.json({ keyBase64: entry.keyBase64 }, { status: 200 });
  } catch (err) {
    console.error("Key retrieve error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
