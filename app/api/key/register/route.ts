import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json({ error: "Pinata not configured." }, { status: 500 });
    }

    // Store key as JSON file on Pinata
    // The file name is deterministic: key_<full_video_cid>.json
    // This allows retrieval by fetching a known IPFS path via gateway
    const keyPayload = JSON.stringify({
      keyBase64,
      creator,
      videoCid: cid,
      createdAt: new Date().toISOString(),
    });

    const fileName = `key_${cid}.json`;
    const keyFile = new File([keyPayload], fileName, { type: "application/json" });

    const formData = new FormData();
    formData.append("file", keyFile);
    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: fileName,
        keyvalues: {
          app: "cipherstream",
          type: "aes_key",
          videoCid: cid,
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
      return NextResponse.json({ error: "Failed to store key on IPFS." }, { status: 502 });
    }

    const pinData = await pinRes.json();
    const keyCid: string = pinData.IpfsHash;

    console.log(`[KeyRegistry] Key stored. keyCid=${keyCid} videoCid=${cid.slice(0, 20)}...`);

    // Return the keyCid so the frontend can store it in localStorage
    return NextResponse.json({ success: true, keyCid }, { status: 200 });
  } catch (err) {
    console.error("Key register error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
