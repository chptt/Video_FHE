import { NextRequest, NextResponse } from "next/server";

/**
 * Key Registry — stores AES key as a JSON file on Pinata IPFS.
 *
 * The key JSON is pinned to IPFS with the video CID as metadata.
 * On retrieval, we query Pinata's pin list filtered by the video CID
 * to find the key file's CID, then fetch the key JSON from IPFS.
 *
 * This persists across Vercel serverless cold starts because the data
 * lives on IPFS/Pinata, not in server memory.
 *
 * TODO (production): Replace with Lit Protocol threshold encryption.
 * The key should never be stored in plaintext — encrypt it with the
 * creator's wallet public key (ECIES) before storing.
 */

const PINATA_JWT = process.env.PINATA_JWT!;
const PINATA_API = "https://api.pinata.cloud";

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

    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: "Pinata not configured on server." },
        { status: 500 }
      );
    }

    // Build the key JSON payload
    const keyPayload = JSON.stringify({ keyBase64, creator, videoCid: cid });
    const keyFile = new File([keyPayload], `key_${cid.slice(0, 16)}.json`, {
      type: "application/json",
    });

    // Upload key JSON to Pinata with videoCid as searchable metadata
    const formData = new FormData();
    formData.append("file", keyFile);
    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: `cipherstream_key_${cid.slice(0, 16)}`,
        keyvalues: {
          app: "cipherstream",
          type: "aes_key",
          videoCid: cid,
          creator: creator.toLowerCase(),
        },
      })
    );
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const pinRes = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData,
    });

    if (!pinRes.ok) {
      const errText = await pinRes.text();
      console.error("Pinata key upload error:", errText);
      return NextResponse.json(
        { error: "Failed to store key on IPFS." },
        { status: 502 }
      );
    }

    const pinData = await pinRes.json();
    console.log(
      `[KeyRegistry] Key stored on IPFS. keyCid=${pinData.IpfsHash} videoCid=${cid.slice(0, 20)}...`
    );

    return NextResponse.json(
      { success: true, keyCid: pinData.IpfsHash },
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
