import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const channel = sp.get("channel") ?? "all";
  const q = (sp.get("q") ?? "").trim();

  let sql = `
    SELECT m.*, COALESCE(a.company_name, b.full_name, d.ref_no) AS deal_label,
           d.ref_no AS deal_ref
    FROM inbox_messages m
    LEFT JOIN deals d ON d.id = m.deal_id
    LEFT JOIN accounts a ON a.id = d.account_id
    LEFT JOIN b2c_profiles b ON b.id = d.b2c_profile_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (channel !== "all") {
    sql += " AND m.channel = ?";
    params.push(channel);
  }
  if (q) {
    sql += " AND (m.subject LIKE ? OR m.body LIKE ? OR m.counterpart LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += " ORDER BY m.created_at DESC LIMIT 100";
  const messages = await query(sql, params);

  const promos =
    user.role === "manager" || user.role === "admin" || user.role === "hos"
      ? await query("SELECT * FROM seasonal_promos WHERE status = 'active' ORDER BY created_at DESC")
      : [];

  return NextResponse.json({ messages, promos });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !body.counterpart || !body.body) {
    return NextResponse.json({ message: "counterpart dan body wajib diisi." }, { status: 400 });
  }

  await execute(
    `INSERT INTO inbox_messages (direction, channel, counterpart, counterpart_phone, deal_id, subject, body, status)
     VALUES ('outbound', ?, ?, ?, ?, ?, ?, 'sent')`,
    [
      body.channel ?? "whatsapp",
      body.counterpart,
      body.counterpart_phone ?? null,
      body.deal_id ? Number(body.deal_id) : null,
      body.subject ?? null,
      body.body,
    ]
  );
  await auditLog({ userId: user.id, action: "MESSAGE_SEND", entityType: "message", detail: { channel: body.channel } });
  return NextResponse.json({ ok: true }, { status: 201 });
}