"use client";

import React from "react";
import { Settings, UserCog, Users, Boxes, ScrollText, Plug, Lock, Contact, Pencil, Trash2, Warehouse } from "lucide-react";
import { apiFetcher } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button, Chip, Spinner } from "@/components/ui";
import { ContactForm, ProductForm, UserForm, ContactEditForm, WarehouseForm } from "@/components/admin-forms";
import type { UserEditData, ContactEditData, WarehouseEditData } from "@/components/admin-forms";

interface Audits { id: number; user_id: number | null; action: string; entity_type: string | null; entity_id: string | null; detail: string | null; created_at: string; }
interface Master {
  users: { id: number; full_name: string; email: string; role: string; phone: string | null; region: string | null; is_active: number }[];
  products: { id: number; product_name: string; category: string; uom: string; manufacturer: string | null; requires_demplot: number; is_active: number }[];
  contacts: {
    id: number; account_id: number | null; name: string; job_title: string | null; whatsapp_number: string | null; email: string | null;
    type: "B2B" | "B2C"; region: string | null;
    company_name: string | null; legal_type: string | null; account_phone: string | null; account_email: string | null;
    land_size_ha: string | number | null; current_crop: string | null; village: string | null;
  }[];
  warehouses: { id: number; warehouse_name: string; location_type: string; region: string | null; is_active: number }[];
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
  const [tab, setTab] = React.useState<"integrasi" | "pengguna" | "kontak" | "produk" | "gudang" | "audit">("integrasi");
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [audits, setAudits] = React.useState<Audits[] | null>(null);
  const [master, setMaster] = React.useState<Master | null>(null);
  const [integ, setInteg] = React.useState<IntegForm>(EMPTY_INTEG);
  const [integFlags, setIntegFlags] = React.useState({ waSet: false, smtpSet: false });
  const [savingErr, setSavingErr] = React.useState<string | null>(null);
  const [editingUser, setEditingUser] = React.useState<UserEditData | null>(null);
  const [editingContact, setEditingContact] = React.useState<ContactEditData | null>(null);
  const [editingWarehouse, setEditingWarehouse] = React.useState<WarehouseEditData | null>(null);
  const editUserRef = React.useRef<HTMLDivElement>(null);
  const editContactRef = React.useRef<HTMLDivElement>(null);
  const editWarehouseRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (editingUser) editUserRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editingUser]);

  React.useEffect(() => {
    if (editingContact) editContactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editingContact]);

  React.useEffect(() => {
    if (editingWarehouse) editWarehouseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editingWarehouse]);

  const setInt = <K extends "wa" | "smtp">(section: K, key: keyof IntegForm[K], v: string) =>
    setInteg((s) => ({ ...s, [section]: { ...s[section], [key]: v } }));

  const toggleActive = async (u: UserEditData) => {
    try {
      await apiFetcher(`/api/admin/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ full_name: u.full_name, email: u.email, role: u.role, phone: u.phone, region: u.region, is_active: u.is_active ? 0 : 1 }),
      });
      loadMaster();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const deleteContact = async (c: ContactEditData) => {
    if (!window.confirm(`Hapus kontak "${c.name}"? Deal terkait tetap aman, tapi data kontak tidak bisa dikembalikan.`)) return;
    try {
      await apiFetcher(`/api/admin/contacts/${c.id}?type=${c.type}`, { method: "DELETE" });
      loadMaster();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const toggleWarehouse = async (w: WarehouseEditData) => {
    try {
      await apiFetcher(`/api/admin/warehouses/${w.id}`, {
        method: "PUT",
        body: JSON.stringify({ warehouse_name: w.warehouse_name, location_type: w.location_type, region: w.region, is_active: w.is_active ? 0 : 1 }),
      });
      loadMaster();
    } catch (e) {
      alert((e as Error).message);
    }
  };

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
    if (tab === "pengguna" || tab === "kontak" || tab === "produk" || tab === "gudang") loadMaster();
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
          ["gudang", Warehouse, "Gudang"],
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
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><UserCog className="h-4 w-4 text-corporate" /> Tambah Akun Baru</div>
            <UserForm onDone={loadMaster} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Users className="h-4 w-4 text-corporate" /> Akun &amp; Peran</div>
            {!master ? <div className="flex justify-center py-10"><Spinner /></div> : (
              <div className="space-y-2">
                {master.users.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-mist px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-corporate text-[11px] font-bold text-white">
                      {u.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <div className="text-sm font-semibold text-ink">{u.full_name}</div>
                      <div className="text-xs text-slate-500">{u.email}{u.region ? ` · ${u.region}` : ""}</div>
                    </div>
                    <Chip tone={u.role === "admin" ? "red" : u.role === "manager" ? "yellow" : u.role === "hos" ? "violet" : "blue"}>
                      {u.role.toUpperCase()}
                    </Chip>
                    <Chip tone={u.is_active ? "green" : "slate"}>{u.is_active ? "Aktif" : "Nonaktif"}</Chip>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setEditingUser({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, phone: u.phone, region: u.region, is_active: u.is_active })}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                      {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                ))}
                {master.users.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Belum ada pengguna.</div>}
              </div>
            )}
          </div>

          {editingUser && (
            <div ref={editUserRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Pencil className="h-4 w-4 text-corporate" /> Edit Akun</div>
              <UserForm
                key={editingUser.id}
                initial={editingUser}
                onCancel={() => setEditingUser(null)}
                onDone={() => { setEditingUser(null); loadMaster(); }}
              />
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

          {editingContact && (
            <div ref={editContactRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Pencil className="h-4 w-4 text-agro" /> Edit Kontak</div>
              <ContactEditForm
                key={`${editingContact.type}-${editingContact.id}`}
                contact={editingContact}
                onCancel={() => setEditingContact(null)}
                onDone={() => { setEditingContact(null); loadMaster(); }}
              />
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Users className="h-4 w-4 text-corporate" /> Daftar Kontak</div>
            {!master ? <div className="flex justify-center py-10"><Spinner /></div> : (
              <div className="space-y-2">
                {master.contacts.map((c) => (
                  <div key={`${c.type}-${c.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-mist px-4 py-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white ${c.type === "B2B" ? "bg-corporate" : "bg-agro"}`}>
                      {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <div className="text-sm font-semibold text-ink">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.job_title && `${c.job_title} · `}{c.whatsapp_number ?? c.email ?? "-"}{c.region && ` · ${c.region}`}</div>
                    </div>
                    <Chip tone={c.type === "B2B" ? "blue" : "green"}>{c.type}</Chip>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setEditingContact({ type: c.type, id: c.id, name: c.name, job_title: c.job_title, whatsapp_number: c.whatsapp_number, email: c.email, region: c.region, company_name: c.company_name, legal_type: c.legal_type, account_phone: c.account_phone, account_email: c.account_email, land_size_ha: c.land_size_ha, current_crop: c.current_crop, village: c.village })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => deleteContact({ type: c.type, id: c.id, name: c.name, job_title: c.job_title, whatsapp_number: c.whatsapp_number, email: c.email, region: c.region, company_name: c.company_name, legal_type: c.legal_type, account_phone: c.account_phone, account_email: c.account_email, land_size_ha: c.land_size_ha, current_crop: c.current_crop, village: c.village })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
            <ProductForm warehouses={master?.warehouses ?? []} existingProducts={master?.products ?? []} onDone={loadMaster} />
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

      {tab === "gudang" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Warehouse className="h-4 w-4 text-agro" /> Tambah Gudang</div>
            <WarehouseForm onDone={loadMaster} />
          </div>

          {editingWarehouse && (
            <div ref={editWarehouseRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Pencil className="h-4 w-4 text-agro" /> Edit Gudang</div>
              <WarehouseForm
                key={editingWarehouse.id}
                initial={editingWarehouse}
                onCancel={() => setEditingWarehouse(null)}
                onDone={() => { setEditingWarehouse(null); loadMaster(); }}
              />
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Warehouse className="h-4 w-4 text-agro" /> Daftar Gudang</div>
            {!master ? <div className="flex justify-center py-10"><Spinner /></div> : (
              <div className="space-y-2">
                {master.warehouses.map((w) => {
                  const typeLabel = w.location_type === "hazmat" ? "HZM" : w.location_type === "equipment" ? "ALT" : "MIX";
                  const typeTone = w.location_type === "hazmat" ? "red" : w.location_type === "equipment" ? "blue" : "green";
                  return (
                    <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-mist px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-agro text-[11px] font-bold text-white">
                        <Warehouse className="h-4 w-4" />
                      </div>
                      <div className="min-w-[180px] flex-1">
                        <div className="text-sm font-semibold text-ink">{w.warehouse_name}</div>
                        <div className="text-xs text-slate-500">{w.region ?? "Region belum diisi"}</div>
                      </div>
                      <Chip tone={typeTone}>{typeLabel}</Chip>
                      <Chip tone={w.is_active ? "green" : "slate"}>{w.is_active ? "Aktif" : "Nonaktif"}</Chip>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setEditingWarehouse({ id: w.id, warehouse_name: w.warehouse_name, location_type: w.location_type, region: w.region, is_active: w.is_active })}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleWarehouse(w)}>
                        {w.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </div>
                  );
                })}
                {master.warehouses.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Belum ada gudang.</div>}
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