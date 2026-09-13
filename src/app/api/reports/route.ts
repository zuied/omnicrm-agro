import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { STAGE_ORDER } from "@/lib/stages";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();

  // Agent hanya melihat deal miliknya sendiri; non-agent (admin/manager/hos) dapat memfilter per sales.
  const isAgent = user.role === "agent";
  const selectedOwner = !isAgent ? (sp.get("owner") || null) : null;

  const ownerClause = isAgent
    ? " AND d.owner_id = ?"
    : selectedOwner
      ? " AND d.owner_id IN (SELECT id FROM users WHERE full_name = ?)"
      : "";
  const ownerParams = isAgent ? [user.id] : selectedOwner ? [selectedOwner] : [];

  const searchClause = q
    ? " AND (COALESCE(a.company_name,'') LIKE ? OR COALESCE(b.full_name,'') LIKE ? OR d.ref_no LIKE ?)"
    : "";
  const searchParams = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const ps = [...ownerParams, ...searchParams];

  const [stagesRow, totalsRow, ownerRow, openRow, optionsRow] = await Promise.all([
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
    // Performa pemilik (ranking mengikuti filter sales yang dipilih)
    query<{ full_name: string; cnt: number; total: number }>(
      `SELECT u.full_name, COUNT(d.id) AS cnt, COALESCE(SUM(d.total_value),0) AS total
       FROM users u LEFT JOIN deals d ON d.owner_id = u.id AND d.is_active = 1
       WHERE u.role = 'agent' ${isAgent ? " AND u.id = ?" : selectedOwner ? " AND u.full_name = ?" : ""}
       GROUP BY u.id, u.full_name ORDER BY total DESC`,
      isAgent ? [user.id] : selectedOwner ? [selectedOwner] : []
    ),
    // Pipeline value: hanya deal yang masih terbuka (exclude Closed Won/Lost)
    query<{ cnt: number; total: number }>(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(d.total_value),0) AS total
       FROM deals d
       WHERE d.is_active = 1 AND d.pipeline_stage NOT IN ('Closed Won','Closed Lost') ${ownerClause}`,
      ownerParams
    ),
    // Daftar sales untuk dropdown filter (selalu semua agent)
    query<{ full_name: string }>(
      `SELECT full_name FROM users WHERE role = 'agent' ORDER BY full_name`
    ),
  ]);

  const counts: Record<string, { cnt: number; total: number }> = {};
  for (const r of stagesRow) {
    counts[r.pipeline_stage] = { cnt: Number(r.cnt), total: Number(r.total) };
  }
  const stages = STAGE_ORDER.map((s) => ({
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
    pipelineValue: Number(openRow[0]?.total ?? 0),
    openCount: Number(openRow[0]?.cnt ?? 0),
    conversionRate: conversion,
    ownerOptions: isAgent ? [{ full_name: user.full_name }] : optionsRow,
    ownerPerformance: ownerRow,
  });
}