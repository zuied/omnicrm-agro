import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createDeal } from "@/lib/pipeline";
import { execute, query } from "@/lib/db";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  try {
    const result = await createDeal({
      customer_type: body.customer_type,
      customer_id: Number(body.customer_id),
      owner_id: user.role === "agent" ? user.id : Number(body.owner_id ?? user.id),
      stage: body.stage,
      items: body.items ?? [],
      discount_percent: Number(body.discount_percent ?? 0),
      closing_date: body.closing_date || undefined,
      urgency: body.urgency,
      notes: body.notes,
    });

    // Pesan WA otomatis ke manager (stub WhatsApp Business API)
    if (result.token) {
      const approveUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/approve/${result.token}`;
      await execute(
        `INSERT INTO inbox_messages (direction, channel, counterpart, deal_id, subject, body, status)
         VALUES ('outbound','whatsapp', ?, ?, 'Permintaan Persetujuan Diskon', ?, 'sent')`,
        [
          "Sales Manager (Otomasi WA)",
          result.id,
          `Hi Manager, deal ${result.ref} meminta persetujuan diskon ${body.discount_percent}%. Klik untuk setujui/tolak: ${approveUrl}`,
        ]
      );
    }

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}

export async function GET() {
  // Master data ringan untuk form create deal
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [accounts, b2c, variants] = await Promise.all([
    query("SELECT id, company_name, region FROM accounts ORDER BY company_name"),
    query("SELECT id, full_name, region FROM b2c_profiles ORDER BY full_name"),
    query(
      `SELECT pv.id, pv.variant_name, pv.price, pv.sku, p.category, p.uom, p.product_name
       FROM product_variants pv JOIN products p ON p.id = pv.product_id
       WHERE pv.is_active = 1 AND p.is_active = 1 ORDER BY p.product_name`
    ),
  ]);
  return NextResponse.json({ accounts, b2c, variants });
}