"use client";

import React from "react";
import { Settings, UserCog, Users, Boxes, ScrollText, Plug, Lock, Contact } from "lucide-react";
import { apiFetcher } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button, Chip, Spinner } from "@/components/ui";
import { ContactForm, ProductForm } from "@/components/admin-forms";

interface Audits { id: number; user_id: number | null; action: string; entity_type: string | null; entity_id: string | null; detail: string | null; created_at: string; }
interface Master {
  users: { id: number; full_name: string; email: string; role: string; is_active: number }[];
  products: { id: number; product_name: string; category: string; is_active: number }[];
  contacts: { id: number; account_id: number | null; name: string; job_title: string | null; whatsapp_number: string | null; email: string | null; type: "B2B" | "B2C"; region: string | null }[];
  warehouses: { id: number; warehouse_name: string; region: string | null }[];
}

type IntegForm = {
  wa: { token: string; sender: string };
  smtp: { host: string; port: string; user: string; from: string };
};
type ApiInteg = {
  wa: { token: string | null; tokenSet: boolean; sender: string };
  smtp: { host: string; port: string; user: string | null; userSet: boolean; from: string };
};

const EMPTY_INTEG: IntegForm = { wa: { token: "", sender: "" }, smtp: { host: "", port: "", user: "", from: "" } };

export default function SettingsClient() {
  const [tab, setTab] = React.useState<"integrasi" | "pengguna" | "kontak" | "produk" | "audit">("integrasi");
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [audits, setAudits] = React.useState<Audits[] | null>(null);
  const [master, setMaster] = React.useState<Master | null>(null);
  const [integ, setInteg] = React.useState<IntegForm>(EMPTY_INTEG);
  const [integFlags, setIntegFlags] = React.useState({ waSet: false, smtpSet: false });
  const [savingErr, setSavingErr] = React.useState<string | null>(null);

  const setInt = <K extends "wa" | "smtp">(section: K, key: keyof IntegForm[K], v: string) =>
    setInteg((s) => ({ ...s, [section]: { ...s[section], [key]: v } }));

  const loadAudit = () => {
    apiFetcher<{ audits: Audits[] }>("/api/audit").then((r) => setAudits(r.audits)).catch(() => setAudits([]));
  };
  const loadMaster = () => {
    apiFetcher<Master>("/api/admin/master").then(setMaster).catch(() => setMaster({ users: [], products: [], contacts: [], warehouses: [] }));
  };
  const loadIntegrasi = () => {
    apiFetcher<ApiInteg>("/api/settings")
      .then((r) => {
        setInteg({ wa: { token: "", sender: r.wa.sender }, smtp: { host: r.smtp.host, port: r.smtp.port, user: "", from: r.smtp.from } });
        setIntegFlags({ waSet: r.wa.tokenSet, smtpSet: r.smtp.userSet });
      })
      .catch(() => setIntegFlags({ waSet: false, smtpSet: false }));
  };

  React.useEffect(() => {
    if (tab === "integrasi") loadIntegrasi();
    if (tab === "audit") loadAudit();
    if (tab === "pengguna" || tab === "kontak" || tab === "produk") loadMaster();
  }, [tab]);

  const saveInteg = async (section: "wa" | "smtp") => {
    setSavingErr(null);
    const flagKey = section === "wa" ? "waSet" : "smtpSet";
    try {
      const payload =
        section === "wa"
          ? { wa: { token: integ.wa.token, sender: integ.wa.sender } }
          : { smtp: { host: integ.smtp.host, port: integ.smtp.port, user: integ.smtp.user, from: integ.smtp.from } };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Gagal menyimpan konfigurasi.");
      setSaved((s) => ({ ...s, [section]: true }));
      setIntegFlags((f) => ({ ...f, [flagKey]: true }));
      if (section === "wa") setInteg((s) => ({ ...s, wa: { ...s.wa, token: "" } }));
      else setInteg((s) => ({ ...s, smtp: { ...s.smtp, user: "" } }));
      setTimeout(() => setSaved((s) => ({ ...s, [section]: false })), 1800);
    } catch (err) {
      setSavingErr((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <Settings className="h-5 w-5 text-agro" /> Konfigurasi CRM
        </h1>
        <p className="text-sm text-slate-500">Pengaturan integrasi pihak ketiga &amp; data master.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1">
        {([
          ["integrasi", Plug, "Integrasi"],
          ["pengguna", Users, "Pengguna"],
          ["kontak", Contact, "Kontak"],
          ["produk", Boxes, "Produk"],
          ["audit", ScrollText, "Audit Log"],
        ] as const).map(([k, Icon, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition ${tab === k ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "integrasi" && (
        <div className="space-y-4">
          {savingErr && (
            <div className="rounded-xl bg-danger-mist px-4 py-3 text-sm font-medium text-danger">{savingErr}</div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-agro-mist text-agro"><UserCog className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="font-bold text-ink">WhatsApp Business API</div>
                <div className="text-xs text-slate-500">Pesan otomasi approval &amp; notifikasi agen</div>
              </div>
              <Chip tone={integFlags.waSet && integ.wa.sender ? "green" : "slate"}>
                {integFlags.waSet && integ.wa.sender ? "Terhubung" : "Belum dikonfigurasi"}
              </Chip>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Token API" placeholder="xxxxxx" type="password" value={integ.wa.token} onChange={(v) => setInt("wa", "token", v)} note={integFlags.waSet ? "Terpasang" : undefined} />
              <Field label="Nomor Sender" placeholder="+62811xxxxxx" type="tel" value={integ.wa.sender} onChange={(v) => setInt("wa", "sender", v)} />
            </div>
            <Button className="mt-3" onClick={() => saveInteg("wa")}>{saved.wa ? "Tersimpan ✓" : "Simpan Konfigurasi"}</Button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-corporate-soft text-corporate"><Lock className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="font-bold text-ink">SMTP / Email API</div>
                <div className="text-xs text-slate-500">Kanal pemasaran email musiman</div>
              </div>
              <Chip tone={integFlags.smtpSet && integ.smtp.host ? "green" : "slate"}>
                {integFlags.smtpSet && integ.smtp.host ? "Terhubung" : "Belum dikonfigurasi"}
              </Chip>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="SMTP Host" placeholder="smtp.example.com" value={integ.smtp.host} onChange={(v) => setInt("smtp", "host", v)} />
              <Field label="Port" placeholder="587" type="number" value={integ.smtp.port} onChange={(v) => setInt("smtp", "port", v)} />
              <Field label="Username" placeholder="user@example.com" type="password" value={integ.smtp.user} onChange={(v) => setInt("smtp", "user", v)} note={integFlags.smtpSet ? "Terpasang" : undefined} />
              <Field label="Alias Pengirim" placeholder="OmniCRM Agro <agro@domain.id>" value={integ.smtp.from} onChange={(v) => setInt("smtp", "from", v)} />
            </div>
            <Button className="mt-3" onClick={() => saveInteg("smtp")}>{saved.smtp ? "Tersimpan ✓" : "Simpan Konfigurasi"}</Button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-bold text-ink">Kebijakan Bisnis</div>
            <div className="mt-2 space-y-1.5 text-xs text-slate-500">
              <p>• Diskon ≤ 5% → otomatis disetujui agen.</p>
              <p>• Diskon 5,1–15% → persetujuan Manager (via WA deep-link).</p>
              <p>• Diskon &gt; 15% → persetujuan Head of Sales.</p>
              <p>• Kunci stok: alokasi 3x24 jam (expired otomatis dilepas).</p>
            </div>
          </div>
        </div>
      )}

      {tab === "pengguna" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Users className="h-4 w-4 text-corporate" /> Akun &amp; Peran</div>
          {!master ? <div className="flex justify-center py-10"><Spinner /></div> : (
            <div className="space-y-2">
              {master.users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-mist px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-corporate text-[11px] font-bold text-white">
                    {u.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <Chip tone={u.role === "admin" ? "red" : u.role === "manager" ? "yellow" : u.role === "hos" ? "violet" : "blue"}>
                    {u.role.toUpperCase()}
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "kontak" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Contact className="h-4 w-4 text-agro" /> Tambah Kontak</div>
            <ContactForm onDone={loadMaster} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Users className="h-4 w-4 text-corporate" /> Daftar Kontak</div>
            {!master ? <div className="flex justify-center py-10"><Spinner /></div> : (
              <div className="space-y-2">
                {master.contacts.map((c) => (
                  <div key={`${c.type}-${c.id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-mist px-4 py-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white ${c.type === "B2B" ? "bg-corporate" : "bg-agro"}`}>
                      {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.job_title && `${c.job_title} · `}{c.whatsapp_number ?? c.email ?? "-"}{c.region && ` · ${c.region}`}</div>
                    </div>
                    <Chip tone={c.type === "B2B" ? "blue" : "green"}>{c.type}</Chip>
                  </div>
                ))}
                {master.contacts.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Belum ada kontak.</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "produk" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Boxes className="h-4 w-4 text-agro" /> Tambah Produk</div>
            <ProductForm warehouses={master?.warehouses ?? []} onDone={loadMaster} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Boxes className="h-4 w-4 text-agro" /> Master Produk</div>
            {!master ? <div className="flex justify-center py-10"><Spinner /></div> : (
              <div className="space-y-2">
                {master.products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-mist px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink">{p.product_name}</div>
                      <div className="text-xs text-slate-500">ID #{p.id}</div>
                    </div>
                    <Chip tone={p.category === "KIMIA" ? "red" : "violet"}>{p.category}</Chip>
                    <Chip tone={p.is_active ? "green" : "slate"}>{p.is_active ? "Aktif" : "Nonaktif"}</Chip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><ScrollText className="h-4 w-4 text-slate-400" /> Jejak Audit Terbaru</div>
          {!audits ? <div className="flex justify-center py-10"><Spinner /></div> : audits.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Belum ada aktivitas tercatat.</div>
          ) : (
            <div className="space-y-2">
              {audits.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-mist px-4 py-2.5">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink">{a.action}</div>
                    <div className="text-xs text-slate-500">{a.entity_type && `#${a.entity_id} · `}{a.detail ?? ""}</div>
                  </div>
                  <div className="text-[11px] text-slate-400">{formatDateTime(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  note,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  note?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-sm font-medium text-ink">
        <span>{label}</span>
        {note && <span className="text-[11px] font-normal text-agro">{note}</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
      />
    </label>
  );
}