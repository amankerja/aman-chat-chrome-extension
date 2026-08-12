# 🚀 PANDUAN RILIS UPDATE BARU EKSTENSI VIA GITHUB RELEASES

Dokumen ini berisi panduan langkah demi langkah bagi pengembang/pemilik aplikasi untuk merilis versi pembaruan (*update*) baru dari ekstensi **AMAN CHAT** ke seluruh pengguna/customer secara otomatis.

---

## 🛠️ Langkah-Langkah Merilis Update Baru:

### 1. Ubah Versi di `manifest.json`
Buka file `manifest.json` di root project, lalu naikkan nomor versinya:
```json
{
  "manifest_version": 3,
  "name": "AMAN CHAT",
  "version": "3.0.1"
}
```
*(Contoh: dari `"3.0.0"` menjadi `"3.0.1"`)*.

---

### 2. Build & Pack File Zip Produksi
Buka Terminal / Command Prompt di folder project, lalu jalankan perintah:
```bash
npm run build
```
Setelah build selesai (folder `dist` terupdate), kompres/zip seluruh isi folder **`dist/`** menjadi file ZIP baru, misalnya **`aman-chat-v3.0.1.zip`**.

---

### 3. Buat Release Baru di GitHub
1. Buka Repository GitHub project Anda (misal: `https://github.com/USERNAME/REPOSITORY`).
2. Klik menu **Releases** di bagian kanan ➡️ Klik **Draft a new release**.
3. Pada bagian **Choose a tag**, ketikkan nama tag baru, contoh: **`v3.0.1`** (wajib diawali huruf `v`).
4. Beri Judul Release, contoh: `AMAN CHAT v3.0.1 Pro Update`.
5. Tuliskan deskripsi singkat mengenai perubahan/fitur baru.
6. Unggah file ZIP hasil build Anda (`aman-chat-v3.0.1.zip`) pada kotak upload asset.
7. Klik **Publish release**.

---

### 🎉 Hasil Akhir:
Dalam hitungan menit, seluruh ekstensi **AMAN CHAT** yang terpasang di browser customer Anda akan mendeteksi rilis `v3.0.1` via GitHub Releases API dan menampilkan **Banner Notifikasi Update Otomatis** di bagian atas sidebar:

> 🚀 **Versi Baru v3.0.1 Tersedia!** `[📥 Unduh Update]`  
> *Terdapat perbaikan & tampilan baru.*

Customer cukup mengklik tombol **`📥 Unduh Update`** untuk langsung mengunduh file rilis terbaru Anda!
