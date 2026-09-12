import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { KANBAN_COLUMNS } from "@/lib/types";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const ownerName = user.role === "agent" ? null : (sp.get("owner") || null);
  const q = (sp.get("q") ?? "").trim();

  const ownerClause = ownerName ? " AND d.owner_id IN (SELECT id FROM users WHERE full_name = ?)" : "";
  const searchClause = q
    ? " AND (COALESCE(a.company_name,'') LIKE ? OR COALESCE(b.full_name,'') LIKE ? OR d.ref_no LIKE ?)"
    : "";
  const ownerParams = ownerName ? [ownerName] : [];
  const searchParams = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const ps = [...ownerParams, ...searchParams];

  const [stagesRow, totalsRow, ownerRow, valueRow] = await Promise.all([
    // Deal per stage
    query<{ pipeline_stage: string; cnt: number; total: number }>(
      `SELECT d.pipeline_stage, COUNT(*) AS cnt, COALESCE(SUM(d.total_value),0) AS total
       FROM deals d
       LEFT JOIN accounts a ON a.id = d.account_id
       LEFT JOIN b2c_profiles b ON b.id = d.b2c_profile_id
       WHERE d.is_active = 1 ${ownerClause} ${searchClause}
       GROUP BY d.pipeline_stage`,
      ps
    ),
    // Total keseluruhan (untuk kalkulasi konversi)
    query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM deals d WHERE d.is_active = 1 ${ownerClause}`,
      ownerParams
    ),
    // Performa pemilik
    query<{ full_name: string; cnt: number; total: number }>(
      `SELECT u.full_name, COUNT(d.id) AS cnt, COALESCE(SUM(d.total_value),0) AS total
       FROM users u LEFT JOIN deals d ON d.owner_id = u.id AND d.is_active = 1
       WHERE u.role = 'agent' GROUP BY u.id, u.full_name ORDER BY total DESC`
    ),
    // Pipeline value total
    query<{ total: number }>(
      `SELECT COALESCE(SUM(total_value),0) AS total FROM deals WHERE is_active = 1 ${ownerClause}`,
      ownerParams
    ),
  ]);

  const counts: Record<string, { cnt: number; total: number }> = {};
  for (const r of stagesRow) {
    counts[r.pipeline_stage] = { cnt: Number(r.cnt), total: Number(r.total) };
  }
  const stages = KANBAN_COLUMNS.map((s) => ({
    key: s,
    label: s,
    cnt: counts[s]?.cnt ?? 0,
    total: counts[s]?.total ?? 0,
  }));

  const openTotal = totalsRow[0]?.cnt ? Number(totalsRow[0].cnt) : 0;
  const won = counts["Closed Won"]?.cnt ?? 0;
  const conversion = openTotal ? Math.round((won / openTotal) * 100) : 0;

  return NextResponse.json({
    stages,
    pipelineValue: Number(valueRow[0]?.total ?? 0),
    conversionRate: conversion,
    ownerPerformance: ownerRow,
  });
}