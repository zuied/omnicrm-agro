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

export function ProductForm({ warehouses, onDone }: { warehouses: Warehouse[]; onDone: () => void }) {
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
        <Txt label="Nama Produk *" value={name} onChange={setName} placeholder="Mis. Herbisida Roundup 486SL" required />
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