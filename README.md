# AMAN CHAT — Premium WhatsApp Business CRM & Automation Suite (v3.0 Pro)

![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![WhatsApp Web](https://img.shields.io/badge/WhatsApp_Web-Integrated-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

**AMAN CHAT** adalah Chrome Extension profesional berbasis **Vue 3 + TypeScript + Vite (Manifest V3)** yang terintegrasi secara seamless langsung di dalam **WhatsApp Web** (`https://web.whatsapp.com`).

Dirancang khusus untuk pemilik bisnis, tim customer service, dan pemasar digital yang membutuhkan sistem **Broadcast Massal Anti-Blokir**, **Auto-Reply Bot Pintar**, **CRM Manajemen Kontak & Follow-up**, **Security Privacy Blur**, serta **Dashboard Laporan & Analitik**.

---

## 🌟 Fitur Utama (Key Features)

### 📢 1. Broadcast Massal Lebih Handal (Robust WhatsApp Broadcast)
- **Eksekusi SPA Native Tanpa Reload**: Berpindah antar ruang chat dalam waktu <500ms tanpa perlu memuat ulang halaman WhatsApp Web.
- **Variasi Pesan Spintax**: Dukungan parser ekspresi kata acak `{Halo|Selamat Pagi|Sapaan} {kak|gan|sis}` untuk variasi pesan otomatis pada tiap penerima.
- **Pengiriman Bertahap (Batching Anti-Blokir)**: Konfigurasi pengiriman bertahap (misal: kirim per 10 pesan, lalu istirahat 2 menit secara otomatis).
- **Simulasi Pengetikan Manusia & Jeda Acak**: Opsi jeda detik acak bawaan dan pengetikan karakter per karakter.
- **Penanganan Error & Retry Otomatis**: Penanganan modal dialog WA Web, deteksi nomor tidak terdaftar, serta retry otomatis 1x jika mengalami timeout.

### 🤖 2. Auto-Reply Bot Pintar (Smart Auto-Reply Engine)
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

## 📄 Lisensi & Hak Cipta

© 2026 **AMAN CHAT** — Part of **[amankerja.com](https://amankerja.com)**. All Rights Reserved.
