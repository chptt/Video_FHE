import { NextRequest, NextResponse } from "next/server";

/**
 * Key Retrieval — finds the AES key for a given video CID.
 *
 * Queries Pinata's pin list for files tagged with the video CID,
 * then fetches the key JSON from the IPFS gateway.
 *
 * TODO (production): Verify wallet signature + on-chain access
 * before returning the key.
 */

const PINATA_JWT = process.env.PINATA_JWT!;
const PINATA_GATEWAY =
  process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
const PINATA_API = "https://api.pinata.cloud";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cid = searchParams.get("cid");

    if (!cid) {
      return NextResponse.json(
        { error: "Missing cid parameter." },
        { status: 400 }
      );
    }

    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: "Pinata not configured on server." },
        { status: 500 }
      );
    }

    // Query Pinata pin list filtered by videoCid metadata
    const queryUrl =
      `${PINATA_API}/data/pinList?` +
      `status=pinned` +
      `&metadata[keyvalues][videoCid]={"value":"${encodeURIComponent(cid)}","op":"eq"}` +
      `&metadata[keyvalues][app]={"value":"cipherstream","op":"eq"}` +
      `&pageLimit=1`;

    const listRes = await fetch(queryUrl, {
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error("Pinata pin list error:", errText);
      return NextResponse.json(
        { error: "Failed to query key registry." },
        { status: 502 }
      );
    }

    const listData = await listRes.json();

    if (!listData.rows || listData.rows.length === 0) {
      console.warn(`[KeyRegistry] No key found for CID: ${cid.slice(0, 20)}...`);
      return NextResponse.json(
        {
          error:
            "Decryption key not found. The video may have been uploaded before the persistent key store was enabled. Please re-upload the video.",
        },
        { status: 404 }
      );
    }

    // Fetch the key JSON from IPFS gateway
    const keyCid = listData.rows[0].ipfs_pin_hash;
    const keyUrl = `https://${PINATA_GATEWAY}/ipfs/${keyCid}`;

    const keyRes = await fetch(keyUrl);
    if (!keyRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch key from IPFS." },
        { status: 502 }
      );
    }

    const keyData = await keyRes.json();

    console.log(
      `[KeyRegistry] Key retrieved for CID: ${cid.slice(0, 20)}...`
    );

    return NextResponse.json(
      { keyBase64: keyData.keyBase64 },
      { status: 200 }
    );
  } catch (err) {
    console.error("Key retrieve error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
