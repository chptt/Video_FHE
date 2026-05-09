import { NextRequest, NextResponse } from "next/server";

const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";

/**
 * Retrieves the AES key for a video.
 *
 * The keyCid is passed from the frontend (stored in localStorage after upload).
 * We fetch the key JSON directly from the IPFS gateway — no Pinata API list
 * scope needed, just a plain IPFS gateway fetch.
 *
 * TODO (production): Verify wallet signature + on-chain access before returning key.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyCid = searchParams.get("keyCid");
    const cid = searchParams.get("cid"); // video CID (for logging)

    if (!keyCid) {
      return NextResponse.json(
        {
          error:
            "Missing keyCid parameter. The key reference was not found in your browser. Please re-upload the video.",
        },
        { status: 400 }
      );
    }

    // Fetch key JSON directly from IPFS gateway — no API key needed
    const urls = [
      `https://${PINATA_GATEWAY}/ipfs/${keyCid}`,
      `https://gateway.pinata.cloud/ipfs/${keyCid}`,
      `https://ipfs.io/ipfs/${keyCid}`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.keyBase64) {
            console.log(`[KeyRegistry] Key retrieved via gateway. videoCid=${cid?.slice(0, 20)}...`);
            return NextResponse.json({ keyBase64: data.keyBase64 }, { status: 200 });
          }
        }
      } catch {
        // Try next gateway
      }
    }

    return NextResponse.json(
      {
        error:
          "Could not fetch key from IPFS gateway. The key file may not be propagated yet — try again in a few seconds.",
      },
      { status: 404 }
    );
  } catch (err) {
    console.error("Key retrieve error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
