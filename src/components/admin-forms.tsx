"use client";

import React from "react";
import { PlusCircle, UserRoundPlus } from "lucide-react";
import { apiFetcher } from "@/lib/types";
import { Button, Field } from "@/components/ui";

const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm";

function Txt({
  label, value, onChange, placeholder, type = "text", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <Field label={label}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputCls} />
    </Field>
  );
}

function Sel({
  label, value, onChange, options, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

function Num({
  label, value, onChange, placeholder, min, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; min?: string; required?: boolean;
}) {
  return (
    <Field label={label}>
      <input type="number" inputMode="decimal" step="any" min={min} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputCls} />
    </Field>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mt-3 flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-mist px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
    >
      <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${checked ? "bg-agro" : "bg-slate-300"}`}>
        <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </span>
      {label}
    </button>
  );
}

function ErrorBox({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <div className="rounded-xl bg-danger-mist px-4 py-3 text-xs font-medium text-danger">{msg}</div>;
}

/* ============================== KONTAK ============================== */

export function ContactForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = React.useState<"B2B" | "B2C">("B2B");
  const [b2b, setB2b] = React.useState({ company_name: "", legal_type: "", region: "", phone: "", email: "", first_name: "", job_title: "", whatsapp_number: "", contact_email: "" });
  const [b2c, setB2c] = React.useState({ full_name: "", whatsapp_number: "", email: "", land_size_ha: "", current_crop: "", region: "", village: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const setOf = (o: "b2b" | "b2c", key: string) => (v: string) =>
    (o === "b2b" ? setB2b((s) => ({ ...s, [key]: v })) : setB2c((s) => ({ ...s, [key]: v })));

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await apiFetcher("/api/admin/contacts", {
        method: "POST",
        body: JSON.stringify(type === "B2B" ? { type: "B2B", ...b2b } : { type: "B2C", ...b2c }),
      });
      setDone(true);
      onDone();
      setTimeout(() => setDone(false), 2200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {(["B2B", "B2C"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${type === t ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
          >
            {t === "B2B" ? "Perusahaan / Grosir" : "Petani (Retail)"}
          </button>
        ))}
      </div>

      {type === "B2B" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Txt label="Nama Perusahaan *" value={b2b.company_name} onChange={setOf("b2b", "company_name")} placeholder="PT/CV/Koperasi…" required />
            <Txt label="Bentuk Usaha" value={b2b.legal_type} onChange={setOf("b2b", "legal_type")} placeholder="PT / CV / Koperasi" />
            <Txt label="Wilayah / Region" value={b2b.region} onChange={setOf("b2b", "region")} placeholder="Riau, Jabar…" />
            <Txt label="Telepon Perusahaan" value={b2b.phone} onChange={setOf("b2b", "phone")} placeholder="0761-xxxxxx" />
            <Txt label="Email Perusahaan" value={b2b.email} onChange={setOf("b2b", "email")} type="email" placeholder="nama@perusahaan.id" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Kontak Person</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Txt label="Nama Kontak *" value={b2b.first_name} onChange={setOf("b2b", "first_name")} placeholder="Mis. Pak Usman" required />
            <Txt label="Jabatan" value={b2b.job_title} onChange={setOf("b2b", "job_title")} placeholder="Pemilik Kios" />
            <Txt label="Nomor WhatsApp" value={b2b.whatsapp_number} onChange={setOf("b2b", "whatsapp_number")} placeholder="0812-xxxx-xxxx" />
            <Txt label="Email Kontak" value={b2b.contact_email} onChange={setOf("b2b", "contact_email")} type="email" placeholder="ops@perusahaan.id" />
          </div>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Txt label="Nama Lengkap *" value={b2c.full_name} onChange={setOf("b2c", "full_name")} placeholder="Mis. Petani Karim" required />
          <Txt label="Nomor WhatsApp" value={b2c.whatsapp_number} onChange={setOf("b2c", "whatsapp_number")} placeholder="0812-xxxx-xxxx" />
          <Txt label="Email" value={b2c.email} onChange={setOf("b2c", "email")} type="email" placeholder="petani@email.com" />
          <Num label="Luas Lahan (Ha)" value={b2c.land_size_ha} onChange={setOf("b2c", "land_size_ha")} placeholder="2.5" min="0" />
          <Txt label="Tanaman Saat Ini" value={b2c.current_crop} onChange={setOf("b2c", "current_crop")} placeholder="Padi, Sawit, Cabai…" />
          <Txt label="Wilayah / Region" value={b2c.region} onChange={setOf("b2c", "region")} placeholder="Riau" />
          <Txt label="Desa / Kelurahan" value={b2c.village} onChange={setOf("b2c", "village")} placeholder="Desa Sawit" />
        </div>
      )}

      <ErrorBox msg={error} />
      {done && <div className="rounded-xl bg-agro-mist px-4 py-3 text-xs font-semibold text-agro">✓ Kontak berhasil ditambahkan.</div>}
      <Button size="lg" className="w-full" onClick={submit} loading={saving}>
        {saving ? undefined : <UserRoundPlus className="h-4 w-4" />}
        Simpan Kontak {type}
      </Button>
    </div>
  );
}

/* ============================== PRODUK ============================== */

interface Warehouse { id: number; warehouse_name: string; region: string | null; }
interface ExistingProduct { id: number; product_name: string; category: string; uom: string; manufacturer: string | null; requires_demplot: number; is_active: number; }

function ProductCombobox({
  products,
  value,
  onChange,
  onPick,
}: {
  products: ExistingProduct[];
  value: string;
  onChange: (v: string) => void;
  onPick: (p: ExistingProduct) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(
    () => products.filter((p) => p.product_name.toLowerCase().includes(value.toLowerCase())),
    [products, value]
  );

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (p: ExistingProduct) => {
    onPick(p);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && open && filtered.length > 0) {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp" && open && filtered.length > 0) {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && filtered.length > 0 && filtered[highlight]) {
            e.preventDefault();
            pick(filtered[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Ketik atau pilih dari daftar…"
        required
        className={inputCls}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(p); }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-agro-mist ${i === highlight ? "bg-agro-mist" : ""}`}
              >
                <span className="truncate font-medium text-ink">{p.product_name}</span>
                <span className="shrink-0 text-[11px] font-bold text-slate-400">{p.category === "agrochemical" ? "KIMIA" : "ALAT"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductForm({ warehouses, existingProducts = [], onDone }: { warehouses: Warehouse[]; existingProducts?: ExistingProduct[]; onDone: () => void }) {
  const [category, setCategory] = React.useState<"agrochemical" | "equipment">("agrochemical");
  const [name, setName] = React.useState("");
  const [uom, setUom] = React.useState("Pcs");
  const [manufacturer, setManufacturer] = React.useState("");
  const [requiresDemplot, setRequiresDemplot] = React.useState(false);
  const [sku, setSku] = React.useState("");
  const [variantName, setVariantName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [volPerUnit, setVolPerUnit] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [hazard, setHazard] = React.useState("Standard");
  const [brand, setBrand] = React.useState("");
  const [warranty, setWarranty] = React.useState("12");
  const [whId, setWhId] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [qtyWarning, setQtyWarning] = React.useState("10");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [pickedExisting, setPickedExisting] = React.useState(false);

  const applyExisting = (p: ExistingProduct) => {
    setName(p.product_name);
    setCategory(p.category === "equipment" ? "equipment" : "agrochemical");
    setUom(p.uom);
    setManufacturer(p.manufacturer ?? "");
    setRequiresDemplot(p.requires_demplot === 1);
    setPickedExisting(true);
  };

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        category,
        product_name: name,
        uom,
        manufacturer,
        requires_demplot: requiresDemplot,
        sku,
        variant_name: variantName,
        price: Number(price),
      };
      if (category === "agrochemical") {
        body.agro_chemical_attrs = {
          volume_per_unit: volPerUnit,
          expiry_date: expiry,
          hazard: hazard || "Standard",
        };
      } else {
        body.equipment_attrs = { brand, warranty_months: warranty };
      }
      if (whId) {
        body.warehouse_id = Number(whId);
        body.qty_available = qty === "" ? 0 : Number(qty);
        body.qty_warning = qtyWarning === "" ? 10 : Number(qtyWarning);
      }

      await apiFetcher("/api/admin/products", { method: "POST", body: JSON.stringify(body) });
      setDone(true);
      onDone();
      setTimeout(() => setDone(false), 2200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {([
          ["agrochemical", "Kimia (Pupuk/Herbisida)"],
          ["equipment", "Alat Perkebunan"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setCategory(k)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${category === k ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nama Produk *">
            <ProductCombobox
              products={existingProducts}
              value={name}
              onChange={(v) => { setName(v); setPickedExisting(false); }}
              onPick={applyExisting}
            />
            {pickedExisting && (
              <span className="mt-1 block text-[11px] font-medium text-agro">
                ✓ Data produk existing tersalin. Ubah SKU &amp; nama varian untuk stok/harga baru.
              </span>
            )}
            {!pickedExisting && name && existingProducts.some((p) => p.product_name === name) && (
              <span className="mt-1 block text-[11px] text-warning">Produk ini sudah ada — pilih dari dropdown untuk menyalin datanya.</span>
            )}
          </Field>
        </div>
        <Txt label="SKU *" value={sku} onChange={setSku} placeholder="PRD-xxxx (unik)" required />
        <Txt label="Nama Varian *" value={variantName} onChange={setVariantName} placeholder="Roundup 486SL (5 Liter)" required />
        <Num label="Harga (Rp) *" value={price} onChange={setPrice} placeholder="650000" min="0" required />
        {category === "agrochemical" ? (
          <>
            <Txt label="Volume per Unit" value={volPerUnit} onChange={setVolPerUnit} placeholder="5 Liter" />
            <Txt label="Tanggal Kedaluwarsa" value={expiry} onChange={setExpiry} type="date" />
            <Sel label="Tingkat Bahaya" value={hazard} onChange={setHazard} options={[
              { value: "Standard", label: "Standard" },
              { value: "Corrosive", label: "Corrosive" },
              { value: "Toxic", label: "Toxic" },
            ]} />
          </>
        ) : (
          <>
            <Txt label="Merek" value={brand} onChange={setBrand} placeholder="Kubota, Marten…" />
            <Num label="Garansi (bulan)" value={warranty} onChange={setWarranty} min="0" />
          </>
        )}
        <Txt label="Satuan (UOM)" value={uom} onChange={setUom} placeholder="Pcs / Liter / Ton / Unit" />
        <Txt label="Produsen" value={manufacturer} onChange={setManufacturer} placeholder="Syngenta, Bayer…" />
      </div>

      <Toggle checked={requiresDemplot} onChange={setRequiresDemplot} label="Wajib uji sampel (demplot) sebelum pembelian" />

      <div className="rounded-xl border border-slate-100 bg-mist p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Stok Awal di Gudang (opsional)</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Sel label="Gudang" value={whId} onChange={setWhId} options={[
            { value: "", label: "— tanpa stok awal —" },
            ...warehouses.map((w) => ({ value: String(w.id), label: `${w.warehouse_name}${w.region ? ` (${w.region})` : ""}` })),
          ]} />
          <Num label="Qty Tersedia" value={qty} onChange={setQty} placeholder="0" min="0" />
          <Num label="Batas Warning" value={qtyWarning} onChange={setQtyWarning} min="0" />
        </div>
      </div>

      <ErrorBox msg={error} />
      {done && <div className="rounded-xl bg-agro-mist px-4 py-3 text-xs font-semibold text-agro">✓ Produk berhasil ditambahkan.</div>}
      <Button size="lg" className="w-full" onClick={submit} loading={saving}>
        {saving ? undefined : <PlusCircle className="h-4 w-4" />}
        Simpan Produk
      </Button>
    </div>
  );
}

/* ============================== PENGGUNA ============================== */

const ROLE_OPTIONS = [
  { value: "agent", label: "Agent — Sales Lapangan" },
  { value: "manager", label: "Manager — Approver Diskon" },
  { value: "hos", label: "HOS — Approver Diskon Besar" },
  { value: "admin", label: "Admin — Akses Penuh" },
];

export interface UserEditData {
  id: number;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  region: string | null;
  is_active: number;
}

export function UserForm({ initial, onDone, onCancel }: { initial?: UserEditData; onDone: () => void; onCancel?: () => void }) {
  const isEdit = Boolean(initial);
  const [full_name, setFull_name] = React.useState(initial?.full_name ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState(initial?.role ?? "agent");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [region, setRegion] = React.useState(initial?.region ?? "");
  const [active, setActive] = React.useState(isEdit ? initial!.is_active === 1 : true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { full_name, email, role, phone, region, is_active: active };
      if (password) body.password = password;
      await apiFetcher(
        isEdit ? `/api/admin/users/${initial!.id}` : "/api/admin/users",
        { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) }
      );
      setDone(true);
      onDone();
      setTimeout(() => setDone(false), 2200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Txt label="Nama Lengkap *" value={full_name} onChange={setFull_name} placeholder="Mis. Andi Saputra" required />
        <Txt label="Email *" value={email} onChange={setEmail} type="email" placeholder="nama@omnicrm.id" required />
        <Txt
          label={isEdit ? "Password Baru" : "Password *"}
          value={password}
          onChange={setPassword}
          type="password"
          placeholder={isEdit ? "Kosongkan jika tidak diubah" : "min. 6 karakter"}
          required={!isEdit}
        />
        <Sel label="Role *" value={role} onChange={setRole} options={ROLE_OPTIONS} required />
        <Txt label="Telepon" value={phone} onChange={setPhone} placeholder="0812-xxxx-xxxx" />
        <Txt label="Wilayah / Region" value={region} onChange={setRegion} placeholder="Riau, Jabar…" />
      </div>
      <Toggle checked={active} onChange={setActive} label={isEdit ? "Akun aktif" : "Akun aktif sejak dibuat"} />
      <ErrorBox msg={error} />
      {done && <div className="rounded-xl bg-agro-mist px-4 py-3 text-xs font-semibold text-agro">{isEdit ? "✓ Pengguna berhasil diperbarui." : "✓ Pengguna berhasil ditambahkan."}</div>}
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={submit} loading={saving}>
          {saving ? undefined : isEdit ? undefined : <UserRoundPlus className="h-4 w-4" />}
          {isEdit ? "Simpan Perubahan" : "Simpan Pengguna"}
        </Button>
        {isEdit && onCancel && (
          <Button size="lg" variant="ghost" onClick={onCancel}>Batal</Button>
        )}
      </div>
    </div>
  );
}

/* ============================== GUDANG ============================== */

export interface WarehouseEditData {
  id: number;
  warehouse_name: string;
  location_type: string;
  region: string | null;
  is_active: number;
}

const LOCATION_OPTIONS = [
  { value: "mixed", label: "Campur (MIX) — bahan kimia + alat" },
  { value: "hazmat", label: "Khusus Kimia (HZM)" },
  { value: "equipment", label: "Khusus Alat (ALT)" },
];

export function WarehouseForm({ initial, onDone, onCancel }: { initial?: WarehouseEditData; onDone: () => void; onCancel?: () => void }) {
  const isEdit = Boolean(initial);
  const [warehouse_name, setWarehouse_name] = React.useState(initial?.warehouse_name ?? "");
  const [location_type, setLocation_type] = React.useState(initial?.location_type ?? "mixed");
  const [region, setRegion] = React.useState(initial?.region ?? "");
  const [active, setActive] = React.useState(isEdit ? initial!.is_active === 1 : true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const body = { warehouse_name, location_type, region, is_active: active };
      await apiFetcher(
        isEdit ? `/api/admin/warehouses/${initial!.id}` : "/api/admin/warehouses",
        { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) }
      );
      setDone(true);
      onDone();
      setTimeout(() => setDone(false), 2200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Txt label="Nama Gudang *" value={warehouse_name} onChange={setWarehouse_name} placeholder="Gudang Utama - Pekanbaru (PKU)" required />
        <Txt label="Wilayah / Region" value={region} onChange={setRegion} placeholder="Riau, Jabar…" />
        <Sel label="Tipe Gudang *" value={location_type} onChange={setLocation_type} options={LOCATION_OPTIONS} required />
      </div>
      <Toggle checked={active} onChange={setActive} label="Gudang aktif" />
      <ErrorBox msg={error} />
      {done && <div className="rounded-xl bg-agro-mist px-4 py-3 text-xs font-semibold text-agro">{isEdit ? "✓ Gudang berhasil diperbarui." : "✓ Gudang berhasil ditambahkan."}</div>}
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={submit} loading={saving}>
          {saving ? undefined : isEdit ? undefined : <PlusCircle className="h-4 w-4" />}
          {isEdit ? "Simpan Perubahan" : "Simpan Gudang"}
        </Button>
        {isEdit && onCancel && (
          <Button size="lg" variant="ghost" onClick={onCancel}>Batal</Button>
        )}
      </div>
    </div>
  );
}

/* ============================== EDIT KONTAK ============================== */

export interface ContactEditData {
  id: number;
  type: "B2B" | "B2C";
  name: string;
  job_title: string | null;
  whatsapp_number: string | null;
  email: string | null;
  region: string | null;
  company_name?: string | null;
  legal_type?: string | null;
  account_phone?: string | null;
  account_email?: string | null;
  land_size_ha?: string | number | null;
  current_crop?: string | null;
  village?: string | null;
}

export function ContactEditForm({ contact, onDone, onCancel }: { contact: ContactEditData; onDone: () => void; onCancel: () => void }) {
  const isB2B = contact.type === "B2B";
  const [b2b, setB2b] = React.useState({
    company_name: contact.company_name ?? "",
    legal_type: contact.legal_type ?? "",
    region: contact.region ?? "",
    phone: contact.account_phone ?? "",
    email: contact.account_email ?? "",
    first_name: contact.name,
    job_title: contact.job_title ?? "",
    whatsapp_number: contact.whatsapp_number ?? "",
    contact_email: contact.email ?? "",
  });
  const [b2c, setB2c] = React.useState({
    full_name: contact.name,
    whatsapp_number: contact.whatsapp_number ?? "",
    email: contact.email ?? "",
    land_size_ha: String(contact.land_size_ha ?? ""),
    current_crop: contact.current_crop ?? "",
    region: contact.region ?? "",
    village: contact.village ?? "",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const setB2B = (k: keyof typeof b2b) => (v: string) => setB2b((s) => ({ ...s, [k]: v }));
  const setB2C = (k: keyof typeof b2c) => (v: string) => setB2c((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await apiFetcher(`/api/admin/contacts/${contact.id}`, {
        method: "PUT",
        body: JSON.stringify(isB2B ? { type: "B2B", ...b2b } : { type: "B2C", ...b2c }),
      });
      setDone(true);
      onDone();
      setTimeout(() => setDone(false), 2200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {isB2B ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Txt label="Nama Perusahaan *" value={b2b.company_name} onChange={setB2B("company_name")} required />
            <Txt label="Bentuk Usaha" value={b2b.legal_type} onChange={setB2B("legal_type")} placeholder="PT / CV / Koperasi" />
            <Txt label="Wilayah / Region" value={b2b.region} onChange={setB2B("region")} />
            <Txt label="Telepon Perusahaan" value={b2b.phone} onChange={setB2B("phone")} />
            <Txt label="Email Perusahaan" value={b2b.email} onChange={setB2B("email")} type="email" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Kontak Person</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Txt label="Nama Kontak *" value={b2b.first_name} onChange={setB2B("first_name")} required />
            <Txt label="Jabatan" value={b2b.job_title} onChange={setB2B("job_title")} />
            <Txt label="Nomor WhatsApp" value={b2b.whatsapp_number} onChange={setB2B("whatsapp_number")} />
            <Txt label="Email Kontak" value={b2b.contact_email} onChange={setB2B("contact_email")} type="email" />
          </div>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Txt label="Nama Lengkap *" value={b2c.full_name} onChange={setB2C("full_name")} required />
          <Txt label="Nomor WhatsApp" value={b2c.whatsapp_number} onChange={setB2C("whatsapp_number")} />
          <Txt label="Email" value={b2c.email} onChange={setB2C("email")} type="email" />
          <Num label="Luas Lahan (Ha)" value={b2c.land_size_ha} onChange={setB2C("land_size_ha")} min="0" />
          <Txt label="Tanaman Saat Ini" value={b2c.current_crop} onChange={setB2C("current_crop")} />
          <Txt label="Wilayah / Region" value={b2c.region} onChange={setB2C("region")} />
          <Txt label="Desa / Kelurahan" value={b2c.village} onChange={setB2C("village")} />
        </div>
      )}
      <ErrorBox msg={error} />
      {done && <div className="rounded-xl bg-agro-mist px-4 py-3 text-xs font-semibold text-agro">✓ Kontak berhasil diperbarui.</div>}
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={submit} loading={saving}>
          Simpan Perubahan
        </Button>
        <Button size="lg" variant="ghost" onClick={onCancel}>Batal</Button>
      </div>
    </div>
  );
}