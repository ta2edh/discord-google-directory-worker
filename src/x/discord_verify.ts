import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// Provide synchronous sha512 to noble-ed25519 (Cloudflare Workers lack default)
function concatBytes(arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let pos = 0;
  for (const a of arrs) { out.set(a, pos); pos += a.length; }
  return out;
}
// noble expects a variadic function; wrap sha512 to handle multiple chunks
// @ts-ignore
ed.etc.sha512Sync = (...msgs: Uint8Array[]) => sha512(concatBytes(msgs));

export async function verifyDiscordRequest(request: Request, publicKey: string): Promise<boolean> {
  try {
    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");
    if (!signature || !timestamp) {
      console.log("verify: missing headers", { hasSig: !!signature, hasTs: !!timestamp });
      return false;
    }

    const bodyBytes = new Uint8Array(await request.clone().arrayBuffer());
    const tsBytes = new TextEncoder().encode(timestamp);
    const message = new Uint8Array(tsBytes.length + bodyBytes.length);
    message.set(tsBytes, 0);
    message.set(bodyBytes, tsBytes.length);

    const sig = hexToBytes(signature);
    const pub = hexToBytes(publicKey);
    const ok = await ed.verify(sig, message, pub);
    console.log("verify: result", { ok, bodyLen: bodyBytes.length, tsLen: tsBytes.length });
    return ok;
  } catch (e) {
    console.log("verify: error", String(e));
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}


