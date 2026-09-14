# Product Requirements Document (PRD)
## OmniCRM - Agro & Equipment Enterprise System (Versi 2)

| Atribut | Detail |
| :--- | :--- |
| **Nama Produk** | OmniCRM - Agro & Equipment Edition |
| **Versi Dokumen** | 2.0 - Revisi Komprehensif (Master Document) |
| **Fase Rilis** | Fase 1 - Hybrid MVP (Web responsif, optimal di browser HP Android) |
| **Model Bisnis** | B2B (Distributor/Kios/Perkebunan) & B2C (Petani/End-user) |
| **Vertikal Industri** | Agrokimia (Pupuk/Herbisida) & Alat Pertanian/Perkebunan |
| **Target Pengguna** | Admin Sistem, Head of Sales (HOS), Sales Manager, Sales Agent |
| **Status / Tanggal** | Terfinalisasi - September 2026 |

---

## 1. Ringkasan Eksekutif & Objektif

### 1.1 Masalah (Problem Statement)
Operasional distribusi komoditas pertanian dan alat perkebunan saat ini melayani dua segmen sekaligus — korporasi/grosir (B2B) dan retail/petani langsung (B2C) — namun pencatatan masih manual dan data terfragmentasi, sehingga berdampak pada:

- **Benturan alokasi stok:** Produk kimia cair (pupuk/herbisida) dan barang keras (alat pertanian) berada di gudang berbeda, rentan *double-selling* karena tidak ada kunci ketersediaan real-time.
- **Kehilangan momentum penjualan:** Tidak ada pelacakan otomatis untuk promosi berbasis musim tanam/panen yang krusial bagi petani.
- **Kebocoran margin:** Pemberian diskon volume grosir oleh agen tidak terkontrol karena tidak ada alur persetujuan berjenjang yang valid dan terlacak di lapangan.
- **Kendala sinyal & perangkat lapangan:** Agen membutuhkan aplikasi web ringan, responsif di browser HP Android, dan hemat kuota saat mengunggah dokumentasi lapangan.

### 1.2 Tujuan Produk (Product Goals)
1. Membangun CRM *omni-channel* berbasis web yang responsif di laptop maupun browser HP, terintegrasi WhatsApp dan email.
2. Mengotomatisasi manajemen inventaris multi-gudang secara real-time untuk mencegah *double-selling*.
3. Menyediakan kontrol finansial melalui *approval workflow* diskon grosir yang berjenjang, cepat, dan terlacak (audit trail).
4. Menyediakan kompresi berkas otomatis di sisi klien untuk efisiensi jaringan seluler area perkebunan.

### 1.3 Ruang Lingkup
| | Keterangan |
| :--- | :--- |
| **Dalam lingkup MVP v1** | Login berbasis peran, dashboard KPI, pipeline kanban, manajemen deal + timeline aktivitas + foto demplot, approval diskon via tautan token, inventori multi-gudang, shared inbox WhatsApp, laporan, konfigurasi CRM (users/produk/gudang), audit log. |
| **Di luar lingkup (Roadmap Fase 2)** | WhatsApp Business API resmi (server-to-server), pelacakan email *Delivered/Opened*, automasi promosi musiman otomatis, integrasi kurir logistik, aplikasi native/PWA ter-install. |

---

## 2. Persona & Matriks Hak Akses

### 2.1 Persona
1. **Sales Agent (Agen Penjualan)** — pekerja lapangan; mengelola deal milik sendiri, dokumentasi demplot, komunikasi pelanggan via WA, diskon maks. 5%.
2. **Sales Manager** — mengawasi pipeline tim, menyetujui diskon 5,1–15%, memantau performa agen.
3. **Head of Sales (HOS)** — menyetujui diskon >15%, memantau target dan kebijakan harga nasional.
4. **System Administrator** — kelola master data (users/produk/warehouse), inspeksi audit log, konfigurasi sistem.

### 2.2 Matriks Hak Akses
| Fitur / Modul | Agent | Manager | HOS | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Dashboard KPI | Data sendiri | Semua tim | Semua | Semua |
| Pipeline Penjualan | Data sendiri | Semua | Semua | Semua |
| Detail Deal & Timeline | Data sendiri | Semua | Semua | Semua |
| Foto/Dok. Demplot (upload) | Ya | Ya | Ya | Ya |
| Inventori (cek & kunci stok) | Ya | Ya | Ya | Ya |
| Pengajuan Diskon >5% | Ya (trigger) | Approve | Approve tier HOS | Approve |
| Shared Inbox WhatsApp | Ya | Ya | Ya | Ya |
| Laporan & Performa | Data sendiri | Semua | Semua | Semua |
| Konfigurasi CRM (users/produk/gudang) | - | - | - | Ya |
| Audit Log | - | - | - | Ya |

> Catatan: Agent selalu dibatasi otomatis ke data miliknya sendiri (force-scope di API), apa pun filter yang dioper.

---

## 3. Alur Kerja Operasional & Manajemen Pipeline

Sistem memakai **satu papan pipeline** yang menampung kanal B2B dan B2C. Di desktop tampil sebagai papan Kanban; di browser HP (lebar < ~768px) otomatis berubah menjadi daftar vertikal / tab status.

### 3.1 Status Pipeline
| Stage | Progress | Makna | Kanal |
| :--- | :---: | :--- | :--- |
| Prospecting | 8% | Leads baru/awal | B2B & B2C |
| Sample Testing | 25% | Uji coba produk (demplot) di lahan klien | B2B |
| Quotation & Negotiation | 50% | Penawaran harga & negosiasi | B2B & B2C |
| PO Verification | 75% | Verifikasi PO & cek stok gudang | B2B |
| Pending Approval | 85% | Diskon > kewenangan agen, menunggu persetujuan | B2B |
| Closed Won | 100% | Transaksi final, stok terpotong, faktur | B2B & B2C |
| Closed Lost | 100% | Transaksi gagal/tidak lanjut | B2B & B2C |

### 3.2 Aturan Bisnis (Business Rules)
- **Alokasi stok:** Saat deal masuk tahap negosiasi akhir/PO Verification atau stok dikunci manual, kuantitas dipindah ke `qty_allocated` (maks. 3x24 jam, lalu kembali otomatis ke `qty_available`).
- **Diskon:** ≤5% otomatis (agen); 5,1–15% ke Sales Manager; >15% ke HOS. Apabila melebihi kewenangan, deal dikunci ke *Pending Approval*.
- **Closed Won saat approval menunggu:** Terkunci — tombol proses/faktur *disabled* hingga status approval `approved`.
- **Pemotongan stok:** Hanya terjadi saat deal masuk *Closed Won* (final), satu kali, transaksional.
- **Lompat tahap:** Agen dapat memindahkan deal beberapa tahap sekaligus (mis. Prospecting → Quotation & Negotiation) dengan satu aksi, kecuali menuju *Pending Approval* dan *Closed Lost* (diakses via alur spesifik) dan *Closed Won* yang wajib lewat konfirmasi (memotong stok) dengan approval disetujui.

---

## 4. Spesifikasi Fitur Utama

### 4.1 Dashboard & KPI
- Ringkasan penjualan: total nilai pipeline terbuka (kecuali Closed Won/Lost), nilai & jumlah Closed Won, jumlah deal aktif, konversi (Closed Won ÷ total deal).
- Prioritas perhatian: deal menunggu approval, deal urgent, task follow-up.
- Upaya pemicu dinamis status berdasarkan peran (agent melihat data sendiri).

### 4.2 Pipeline Kanban (Desktop) / Daftar Vertikal (Mobile)
- Papan per status dengan jumlah deal & nilai tiap kolom.
- Kartu deal menampilkan segmen B2B/B2C, produk, nilai, pemilik, status diskon, urgensi.
- Pindah status via *drag & drop* (desktop) atau tombol/menu aksi (mobile) termasuk **Lompat** multi-tahap.
- Balayan *conversion* (konversi antar-tahap) ditampilkan di laporan, bukan papan.

### 4.3 Manajemen Deal & Timeline Aktivitas
- Detail deal: info pelanggan, line-item produk, diskon, approval, riwayat.
- **Activity timeline:** catatan + **dokumentasi foto demplot** per deal.
- Foto: kompresi **client-side maks. 500KB**, disimpan di Cloudinary (url absolut), tampil inline di timeline.
- Audit perubahan status/pemilik/diskon tercatat otomatis.

### 4.4 Approval Workflow Diskon
| Tier Diskon | Penyetuju | Mekanisme |
| :--- | :--- | :--- |
| ≤ 5% | - (otomatis) | Tanpa approval; `discount_status = auto` |
| 5,1 – 15% | Sales Manager | Generates token; notifikasi WA deep-link berisi tautan approve/resolve |
| > 15% | Head of Sales | Tier HOS; tautan token yang sama diarahkan ke HOS |

- Tautan persetujuan: **single-use token** (halaman publik `/approve/[token]`) yang aman, tidak perlu login; berisi ringkasan transaksi finansial.
- Aksi Approve → deal maju ke *PO Verification*; Reject → kembali ke *Quotation & Negotiation*.
- Status diskon: `none | auto | pending | approved | rejected`.

### 4.5 Manajemen Multi-Gudang (Inventory)
- Master warehouse (nama & tipe lokasi); stok per varian produk (`qty_available`, `qty_allocated`).
- Klasifikasi gudang: Hazmat/Kimia (kedaluwarsa, keamanan tinggi) dan Gudang Alat (garansi).
- Aksi **Kunci Stok** memindahkan kuantitas ke `qty_allocated` dan memangkas `qty_available` pusat secara real-time; kadaluwarsa otomatis 3x24 jam.

### 4.6 Shared Inbox WhatsApp
- Daftar percakapan kontak/pelanggan tersentral.
- Aksi balasan via **deep-link WA** (`wa.me`) ke nomor resmi perusahaan — tanpa login API pihak ketiga di MVP.
- Kanal tambahan: email (roadmap Fase 2).

### 4.7 Laporan Kontrol Manajemen
- **Distribusi pipeline:** bar per stage (termasuk Closed Lost) berdasar jumlah deal.
- **Nilai pipeline:** total hanya stage terbuka (exclude Closed Won/Lost).
- **Konversi penjualan:** Closed Won ÷ total deal.
- **Performa sales:** ranking agen (deal & nilai) + dashboard swap (Admin/Manager).
- Filter periode & **filter per-sales** (dropdown `ownerOptions`); untuk agent, tetap force-scope data sendiri.

### 4.8 Konfigurasi CRM & Keamanan
- Admin: kelola pengguna (4 role, aktivasi), master produk/varians, warehouse.
- **Audit log** (admin-only) mencatat event login, perubahan deal, approval, dan konfigurasi.
- Session JWT HttpOnly + cookie; akses API diverifikasi per-role.

---

## 5. User Stories & Skenario Lapangan (Mobile Browser View)

### Story 1: Pengecekan Stok & Kunci Alokasi di Depan Kios
*Sebagai* Sales Agent di lapangan, *saya ingin* mengecek stok pupuk/herbisida secara real-time dan langsung menguncinya untuk pelanggan, *agar* saya bisa memberi kepastian ketersediaan kepada pemilik kios saat itu juga tanpa risiko diambil agen lain.

**Skenario:**
1. Agen berkunjung ke Kios Tani Makmur; kios ingin memesan 5 ton Pupuk Urea.
2. Agen membuka browser Chrome di HP Android, login, lalu menu **Inventori / Stok**.
3. Cari "Urea", pilih filter **Gudang Terdekat**.
4. Sistem menampilkan status kuota dari gudang terdekat.
5. Agen menekan **[Kunci Stok]**, memasukkan 5 ton, memilih profil kios.
6. Sistem memindahkan 5 ton ke `qty_allocated`; `qty_available` pusat langsung berkurang.

**Kriteria Penerimaan:**
- *Given* halaman detail produk di layar < 768px; *When* agen mengalokasikan jumlah; *Then* penguncian selesai **< 1,5 detik**, `qty_available` berkurang real-time, muncul notifikasi sukses.

### Story 2: Pengajuan & Persetujuan Diskon Grosir via HP
*Sebagai* Sales Agent, *saya ingin* mengajukan harga khusus lewat form transaksi di HP dan memicu persetujuan instan ke Manager, *agar* negosiasi di lapangan tidak tertunda berhari-hari.

**Skenario:**
1. Kios Tani Makmur setuju membeli 10 unit Traktor Tangan dan meminta diskon 10% (limit agen 5%).
2. Agen membuat **Deal Baru** di HP, memasukkan produk traktor, isi diskon `10%`.
3. Saat agen menekan **[Ajukan Transaksi]**, muncul peringatan *"Diskon memerlukan persetujuan Manager. Transaksi dikunci sementara."*
4. Sistem membuat token & mengirim notifikasi WA deep-link ke Sales Manager berisi ringkasan finansial + tautan persetujuan.
5. Manager membuka tautan dari HP dan menekan **[Approve]**.
6. Deal agen otomatis bergerak ke *PO Verification*; status berubah tanpa refresh manual.

**Kriteria Penerimaan:**
- *Given* deal berstatus `Pending Approval`; *When* tombol transaksi ditekan oleh agen; *Then* tombol faktur **disabled** di web agen, dan tautan WA memuat ringkasan transaksi yang jelas secara finansial; token **single-use** (tidak valid setelah dipakai).

### Story 3: Dokumentasi Foto Demplot di Lapangan
*Sebagai* Sales Agent, *saya ingin* mengambil foto kondisi lahan uji coba menggunakan kamera HP dan mengunggahnya ke riwayat deal, *agar* tim teknis di kantor menilai efektivitas produk tanpa kiriman manual via WA pribadi.

**Skenario:**
1. Agen melakukan inspeksi demplot kelapa sawit (disemprot herbisida seminggu lalu).
2. Agen membuka detail deal B2B di browser HP.
3. Menekan **[+ Tambah Catatan Foto]**, mengambil foto gulma yang mengering.
4. Menulis catatan, menekan **[Simpan]**.
5. Sistem mengompres & menyimpan foto (≤500KB), menampilkannya di timeline.
6. Tim kantor melihat foto (url cloud) dari laptop tanpa memperlambat HP agen.

**Kriteria Penerimaan:**
- *Given* input dari kamera resolusi tinggi (5–12MB); *When* agen menyimpan; *Then* client-side compression **maks. 500KB** sebelum dikirim ke server Cloud.

### Story 4: Memindahkan Deal Beberapa Tahap (Lompat)
*Sebagai* Sales Agent, *saya ingin* memindahkan deal yang sudah melalui beberapa tahap sekaligus (mis. dari *Prospecting* langsung ke *Quotation & Negotiation*), *agar* alur deal tidak kaku.

**Kriteria Penerimaan:**
- Klik aksi **Lompat** tidak memicu navigasi kartu lain secara tidak sengaja (event klik ter-isolasi).
- Tidak tersedia menuju *Pending Approval* & *Closed Lost*.
- Menuju *Closed Won* wajib melewati konfirmasi (pemotongan stok) dan syarat approval disetujui.

---

## 6. Persyaratan Non-Fungsional

| Aspek | Spesifikasi |
| :--- | :--- |
| Kinerja | Operasi inventaris/alokasi < 1,5 detik; render halaman < 2 detik (3G/4G) |
| Kompatibilitas | Chrome/WebView Android modern; layout vertikal tanpa scroll horizontal saat < 768px |
| Keamanan | Autentikasi JWT HttpOnly cookie; role check API per-route; token approval single-use; force-scope data per-agent; audit log |
| Infrastruktur | Web: Next.js 16 → Netlify (OpenNext). DB: MySQL cloud (Aiven) via SSL; keepalive scheduled function (15 menit) agar DB tidak tidur |
| Penyimpanan media | Foto demplot di Cloudinary (unsigned preset), fallback filesystem saat dev |
| Skalabilitas | Pooling koneksi DB; arsitektur serverless Netlify |

---

## 7. Mockup Wireframe Teks (UI Layout)

### 7.1 Halaman Utama: Papan Kanban Pipeline (Desktop View)
```text
+-------------------------------------------------------------------------------------------------------+
| OmniCRM | [Q] Cari Produk, Kontak, No PO... | (O) Notifikasi | Profile (M) |
+-------------------------------------------------------------------------------------------------------+
| [=] MENU | DASHBOARD UTAMA - PIPELINE PENJUALAN                      [+ Tambah Deal Baru] |
|          | Tampilan: [ All ] [ B2B Only ] [ B2C Only ]   Filter Gudang: [ Gudang Utama JKT v ] |
| -> Dasbor |                                                                                     |
|    Kontak | +--------------------+ +--------------------+ +---------------------+ +---------------+ |
|    Pipeline| | SAMPLE TESTING    | | QUOT/NEGOTIATION  | | PENDING APPROVAL    | | CLOSED WON    | |
|    Gudang  | | Total: 15 Deal    | | Total: Rp 780 Jt  | | Total: 2 Deal       | | Total: 3.2B   | |
|    Inbox WA| +--------------------+ +--------------------+ +---------------------+ +---------------+ |
|    Setting | | [B2B] PT Perkebunan| | [B2B] Kios Tani Sby | | [B2B] CV Tani Jaya | | [B2B] PT Agro | |
|            | | Produk: Herbisida X| | Produk: Pupuk Urea | | Nilai: Rp 120 Jt    | | Status: Lunas | |
|            | | Status: Uji Lahan  | | Nilai: Rp 450 Jt   | | Req Diskon: 12%     | | Stok: Terpotong| |
|            | | Oleh: Agen Ahmad   | | Pengaju: Agen Susi | | [M] Tombol Approve  | +---------------+ |
|            | +--------------------+ +--------------------+ | [M] Tombol Reject   |                   |
|            | | [B2C] Petani Joko  | |                    | +---------------------+ | [Lompat >]    |
|            | +--------------------+ +--------------------+                       | +---------------+ |
+------------+---------------------------------------------------------------------------------------+
```

### 7.2 Pipeline pada Mobile (< 768px) — Daftar Vertikal + Tab Status
```text
+--------------------------------------+
| ← Pipeline           {S2} {S6} {S5}  |   (Tab: Prosp | Sample | Quote | PO | Appr | Won | Lost)
+--------------------------------------+
| (S5 / Stage saat ini) [Ubah Status v] |
| [B2B] PT Perkebunan                   |
| Herbisida X - Rp 450 Juta             |
| Stage: Sample Testing   Oleh: Ahmad   |
| [ + Catatan ] [ Lompat > ]            |
+--------------------------------------+
```

---

## 8. Skema Database Relasional Ringkas

```text
+--------------------+    +---------------------+    +---------------------+
| users              |    | accounts (B2B)      |    | b2c_profiles        |
+--------------------+    +---------------------+    +---------------------+
| PK id              |    | PK id               |    | PK id               |
|    full_name, email |    |    company_name     |    |    full_name        |
|    phone, role      |    |    legal_type       |    |    whatsapp_number  |
|    region, is_active|    |    land_size_ha     |    |    email            |
|    password_hash    |    |    credit_limit     |    |    land_size_ha     |
+--------------------+    +----------+----------+    +----------+----------+
                                    |                           |
                                    +------------+--------------+
                                                 v
+--------------------+    +---------------------+    (contact)  +--------------------+
| contacts           |    | deals               |               | inbox_messages     |
+--------------------+    +---------------------+              +--------------------+
| PK id              |    | PK id               |              | PK id              |
| FK account_id      |    | FK owner_id(users)  |              | FK contact_id      |
|    first/last_name |    |    customer_type    |              |    direction       |
|    whatsapp_number |    |    customer_id      |              |    channel          |
|    email           |    |    pipeline_stage   |              |    body, sent_at   |
+----------------+---+    |    total_value      |              +--------------------+
                 |        |    discount_percent |    +--------------------+
                 v        |    discount_status  |    | approval_requests  |
+--------------------+    |    urgency          |    +--------------------+
| stock_allocations  |    |    pending_approval |<---+ PK id             |
+--------------------+    +----------+----------+    | FK deal_id        |
| PK id              |               |               | FK requested_by   |
| FK deal_id         |               |               | FK approved_by    |
| FK variant_id      |               |               |    tier,status    |
|    qty              |               v               |    token_hash     |
|    expires_at      |    +---------------------+    +--------------------+
+--------------------+    | deal_line_items      |
                          +---------------------+
+--------------------+    | PK id               |    +--------------------+
| products           |    | FK deal_id          +--->| activity_records   |
+--------------------+    | FK variant_id       |    | PK id              |
| PK id              |    |    discount_given   |    | FK deal_id         |
|    product_name    |    |    quantity         |    |    type, note      |
|    category        |    |    subtotal         |    |    media_url       |
+----------+---------+    +----------+----------+    |    created_by      |
           v                       v                 +--------------------+
+--------------------+    +--------------------+
| product_variants   |    | inventory_stocks   |    +--------------------+
+--------------------+    +--------------------+    | audit_logs         |
| PK id              |    | PK id              |    +--------------------+
| FK product_id      |    | FK warehouse_id    |    | PK id              |
|    sku, price      |    | FK variant_id      |    |    actor, action   |
+--------------------+    |    qty_available   |    |    target, detail  |
                          |    qty_allocated   |    |    created_at       |
+--------------------+    +----------+---------+    +--------------------+
| warehouses         |               |
+--------------------+               v
| PK id              |    +--------------------+
|    warehouse_name  |    | email_events       |   +--------------------+
|    location_type   |    +--------------------+   | seasonal_promos    |
+--------------------+    | PK id              |   +--------------------+
                          |    FK email...     |   | PK id              |
                          |    status          |   |    crop, region    |
                          +--------------------+   |    promo_text      |
                                                    +--------------------+
```

#### Catatan Struktur Data
- `deals.customer_type` = `B2B | B2C`; `customer_id` = polymorphic ke `accounts` atau `b2c_profiles`.
- `approval_requests.token_hash` menyimpan hash token single-use; status `pending | approved | rejected`.
- `activity_records.media_url` menyimpan path absolut/URL foto demplot (Cloudinary).
- `inventory_stocks.qty_available - qty_allocated = stok bebas` untuk penjualan.
- `system_settings` menyimpan konfigurasi global; `audit_logs` mencatat semua event penting.

---

## 9. Dokumen User Acceptance Testing (UAT)

*Perangkat uji: Smartphone Android (layar min. 6 inci, Chrome terbaru), koneksi seluler 3G/4G, serta laptop desktop.*

### 9.1 Modul Autentikasi & Sesi
| Kode | Langkah | Kriteria Lulus |
| :--- | :--- | :--- |
| UAT-AUTH-01 | Login `admin@omnicrm.id` di browser HP | Sukses masuk ke dashboard; sesi bertahan 12 jam. |
| UAT-AUTH-02 | Login akun agent | Hanya data milik agen yang tampil di semua modul. |
| UAT-AUTH-03 | Logout & akses halaman terproteksi | Redirect ke halaman login; tidak ada data bocor. |

### 9.2 Modul Pipeline & Responsivitas
| Kode | Langkah | Kriteria Lulus |
| :--- | :--- | :--- |
| UAT-PIP-01 | Buka pipeline di HP | Kanban berubah jadi tab status/daftar vertikal; tanpa scroll horizontal. |
| UAT-PIP-02 | Pindahkan deal satu tahap (HP) | Status berubah; kartu pindah kolom setelah refresh. |
| UAT-PIP-03 | Aksi **Lompat** beberapa tahap | Klik tidak memicu navigasi kartu lain; tujuan terlarang tidak tersedia. |

### 9.3 Modul Deal & Approval
| Kode | Langkah | Kriteria Lulus |
| :--- | :--- | :--- |
| UAT-APP-01 | Input diskon 12% sebagai agent | Deal mengunci ke `Pending Approval`; tombol faktur *disabled*. |
| UAT-APP-02 | Buka tautan token dari HP Manager | Halaman approval publik menampilkan ringkasan finansial. |
| UAT-APP-03 | Tekan **[Approve]** | Deal maju ke *PO Verification*; token tak dapat dipakai ulang (single-use). |
| UAT-APP-04 | Closed Won saat approval pending | Konfirmasi muncul; stok tidak terpotong sebelum disetujui. |

### 9.4 Modul Inventori & Alokasi
| Kode | Langkah | Kriteria Lulus |
| :--- | :--- | :--- |
| UAT-INV-01 | Buka halaman stok di HP | Tampilan vertikal rapi; pencarian < 1,5 detik. |
| UAT-INV-02 | **[Kunci Stok]** 5 ton untuk kios | `qty_available` berkurang real-time; notifikasi sukses. |
| UAT-INV-03 | Biarkan alokasi lewat 3x24 jam | Kuantitas kembali otomatis ke `qty_available`. |

### 9.5 Modul Dokumentasi Demplot
| Kode | Langkah | Kriteria Lulus |
| :--- | :--- | :--- |
| UAT-CAM-01 | Buka **[+ Tambah Catatan Foto]** di HP | Kamera terbuka (izin browser) atau pemilih file tampil. |
| UAT-CAM-02 | Ambil foto >5MB, catat, **[Simpan]** | Progress bar upload; selesai pada koneksi 3G. |
| UAT-CAM-03 | Cek berkas di timeline (laptop) | Ukuran tersimpan ≤ 500KB; foto tampil inline via URL cloud. |

### 9.6 Modul Inbox & Laporan
| Kode | Langkah | Kriteria Lulus |
| :--- | :--- | :--- |
| UAT-INB-01 | Buka Inbox WA, pilih kontak | Terarah ke deep-link `wa.me` nomor resmi. |
| UAT-RPT-01 | Filter laporan per-sales (Admin) | Distribusi, nilai pipeline, konversi, dan ranking ikut berubah sesuai sales terpilih. |
| UAT-RPT-02 | Login agent & akses laporan | Ranking hanya data miliknya (force-scope). |

### 9.7 Modul Konfigurasi & Audit
| Kode | Langkah | Kriteria Lulus |
| :--- | :--- | :--- |
| UAT-CFG-01 | Non-admin coba akses Konfigurasi | Ditolak (403) / di-redirect. |
| UAT-CFG-02 | Admin ubah user/produk/gudang | Perubahan tersimpan; tercatat di audit log. |

---

*— End of Document —*