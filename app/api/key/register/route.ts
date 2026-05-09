import { NextRequest, NextResponse } from "next/server";
import { setKey } from "@/lib/keyStore";

/**
 * ⚠️  MVP DEMO KEY REGISTRY — NOT PRODUCTION SAFE ⚠️
 *
 * Stores AES-GCM encryption keys in an in-memory store.
 * Only suitable for local development and demo purposes.
 *
 * TODO (production): Replace with Lit Protocol threshold encryption,
 * ECIES wallet-based encryption, or a persistent store (Vercel KV, etc.)
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cid, keyBase64, creator } = body as {
      cid: string;
      keyBase64: string;
      creator: string;
    };

    if (!cid || !keyBase64 || !creator) {
      return NextResponse.json(
        { error: "Missing required fields: cid, keyBase64, creator" },
        { status: 400 }
      );
    }

    if (typeof cid !== "string" || cid.length < 10) {
      return NextResponse.json({ error: "Invalid CID." }, { status: 400 });
    }
    if (typeof keyBase64 !== "string" || keyBase64.length < 40) {
      return NextResponse.json(
        { error: "Invalid key format." },
        { status: 400 }
      );
    }

    setKey(cid, { keyBase64, creator });

    console.log(
      `[KeyRegistry] Registered key for CID: ${cid.slice(0, 20)}... by ${creator.slice(0, 10)}...`
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Key registered (demo only — use Lit Protocol in production).",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Key register error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
