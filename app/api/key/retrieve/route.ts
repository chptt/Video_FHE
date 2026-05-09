import { NextRequest, NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT!;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
const PINATA_API = "https://api.pinata.cloud";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cid = searchParams.get("cid");

    if (!cid) {
      return NextResponse.json({ error: "Missing cid parameter." }, { status: 400 });
    }

    if (!PINATA_JWT) {
      return NextResponse.json({ error: "Pinata not configured." }, { status: 500 });
    }

    // ── Strategy 1: Query Pinata pin list by metadata keyvalue ──
    // Pinata metadata filter format: metadata[keyvalues][field]={"value":"...","op":"eq"}
    const params = new URLSearchParams({
      status: "pinned",
      pageLimit: "5",
    });
    // Append raw (not double-encoded) metadata filter
    const rawQuery =
      params.toString() +
      `&metadata[keyvalues][videoCid]={"value":"${cid}","op":"eq"}` +
      `&metadata[keyvalues][app]={"value":"cipherstream","op":"eq"}`;

    const listRes = await fetch(`${PINATA_API}/data/pinList?${rawQuery}`, {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData.rows && listData.rows.length > 0) {
        const keyCid = listData.rows[0].ipfs_pin_hash;
        const keyData = await fetchKeyFromGateway(keyCid);
        if (keyData) {
          return NextResponse.json({ keyBase64: keyData.keyBase64 }, { status: 200 });
        }
      }
    } else {
      console.warn("Pin list query failed:", listRes.status, await listRes.text());
    }

    // ── Strategy 2: Search by name prefix ──────────────────────
    const nameRes = await fetch(
      `${PINATA_API}/data/pinList?status=pinned&pageLimit=10&metadata[name]=cipherstream_key_${cid.slice(0, 16)}`,
      {
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
      }
    );

    if (nameRes.ok) {
      const nameData = await nameRes.json();
      if (nameData.rows && nameData.rows.length > 0) {
        const keyCid = nameData.rows[0].ipfs_pin_hash;
        const keyData = await fetchKeyFromGateway(keyCid);
        if (keyData && keyData.videoCid === cid) {
          return NextResponse.json({ keyBase64: keyData.keyBase64 }, { status: 200 });
        }
        // If videoCid doesn't match exactly, still try it (name prefix is unique enough)
        if (keyData?.keyBase64) {
          return NextResponse.json({ keyBase64: keyData.keyBase64 }, { status: 200 });
        }
      }
    }

    // ── Strategy 3: List all recent cipherstream keys and match ─
    const allRes = await fetch(
      `${PINATA_API}/data/pinList?status=pinned&pageLimit=50&metadata[keyvalues][app]={"value":"cipherstream","op":"eq"}`,
      {
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
      }
    );

    if (allRes.ok) {
      const allData = await allRes.json();
      if (allData.rows && allData.rows.length > 0) {
        for (const row of allData.rows) {
          // Check metadata keyvalues if available
          const kv = row.metadata?.keyvalues;
          if (kv?.videoCid === cid) {
            const keyData = await fetchKeyFromGateway(row.ipfs_pin_hash);
            if (keyData?.keyBase64) {
              return NextResponse.json({ keyBase64: keyData.keyBase64 }, { status: 200 });
            }
          }
        }
        // If no exact match found via metadata, try fetching each and checking videoCid field
        for (const row of allData.rows) {
          const keyData = await fetchKeyFromGateway(row.ipfs_pin_hash);
          if (keyData?.videoCid === cid && keyData?.keyBase64) {
            return NextResponse.json({ keyBase64: keyData.keyBase64 }, { status: 200 });
          }
        }
      }
    }

    console.warn(`[KeyRegistry] Key not found for CID: ${cid.slice(0, 20)}...`);
    return NextResponse.json(
      {
        error:
          "Decryption key not found. Please re-upload the video — older videos uploaded before the persistent key store was enabled cannot be played.",
      },
      { status: 404 }
    );
  } catch (err) {
    console.error("Key retrieve error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

async function fetchKeyFromGateway(
  keyCid: string
): Promise<{ keyBase64: string; videoCid?: string; creator?: string } | null> {
  try {
    // Try dedicated gateway first, then public fallback
    const urls = [
      `https://${PINATA_GATEWAY}/ipfs/${keyCid}`,
      `https://gateway.pinata.cloud/ipfs/${keyCid}`,
      `https://ipfs.io/ipfs/${keyCid}`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.keyBase64) return data;
        }
      } catch {
        // Try next URL
      }
    }
    return null;
  } catch {
    return null;
  }
}
