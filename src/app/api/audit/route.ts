import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }
  const audits = await query(
    `SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id, al.detail, al.created_at, u.full_name
     FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC LIMIT 60`
  );
  return NextResponse.json({ audits });
}