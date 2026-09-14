import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { auditLog } from "@/lib/audit";

const KEY = "integrasi";

type Integrasi = {
  wa?: { token?: string; sender?: string };
  smtp?: { host?: string; port?: string; user?: string; from?: string };
};

function mask(v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (v.length <= 8) return "••••";
  return `${v.slice(0, 4)}••••${v.slice(-4)}`;
}

async function getIntegrasi(): Promise<Integrasi> {
  const rows = await query<{ svalue: string | null }>("SELECT svalue FROM system_settings WHERE skey = ? LIMIT 1", [KEY]);
  const raw = rows[0]?.svalue;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Integrasi;
  } catch {
    return {};
  }
}

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }
  const cfg = await getIntegrasi();
  return NextResponse.json({
    wa: {
      token: mask(cfg.wa?.token),
      tokenSet: Boolean(cfg.wa?.token),
      sender: cfg.wa?.sender ?? "",
    },
    smtp: {
      host: cfg.smtp?.host ?? "",
      port: cfg.smtp?.port ?? "",
      user: mask(cfg.smtp?.user),
      userSet: Boolean(cfg.smtp?.user),
      from: cfg.smtp?.from ?? "",
    },
  });
}

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    wa?: { token?: string; sender?: string };
    smtp?: { host?: string; port?: string; user?: string; from?: string };
  };
  if (!body.wa && !body.smtp) {
    return NextResponse.json({ message: "Tidak ada data untuk disimpan." }, { status: 400 });
  }

  const current = await getIntegrasi();
  const next: Integrasi = {
    wa: {
      token: body.wa?.token?.trim() ? body.wa.token.trim() : (current.wa?.token ?? ""),
      sender: body.wa?.sender?.trim() ?? current.wa?.sender ?? "",
    },
    smtp: {
      host: body.smtp?.host?.trim() ?? current.smtp?.host ?? "",
      port: body.smtp?.port?.trim() ?? current.smtp?.port ?? "",
      user: body.smtp?.user?.trim() ? body.smtp.user.trim() : (current.smtp?.user ?? ""),
      from: body.smtp?.from?.trim() ?? current.smtp?.from ?? "",
    },
  };

  await execute(
    `INSERT INTO system_settings (skey, svalue) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)`,
    [KEY, JSON.stringify(next)]
  );
  await auditLog({ userId: user.id, action: "SETTINGS_UPDATE", entityType: "config", detail: { key: KEY } });

  return NextResponse.json({ ok: true, message: "Konfigurasi tersimpan." });
}