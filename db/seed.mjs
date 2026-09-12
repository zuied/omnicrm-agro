import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function env(key, dflt) {
  const f = path.join(root, ".env.local");
  if (existsSync(f)) {
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      if (line.startsWith(key + "=")) return line.slice(key.length + 1).trim();
    }
  }
  return process.env[key] ?? dflt;
}

const HOST = env("DB_HOST", "127.0.0.1");
const PORT = Number(env("DB_PORT", "3306"));
const USER = env("DB_USER", "root");
const PASSWORD = env("DB_PASSWORD", "");
const DB = env("DB_NAME", "omnicrm_agro");

const conn = await mysql.createConnection({ host: HOST, port: PORT, user: USER, password: PASSWORD, multipleStatements: true });
await conn.query(`DROP DATABASE IF EXISTS \`${DB}\``);
await conn.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.query(`USE \`${DB}\``);

const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
await conn.query(schema);

const hash = (p) => bcrypt.hashSync(p, 10);

// ---------------- USERS ----------------
const users = {};
const ins = async (table, obj) => {
  const keys = Object.keys(obj);
  const [res] = await conn.query(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`, keys.map((k) => obj[k]));
  return res.insertId;
};

users.admin    = await ins("users", { full_name: "Administrator Sistem", role: "admin", email: "admin@omnicrm.id", phone: "0812-0000-0001", password_hash: hash("admin123"), region: "Pusat" });
users.hos      = await ins("users", { full_name: "Dirut Operations", role: "hos", email: "hos@omnicrm.id", phone: "0812-0000-0002", password_hash: hash("hos123"), region: "Pusat" });
users.manager  = await ins("users", { full_name: "Budi Santoso", role: "manager", email: "manager@omnicrm.id", phone: "0812-3456-7890", password_hash: hash("manager123"), region: "Riau" });
users.agent    = await ins("users", { full_name: "Ahmad Suhendra", role: "agent", email: "agent@omnicrm.id", phone: "0813-1111-2222", password_hash: hash("agent123"), region: "Riau" });
users.agent2   = await ins("users", { full_name: "Susi Lestari", role: "agent", email: "susi@omnicrm.id", phone: "0813-3333-4444", password_hash: hash("susi123"), region: "Jawa Timur" });

// ---------------- AKUN B2B ----------------
const acc = {
  sawit:   await ins("accounts", { company_name: "PT Sawit Subur Abadi", legal_type: "PT", land_size_ha: 8500, credit_limit: 500000000, region: "Riau", phone: "0761-222333", email: "operasional@sawitsubur.co.id", priority: "vip" }),
  tani:    await ins("accounts", { company_name: "CV Tani Makmur Riau", legal_type: "CV", land_size_ha: 320, credit_limit: 120000000, region: "Riau", priority: "normal" }),
  kud:     await ins("accounts", { company_name: "Koperasi Unit Desa Mandiri", legal_type: "Koperasi", land_size_ha: 0, credit_limit: 450000000, region: "Riau", priority: "strategis" }),
  riau:    await ins("accounts", { company_name: "PT Riau Indo Pulp", legal_type: "PT", land_size_ha: 25000, credit_limit: 900000000, region: "Riau", priority: "strategis" }),
  agro:    await ins("accounts", { company_name: "PT Agro Sejahtera Riau", legal_type: "PT", land_size_ha: 1200, credit_limit: 300000000, region: "Riau", priority: "normal" }),
  sawu:    await ins("accounts", { company_name: "CV Sawit Maju Bersama", legal_type: "CV", land_size_ha: 410, credit_limit: 80000000, region: "Riau", priority: "normal" }),
};
await ins("contacts", { account_id: acc.sawit, first_name: "Hendra Wijaya", job_title: "Head of Procurement", whatsapp_number: "0812-8000-1001", email: "hendra@sawitsubur.co.id" });
await ins("contacts", { account_id: acc.tani, first_name: "Pak Usman", job_title: "Pemilik Kios", whatsapp_number: "0812-8000-1002" });
await ins("contacts", { account_id: acc.kud, first_name: "Bapak Martono", job_title: "Ketua KUD", whatsapp_number: "0812-8000-1003" });
await ins("contacts", { account_id: acc.agro, first_name: "Ibu Ratna", job_title: "Manager Lahan", whatsapp_number: "0812-8000-1004" });

// ---------------- B2C ----------------
const b2cJoko = await ins("b2c_profiles", { full_name: "Petani Joko", whatsapp_number: "0812-7777-0001", land_size_ha: 2.5, current_crop: "Padi", region: "Riau", village: "Desa Sawit" });
const b2cSutris = await ins("b2c_profiles", { full_name: "Pak Sutris", whatsapp_number: "0812-7777-0002", land_size_ha: 6.0, current_crop: "Kelapa Sawit", region: "Riau" });

// ---------------- PRODUK & VARIANT ----------------
const P = {
  gramoxone:  await ins("products", { product_name: "Gramoxone 276SL Herbisida", category: "agrochemical", uom: "Jeriken", manufacturer: "Syngenta" }),
  npk:        await ins("products", { product_name: "Pupuk NPK Mutiara 15-15-15", category: "agrochemical", uom: "Ton", manufacturer: "PT Pupuk Indonesia" }),
  urea:       await ins("products", { product_name: "Pupuk Urea Kaltim Super", category: "agrochemical", uom: "Ton", manufacturer: "PT Pupuk Kaltim" }),
  prevathon:  await ins("products", { product_name: "Insektisida DuPont Prevathon", category: "agrochemical", uom: "Liter", manufacturer: "Corteva" }),
  traktor:    await ins("products", { product_name: "Traktor Tangan Kubota L2120", category: "equipment", uom: "Unit", manufacturer: "Kubota" }),
  egrek:      await ins("products", { product_name: "Alat Egrek Sawit Marten", category: "equipment", uom: "Pcs", manufacturer: "Marten UK" }),
  sprayer:    await ins("products", { product_name: "Sprayer Tipe Tangan 16L", category: "equipment", uom: "Pcs", manufacturer: "Solo" }),
};

const V = {};
V.gramoxone = await ins("product_variants", {
  product_id: P.gramoxone, sku: "PRD-9833", variant_name: "Gramoxone 276SL Herbisida (20 Liter)",
  price: 190000, agro_chemical_attrs: JSON.stringify({ volume_per_unit: "20 Liter", expiry_date: "2026-12-24", hazard: "Toxic" }),
});
V.npk = await ins("product_variants", {
  product_id: P.npk, sku: "PRD-1100", variant_name: "Pupuk NPK Mutiara 15-15-15 (per Ton)",
  price: 15000000, agro_chemical_attrs: JSON.stringify({ volume_per_unit: "1 Ton", expiry_date: "2027-06-30", hazard: "Corrosive" }),
});
V.urea = await ins("product_variants", {
  product_id: P.urea, sku: "PRD-1101", variant_name: "Pupuk Urea Kaltim Super (per Ton)",
  price: 9000000, agro_chemical_attrs: JSON.stringify({ volume_per_unit: "1 Ton", expiry_date: "2027-08-15", hazard: "Standard" }),
});
V.prevathon = await ins("product_variants", {
  product_id: P.prevathon, sku: "PRD-2200", variant_name: "Insektisida DuPont Prevathon (per Liter)",
  price: 187000, agro_chemical_attrs: JSON.stringify({ volume_per_unit: "1 Liter", expiry_date: "2026-11-05", hazard: "Toxic" }),
});
V.traktor = await ins("product_variants", {
  product_id: P.traktor, sku: "PRD-1024", variant_name: "Traktor Tangan Kubota L2120",
  price: 210000000, equipment_attrs: JSON.stringify({ brand: "Kubota", warranty_months: 24 }),
});
V.egrek = await ins("product_variants", {
  product_id: P.egrek, sku: "PRD-1025", variant_name: "Alat Egrek Sawit Marten",
  price: 1000000, equipment_attrs: JSON.stringify({ brand: "Marten UK", warranty_months: 24 }),
});
V.sprayer = await ins("product_variants", {
  product_id: P.sprayer, sku: "PRD-1026", variant_name: "Sprayer Tipe Tangan 16L",
  price: 350000, equipment_attrs: JSON.stringify({ brand: "Solo", warranty_months: 12 }),
});

// ---------------- GUDANG ----------------
const WH = {
  pku:  await ins("warehouses", { warehouse_name: "Gudang Utama - Pekanbaru (PKU)", location_type: "mixed", region: "Riau" }),
  jkt:  await ins("warehouses", { warehouse_name: "Gudang Utama Jakarta (JKT)", location_type: "mixed", region: "Jabodetabek" }),
  mdn:  await ins("warehouses", { warehouse_name: "Gudang Medan (MDN)", location_type: "mixed", region: "Sumatera Utara" }),
};

// stok: sesuaikan UI figma (Gramoxone 1250/450, Egrek 85/120 di PKU)
const stock = async (whId, variantId, avail, alloc) => {
  const id = await ins("inventory_stocks", { warehouse_id: whId, variant_id: variantId, qty_available: avail, qty_allocated: alloc });
  return id;
};
const S = {};
S.pkuGramoxone = await stock(WH.pku, V.gramoxone, 1250, 450);
S.pkuNpk       = await stock(WH.pku, V.npk, 260, 12);
S.pkuUrea      = await stock(WH.pku, V.urea, 900, 5);
S.pkuPrevathon = await stock(WH.pku, V.prevathon, 5400, 350);
S.pkuTraktor   = await stock(WH.pku, V.traktor, 8, 3);
S.pkuEgrek     = await stock(WH.pku, V.egrek, 85, 120);
S.pkuSprayer   = await stock(WH.pku, V.sprayer, 240, 30);
await stock(WH.jkt, V.urea, 1500, 0);
await stock(WH.jkt, V.gramoxone, 800, 120);
await stock(WH.jkt, V.traktor, 12, 0);
await stock(WH.mdn, V.npk, 410, 0);
await stock(WH.mdn, V.egrek, 200, 0);

// ---------------- DEALS ----------------
const mkDeal = async (o) => {
  const id = await ins("deals", o);
  return id;
};
const mkItem = async (dealId, variantId, qty, unitPrice) => {
  const subtotal = Math.round(qty * unitPrice);
  await ins("deal_line_items", { deal_id: dealId, variant_id: variantId, quantity: qty, unit_price: unitPrice, subtotal });
};

// 1. PT Sawit Subur Abadi — Negosiasi, urgent (mockup)
let d = await mkDeal({
  ref_no: "CRM-0001", customer_type: "B2B", account_id: acc.sawit, pipeline_stage: "Quotation & Negotiation",
  total_value: 180000000, discount_percent: 0, discount_status: "none", owner_id: users.agent,
  urgency: "urgent", closing_date: "2026-10-15",
  notes: "Klien meminta kepastian stok sebelum tanda tangan kontrak kuartalan.",
});
await mkItem(d, V.npk, 12, 15000000);

// 2. CV Tani Makmur Riau — Negosiasi
d = await mkDeal({
  ref_no: "CRM-0002", customer_type: "B2B", account_id: acc.tani, pipeline_stage: "Quotation & Negotiation",
  total_value: 65450000, discount_percent: 3, discount_status: "auto", owner_id: users.agent,
  urgency: "normal", closing_date: "2026-10-16",
});
await mkItem(d, V.prevathon, 350, 187000);

// 3. Koperasi Unit Desa Mandiri — PENDING APPROVAL 12% (mockup approval case)
d = await mkDeal({
  ref_no: "CRM-0003", customer_type: "B2B", account_id: acc.kud, pipeline_stage: "Pending Approval",
  total_value: 420000000, discount_percent: 12, discount_status: "pending", owner_id: users.agent,
  urgency: "normal", closing_date: "2026-10-18",
  notes: "KUD menyetujui pembelian 2 unit traktor; meminta diskon volume 12% karena pembelian tunai.",
});
await mkItem(d, V.traktor, 2, 210000000);
const tokenKUD = crypto.randomBytes(32).toString("hex");
await ins("approval_requests", {
  deal_id: d, requested_by: users.agent, discount_percent: 12,
  value_before: 420000000, value_after: 369600000, status: "pending", tier: "manager",
  token: tokenKUD, wa_email_sent: 1,
});

// 4. PT Riau Indo Pulp — PENDING APPROVAL
d = await mkDeal({
  ref_no: "CRM-0004", customer_type: "B2B", account_id: acc.riau, pipeline_stage: "Pending Approval",
  total_value: 95000000, discount_percent: 8, discount_status: "pending", owner_id: users.agent2,
  urgency: "normal", closing_date: "2026-10-25",
});
await mkItem(d, V.gramoxone, 500, 190000);
const tokenRIAU = crypto.randomBytes(32).toString("hex");
await ins("approval_requests", {
  deal_id: d, requested_by: users.agent2, discount_percent: 8,
  value_before: 95000000, value_after: 87400000, status: "pending", tier: "manager",
  token: tokenRIAU, wa_email_sent: 1,
});

// 5. PT Agro Sejahtera Riau — Testing (Sample Testing)
d = await mkDeal({
  ref_no: "CRM-0005", customer_type: "B2B", account_id: acc.agro, pipeline_stage: "Sample Testing",
  total_value: 45000000, discount_percent: 0, discount_status: "none", owner_id: users.agent,
  urgency: "normal", closing_date: "2026-10-20",
});
await mkItem(d, V.urea, 5, 9000000);

// 6. CV Sawit Maju Bersama — Testing
d = await mkDeal({
  ref_no: "CRM-0006", customer_type: "B2B", account_id: acc.sawu, pipeline_stage: "Sample Testing",
  total_value: 15000000, discount_percent: 0, discount_status: "none", owner_id: users.agent,
  urgency: "normal", closing_date: "2026-10-22",
});
await mkItem(d, V.egrek, 15, 1000000);

// 7. B2C Petani Joko — Closed Won (instan)
d = await mkDeal({
  ref_no: "CRM-0007", customer_type: "B2C", b2c_profile_id: b2cJoko, pipeline_stage: "Closed Won",
  total_value: 3500000, discount_percent: 0, discount_status: "none", owner_id: users.agent,
  urgency: "normal", closing_date: "2026-09-10",
  notes: "Pembayaran tunai di kios.",
});
await mkItem(d, V.sprayer, 10, 350000);

// 8. B2B PT Agro Sejahtera Riau — Closed Won (pipeline grossir)
d = await mkDeal({
  ref_no: "CRM-0008", customer_type: "B2B", account_id: acc.agro, pipeline_stage: "Closed Won",
  total_value: 98000000, discount_percent: 2, discount_status: "auto", owner_id: users.agent,
  urgency: "normal", closing_date: "2026-09-05",
  notes: "Faktur diterbitkan. Stok dipotong.",
});
await mkItem(d, V.npk, 6, 15000000);
await mkItem(d, V.urea, 1, 9000000);

// 9. B2C Pak Sutris — Konsultasi lahan sawit
d = await mkDeal({
  ref_no: "CRM-0009", customer_type: "B2C", b2c_profile_id: b2cSutris, pipeline_stage: "Quotation & Negotiation",
  total_value: 5700000, discount_percent: 0, discount_status: "none", owner_id: users.agent,
  urgency: "normal", closing_date: "2026-10-30",
  notes: "Konsultasi penyakit ganoderma; menunggu rekomendasi tim teknis.",
});

// ---------------- Reservasi stok aktif (sku yang tampil di mockup) ----------------
const now = new Date();
const expSeeded = new Date(now.getTime() + 72 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
// deal 1 (sawit) sudah terkunci 12 ton di PKU
await ins("stock_allocations", { inventory_id: S.pkuNpk, deal_id: 1, qty: 12, allocated_by: users.agent, expires_at: expSeeded, status: "active" });
// deal 4 (riau pulp) terkunci 500 liter gramoxone
await ins("stock_allocations", { inventory_id: S.pkuGramoxone, deal_id: 4, qty: 450, allocated_by: users.agent2, expires_at: expSeeded, status: "active" });
// deal 3 (kud) terkunci 3 unit traktor (2 + 1 buffer)
await ins("stock_allocations", { inventory_id: S.pkuTraktor, deal_id: 3, qty: 3, allocated_by: users.agent, expires_at: expSeeded, status: "active" });
await ins("stock_allocations", { inventory_id: S.pkuEgrek, deal_id: 6, qty: 60, allocated_by: users.agent, expires_at: expSeeded, status: "active" });
await ins("stock_allocations", { inventory_id: S.pkuEgrek, deal_id: 6, qty: 60, allocated_by: users.agent, expires_at: expSeeded, status: "active" });

// ---------------- AKTIVITAS (demplot) ----------------
await ins("activity_records", { deal_id: 5, agent_id: users.agent, kind: "photo", title: "Demplot Urea - Plot A1", description: "Daun sawit mulai menghijau setelah 1 minggu aplikasi.", media_url: null, media_size_kb: 0 });
await ins("activity_records", { deal_id: 5, agent_id: users.agent, kind: "note", title: "Catatan Lapangan", description: "pH tanah 5.8; rekomendasi dosis 350kg/ha." });
await ins("activity_records", { deal_id: 4, agent_id: users.agent2, kind: "photo", title: "Gulma Setelah Herbisida", description: "Gulma mulai mengering di blok B3." });

// ---------------- SHARED INBOX ----------------
const msg1 = await ins("inbox_messages", { direction: "inbound", channel: "whatsapp", counterpart: "Hendra Wijaya (PT Sawit Subur)", counterpart_phone: "0812-8000-1001", deal_id: 1, body: "Pagi pak, untuk kontrak kuartalan kami butuh kepastian stok NPK sebelum Rabu. Bisa tolong lanjutkan ke manajer Anda?", status: "read" });
await ins("email_events", { message_id: msg1, event: "delivered" });
await ins("email_events", { message_id: msg1, event: "opened" });
await ins("inbox_messages", { direction: "inbound", channel: "whatsapp", counterpart: "Pak Sutris", counterpart_phone: "0812-7777-0002", deal_id: 9, body: "Daun sawit saya mulai kuning dan ada bercak. Apakah boleh kirim foto ke sini?", status: "delivered" });
await ins("inbox_messages", { direction: "outbound", channel: "email", counterpart: "Ibu Ratna (PT Agro Sejahtera)", counterpart_email: "ratna@agrosejahtera.co.id", deal_id: 5, subject: "Penawaran Harga Pupuk Urea Kaltim Super", body: "Terlampir quotation PDF. Mohon ditinjau sebelum Jumat.", status: "opened" });

// ---------------- PROMOSI MUSIMAN ----------------
await ins("seasonal_promos", {
  title: "Pupuk Musim Tanam Sawit - Riau", target_crop: "Kelapa Sawit", target_region: "Riau",
  channel: "whatsapp", trigger_days_before: 30, status: "active", created_by: users.manager,
  message_template: "Halo {{nama}}, memasuki musim tanam, kami ingatkan stok pupuk NPK untuk lahan sawit Anda tersedia. Hubungi agen terdekat untuk penawaran khusus.",
});
await ins("seasonal_promos", {
  title: "Herbisida Jelang Panen - Sumatera", target_crop: "Padi", target_region: "Sumatera",
  channel: "email", trigger_days_before: 21, status: "active", created_by: users.manager,
  message_template: "Yth. {{nama}}, persiapkan lahan jelang panen dengan herbisida selektif. Pelajari petunjuk pemakaian aman di lampiran.",
});

// ---------------- SETTINGS (3rd-party stub) ----------------
await ins("system_settings", { skey: "whatsapp_config", svalue: JSON.stringify({ business_phone_id: "", api_token: "", webhook_secret: "", wa_number: "6281200000001", mode: "stub" }) });
await ins("system_settings", { skey: "smtp_config", svalue: JSON.stringify({ host: "", port: 587, username: "", password: "", from_email: "no-reply@omnicrm.id", mode: "stub" }) });
await ins("system_settings", { skey: "portal", svalue: JSON.stringify({ approval_wa_banner: 1 }) });

// ---------------- AUDIT ----------------
await ins("audit_logs", { user_id: users.agent, action: "DEAL_CREATE", entity_type: "deal", entity_id: "CRM-0001", detail: JSON.stringify({ stage: "Quotation & Negotiation" }) });
await ins("audit_logs", { user_id: users.agent, action: "STOCK_LOCK", entity_type: "deal", entity_id: "CRM-0001", detail: JSON.stringify({ qty: 12, warehouse: "PKU", expires: "72h" }) });
await ins("audit_logs", { user_id: users.agent, action: "APPROVAL_SUBMIT", entity_type: "deal", entity_id: "CRM-0003", detail: JSON.stringify({ discount: 12, tier: "manager" }) });

console.log("SEED OK - database", DB, "di", HOST + ":" + PORT);
console.log("Akun demo:");
console.log("  admin    -> admin@omnicrm.id / admin123");
console.log("  manager  -> manager@omnicrm.id / manager123");
console.log("  agent    -> agent@omnicrm.id / agent123");
console.log("  agent2   -> susi@omnicrm.id / susi123");
console.log("  hos      -> hos@omnicrm.id / hos123");
await conn.end();