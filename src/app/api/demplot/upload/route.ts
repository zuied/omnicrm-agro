import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 500 * 1024; // UAT: foto final <= 500KB

/** Upload ke Cloudinary (unsigned preset). Kembali null jika env belum di-set. */
async function uploadToCloudinary(buf: Buffer): Promise<string | null> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) return null;

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: "image/jpeg" }), "demplot.jpg");
  form.append("upload_preset", preset);
  if (process.env.CLOUDINARY_FOLDER) form.append("folder", process.env.CLOUDINARY_FOLDER);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.secure_url) {
    throw new Error(json?.error?.message ?? `Upload Cloudinary gagal (HTTP ${res.status}).`);
  }
  return json.secure_url as string;
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.imageDataUrl !== "string") {
    return NextResponse.json({ message: "Data foto tidak ditemukan." }, { status: 400 });
  }
  const dealId = Number(body.dealId);
  if (!dealId) return NextResponse.json({ message: "Deal wajib diisi." }, { status: 400 });

  const deal = await query<{ owner_id: number }>("SELECT owner_id FROM deals WHERE id = ?", [dealId]);
  if (!deal[0]) return NextResponse.json({ message: "Deal tidak ditemukan." }, { status: 404 });
  if (user.role === "agent" && deal[0].owner_id !== user.id) {
    return NextResponse.json({ message: "Tidak berhak upload demplot untuk deal ini." }, { status: 403 });
  }

  const match = /^data:(image\/(png|jpeg));base64,([\s\S]+)$/.exec(body.imageDataUrl);
  if (!match) {
    return NextResponse.json({ message: "Format foto harus JPG/PNG (data URL)." }, { status: 400 });
  }

  const buf = Buffer.from(match[3], "base64");
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({
      message: `Foto terlalu besar (${(buf.length / 1024).toFixed(0)}KB). Maksimal 500KB.`,
      compressedTooLarge: true,
      sizeKb: Math.round(buf.length / 1024),
    }, { status: 400 });
  }

  // Cloudinary tersedia → simpan di cloud; selain itu fallback filesystem (dev lokal).
  const remoteUrl = await uploadToCloudinary(buf);
  let url: string;
  if (remoteUrl) {
    url = remoteUrl;
  } else {
    const ext = match[1] === "image/png" ? "png" : "jpg";
    const fileName = `demplot-${dealId}-${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "demplot");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), buf);
    url = `/uploads/demplot/${fileName}`;
  }
  const caption = body.caption ?? null;
  const geoNote = body.geo ? ` (lat: ${body.geo.latitude}, lng: ${body.geo.longitude})` : "";

  await execute(
    `INSERT INTO activity_records (deal_id, agent_id, kind, title, description, media_url, media_size_kb)
     VALUES (?,?, 'photo', 'Bukti Demonstrasi Plot', ?, ?, ?)`,
    [dealId, user.id, caption ? `${caption}${geoNote}` : `Bukti pemberian sampel di lokasi${geoNote}`, url, Math.round(buf.length / 1024)]
  );

  await auditLog({
    userId: user.id,
    action: "DEMPLOT_UPLOAD",
    entityType: "deal",
    entityId: String(dealId),
    detail: { url, sizeKb: Math.round(buf.length / 1024), caption },
  });

  return NextResponse.json({
    ok: true,
    mediaUrl: url,
    sizeKb: Math.round(buf.length / 1024),
    uat: { under500KB: buf.length <= MAX_BYTES },
  }, { status: 201 });
}