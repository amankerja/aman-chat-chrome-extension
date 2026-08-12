# AMAN CHAT — Premium WhatsApp Business CRM & Automation Suite (v3.0 Pro)

![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![WhatsApp Web](https://img.shields.io/badge/WhatsApp_Web-Integrated-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

**AMAN CHAT** adalah Chrome Extension profesional berbasis **Vue 3 + TypeScript + Vite (Manifest V3)** yang terintegrasi secara seamless langsung di dalam **WhatsApp Web** (`https://web.whatsapp.com`).

Dirancang khusus untuk pemilik bisnis, tim customer service, dan pemasar digital yang membutuhkan sistem **Smart Broadcast & Rate Control**, **Auto-Reply Bot Pintar**, **CRM Manajemen Kontak & Follow-up**, **Security Privacy Blur**, serta **Dashboard Laporan & Analitik**.

---

## 🌟 Fitur Utama (Key Features)

### 📢 1. Broadcast Massal Lebih Handal (Robust WhatsApp Broadcast)
- **Eksekusi SPA Native Tanpa Reload**: Berpindah antar ruang chat dalam waktu <500ms tanpa perlu memuat ulang halaman WhatsApp Web.
- **Variasi Pesan Spintax**: Dukungan parser ekspresi kata acak `{Halo|Selamat Pagi|Sapaan} {kak|gan|sis}` untuk variasi pesan otomatis pada tiap penerima.
- **Pengiriman Bertahap (Controlled Messaging Batching)**: Konfigurasi pengiriman bertahap dengan rate control (misal: kirim per 10 pesan, lalu istirahat 2 menit secara otomatis).
- **Simulasi Pengetikan Manusia & Jeda Acak**: Opsi jeda detik acak bawaan dan pengetikan karakter per karakter.
- **Penanganan Error & Retry Otomatis**: Penanganan modal dialog WA Web, deteksi nomor tidak terdaftar, serta retry otomatis 1x jika mengalami timeout.

### 🤖 2. Auto-Reply Bot Pintar & Pemindai Antrean (Smart Auto-Reply Engine)
- **Pemindai Antrean Otomatis (Unread Chat Queue Scanner)**: Merespon pesan masuk secara otomatis bahkan ketika Anda sedang memuat/membuka chat lain. Bot memindai lencana pesan belum dibaca (*unread count badge*) dan membalas seluruh antrean secara bergantian.
- **4 Tipe Pencocokan Kata Kunci**: Supports `contains` (mengandung), `exact` (persis sama), `starts_with` (diawali kata), dan `regex` (pola ekspresi).
- **Jadwal Jam Kerja Bisnis**: Pembatasan jam operasional bisnis (misal `08:00 - 17:00`) & pesan balasan offline otomatis.
- **Cooldown Per Kontak**: Jeda waktu per kontak (misal `5 menit`) untuk mencegah bot membalas berulang kali ke pelanggan yang sama dalam waktu singkat.
- **Fallback Balasan Default**: Balasan otomatis default jika tidak ada kata kunci yang cocok.

### 🎨 3. Senior UI/UX Design (Meta & Apple Style Interface)
- **Right Sidebar 440px**: Tampilan sidebar modern yang menyatu dengan UI resmi WhatsApp Web.
- **Pengaturan Skala Tampilan (UI Zoom Scale)**: Tombol `[ – ] 100% [ + ]` untuk memperbesar atau memperkecil ukuran tampilan sesuai kenyamanan mata pengguna (skala `65% - 140%`).
- **Tab Handle Tombol Melayang (`ac-toggle-btn`)**: Tombol melayang yang dapat meluncur halus menjadi tab handle di tepi kiri sidebar saat panel dibuka.

### 🔒 4. Privasi & Security Blur (Privacy Protection)
- **Blur Otomatis Pesan & Kontak**: Sembunyikan nama kontak, foto profil, preview pesan, dan media gambar/video secara instan saat bekerja di tempat umum.
- **Shortcut Cepat**: Aktifkan atau matikan blur kapan saja via kombinasi keyboard `Alt + P`.

### 👥 5. CRM & Manajemen Tugas Follow-up
- **Pipeline Status Kontak**: Klasifikasikan kontak pelanggan dalam stage `Lead`, `Prospect`, `Customer`, dan `Churned`.
- **Tugas Follow-up Interaktif**: Pencatatan daftar tugas follow-up pelanggan dengan indikator status selesai/pending.

### 📊 6. Dashboard Laporan & Analitik
- **Metrik Kinerja Real-time**: Grafik persentase tingkat keberhasilan (`% Sukses`), total terkirim, berhasil, gagal, dan auto-reply ditrigger.
- **Ekspor Laporan CSV**: Mengunduh seluruh ringkasan statistik aktivitas ke dalam file `.csv`.

### ⌨️ 7. Shortcut Keyboard Super Cepat
- `Alt + A` : Buka / Tutup Sidebar AMAN CHAT
- `Alt + D` : Navigasi ke Tab **Dashboard**
- `Alt + B` : Navigasi ke Tab **Broadcast**
- `Alt + R` : Navigasi ke Tab **Auto Reply**
- `Alt + T` : Navigasi ke Tab **Template**
- `Alt + C` : Navigasi ke Tab **CRM**
- `Alt + P` : Toggle Privacy Blur Instan
- `Alt + [ / =]` : Zoom In (Perbesar Tampilan)
- `Alt + [-]` : Zoom Out (Perkecil Tampilan)
- `Alt + 0` : Reset Skala Tampilan ke 100%

---

## 🛠️ Panduan Instalasi (Installation Guide)

### Prasyarat:
- [Node.js](https://nodejs.org/) (Versi 18 atau lebih baru)
- Google Chrome Browser

### Langkah-langkah:

1. **Clone Repositori**:
   ```bash
   git clone https://github.com/amankerja/aman-chat-chrome-extension.git
   cd aman-chat-chrome-extension
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Build Ekstensi**:
   ```bash
   npm run build
   ```
   *Perintah ini akan menghasilkan folder produksi `dist/` yang siap dimuat ke dalam Chrome.*

4. **Muat Ekstensi di Google Chrome**:
   - Buka Google Chrome dan navigasi ke `chrome://extensions`.
   - Aktifkan **Developer mode** (Mode pengembang) pada sakelar di kanan atas.
   - Klik tombol **Load unpacked** (Muat ekstensi tanpa paket).
   - Pilih folder **`dist`** di dalam repositori project ini.

5. **Buka WhatsApp Web**:
   - Buka **[web.whatsapp.com](https://web.whatsapp.com)**.
   - Panel AMAN CHAT akan otomatis aktif di WhatsApp Web!

---

## 📁 Struktur Project (Project Structure)

```
aman-chat-extension/
├── public/                # Asset ikon & logo ekstensi
├── src/
│   ├── background/        # Manifest V3 Background Service Worker (background.ts)
│   ├── components/        # Komponen Vue 3 UI (Sidebar.vue, Onboarding Tour)
│   │   └── tabs/          # Komponen Tab (Dashboard, Broadcast, AutoReply, CRM, Templates, Settings)
│   ├── content/           # Content Script DOM Injector (content.ts, styles.scss)
│   ├── inject/            # Main-world injection script (WhatsApp Web React Router hooks)
│   ├── types/             # Deklarasi tipe TypeScript (index.ts)
│   └── utils/             # Utility helpers (waAutomation.ts, storage.ts, helpers.ts)
├── manifest.json          # Chrome Extension Manifest V3 configuration
├── vite.config.ts         # Vite build bundler configuration
└── tsconfig.json          # TypeScript configuration
```

---

## 🚀 Panduan Rilis Update Baru via GitHub

Lihat dokumen lengkap [PANDUAN_UPDATE_GITHUB.md](file:///d:/APLIKASI%20FAQIH/WA%20EXTENSION%20100%20RUPIAH/aman-chat-extension/PANDUAN_UPDATE_GITHUB.md) untuk langkah-langkah merilis versi update baru ke customer Anda.

Ringkasan:
1. Ubah versi di `manifest.json` (misal `"3.0.0"` ➔ `"3.0.1"`).
2. Jalankan `npm run build` dan buat file `.zip` dari isi folder `dist/`.
3. Buka GitHub ➔ **Releases** ➔ **Create a new release** (Tag: `v3.0.1`).
4. Upload file `.zip` hasil build dan klik **Publish release**.
5. Customer akan otomatis melihat **Banner Notifikasi Update** di bagian atas sidebar ekstensi mereka!

---

## 💳 Perbandingan Fitur Mendalam: Free Tier vs Lisensi Pro

Berikut adalah rincian perbandingan fitur secara mendalam antara **Free Tier (Versi Gratis / Uji Coba)** dan **Lisensi Pro (Versi Berbayar)** pada AMAN CHAT:

### 📢 1. Fitur Broadcast Massal (Mass Messaging Engine)
* **Free Tier**: 
  - Batas pengiriman maksimal **5 nomor / broadcast**.
  - Pengiriman manual standar tanpa opsi batching (jeda pengiriman statis).
  - Tanpa variasi kata acak (Spintax).
* **Lisensi Pro (Unlimited)**:
  - **Pengiriman Tanpa Batas (Unlimited Broadcast)** ke ribuan kontak.
  - **Variasi Pesan Spintax**: Dukungan format `{Halo|Selamat Pagi|Sapaan} {kak|gan|sis}` untuk variasi kalimat otomatis agar pesan terlihat lebih alami & beraneka ragam.
  - **Smart Batching & Rate Control**: Pengalokasian jeda otomatis per kloter (misal: kirim 10 pesan, istirahat 2 menit) untuk menjaga ritme pengiriman yang terkontrol.
  - **Simulasi Pengetikan Manusia & Jeda Acak**: Opsi detik acak dan simulasi ketikan karakter per karakter.
  - **Auto-Retry & Handling Error**: Penanganan otomatis jika ada modal dialog error atau nomor tak terdaftar.

### 🤖 2. Auto-Reply Bot Pintar (Smart Bot Engine)
* **Free Tier**:
  - Maksimal **2 kata kunci (Keyword Rules)**.
  - Hanya mendukung tipe pencocokan kata dasar (`contains`).
  - Balasan statis 24 jam tanpa opsi jam kerja.
* **Lisensi Pro**:
  - **Rule Auto-Reply Tanpa Batas (Unlimited Rules)**.
  - **4 Tipe Pencocokan Pintar**: `Contains` (mengandung), `Exact` (persis sama), `Starts With` (diawali kata), dan `Regex` (pola ekspresi unik).
  - **Jadwal Jam Kerja Bisnis**: Pengaturan jam operasional (misal: 08:00 - 17:00) & balasan otomatis saat *offline*.
  - **Cooldown Per Kontak**: Mencegah bot menjawab berulang kali ke kontak yang sama dalam rentang waktu singkat.
  - **Fallback Reply Default**: Balasan otomatis jika pesan pelanggan tidak cocok dengan kata kunci apapun.

### 👥 3. CRM & Manajemen Follow-up Pelanggan
* **Free Tier**:
  - Simpan catatan kontak terbatas.
  - Kategori status kontak dasar.
* **Lisensi Pro**:
  - **Pipeline Sales Lengkap**: Pengelompokan stage kontak (`Lead`, `Prospect`, `Customer`, `Churned`).
  - **Tugas Follow-up Interaktif**: Pengingat jadwal follow-up pelanggan dengan penanda status *Pending/Done*.
  - **Catatan Kontak Terintegrasi**: Sinkronisasi riwayat catatan khusus langsung di panel WhatsApp Web.

### 📊 4. Dashboard Analitik Sales-Oriented (Sales CRM Metrics)
* **Free Tier**:
  - Ringkasan statistik sederhana (pesan terkirim hari ini).
* **Lisensi Pro**:
  - **Sales-Oriented Analytics**: Pantau metrik konversi penjualan nyata: **Total Leads**, **New Leads**, **Hot Leads (🔥)**, **Follow-up Due**, **Follow-up Completed**, **Converted Customers (💰)**, **Conversion Rate (%)**, dan **Reply Rate**.
  - **Metrik Kinerja Real-time**: Grafik tingkat keberhasilan (`% Sukses`), total terkirim, berhasil, gagal, dan trigger auto-reply 7/30/90 hari.
  - **Ekspor Laporan CSV**: Unduh rekapitulasi data laporan broadcast, performa sales funnel, dan bot ke file `.csv`.

### 🔒 5. Privasi, Lisensi & Garansi Update
* **Free Tier**:
  - Blur privasi standar.
  - Tanpa *Serial Number* dan tanpa jaminan *priority update*.
* **Lisensi Pro**:
  - **Full Security Blur**: Sembunyikan nama, profil, isi chat, dan media secara instan via `Alt + P`.
  - **Validasi Server & Device Lock**: Keamanan lisensi terikat dengan *Device ID* perangkat Anda.
  - **Garansi Maintenance & Priority Update**: Jaminan pembaruan fitur jika terdapat update algoritma dari WhatsApp Web.
  - **Priority Support**: Bantuan langsung tim teknis jika terjadi masalah integrasi.

### 🚀 6. Fitur Unggulan Pro (Sales Automation & CRM Engine)
* **⭐ Follow-up Automation & Sequencer**:
  - **Otomasi Sequence Multi-Step**: Konfigurasi pengingat follow-up berkala (Follow-up 1 setelah 1 hari, Follow-up 2 setelah 3 hari).
  - **Auto-Stop Sequence**: Penghentian rantai follow-up secara otomatis jika pelanggan sudah membalas pesan.
  - **Eksekusi 1-Klik**: Tombol `[Kirim Follow-up]` langsung dari daftar tugas CRM.
* **📝 Template Pesan dengan Variabel Dinamis Advanced**:
  - Dukungan variabel personalisasi: `{{name}}`, `{{phone}}`, `{{product}}`, `{{price}}`, `{{agent}}`, `{{business_name}}`, `{{date}}`, dan `{{time}}`.
  - Mengubah pesan balasan biasa menjadi pesan bisnis yang terpersonalisasi secara presisi.
* **🏷️ Smart Customer Tagging & Auto-Funnel Rules**:
  - Preset Tag Berwarna: 🔥 `Hot Lead`, 🟡 `Warm Lead`, 🔵 `New Lead`, 💰 `Sudah Membeli`, 🔄 `Follow Up`, ❌ `Tidak Tertarik`, ⭐ `VIP`.
  - **Auto-Tagging Rules**: Deteksi kata kunci otomatis (misal: jika pelanggan bertanya *"harga"*, otomatis diberi tag `🔥 Hot Lead`; jika pelanggan melakukan pembayaran, otomatis dipindahkan ke stage `💰 Customer`).

---

### 📋 Tabel Komparasi Fitur Lengkap

| Fitur | FREE | PRO |
| :--- | :---: | :---: |
| WhatsApp Web Integration | ✅ | ✅ |
| Sidebar CRM | ✅ | ✅ |
| Contact Notes | 20 kontak | Unlimited |
| Contact Tags | 3 tags | Unlimited |
| Pipeline CRM | Basic | Full |
| Lead / Prospect / Customer | ❌ | ✅ |
| Follow-up Task | 5 aktif | Unlimited |
| Reminder Follow-up | ❌ | ✅ |
| Message Templates | 5 | Unlimited |
| Template Variables | Basic | Advanced |
| Broadcast | 5/hari | Paket kuota |
| Batch Sending | ❌ | ✅ |
| Random Delay | ❌ | ✅ |
| Spintax | ❌ | ✅ |
| Campaign Scheduler | ❌ | ✅ |
| Auto Reply | 2 rules | Unlimited |
| Match Type | Contains | 4 mode |
| Business Hours | ❌ | ✅ |
| Offline Reply | ❌ | ✅ |
| Cooldown | ❌ | ✅ |
| Fallback Reply | ❌ | ✅ |
| Dashboard | Basic | Advanced |
| Analytics | Hari ini | 7/30/90 hari |
| CSV Export | ❌ | ✅ |
| Privacy Blur | Basic | Advanced |
| Keyboard Shortcut | Basic | Full |
| License Management | ❌ | ✅ |
| Device Management | ❌ | ✅ |
| Priority Update | ❌ | ✅ |
| Priority Support | ❌ | ✅ |



---

## 📄 Lisensi & Hak Cipta

© 2026 **AMAN CHAT** — Part of **[amankerja.com](https://amankerja.com)**. All Rights Reserved.

