# Livin' Smart Assist (Progressive Web App)

Aplikasi web prototipe interaktif **Livin' Smart Assist**, pengembangan fitur usulan pada aplikasi Livin' by Mandiri berdasarkan Laporan Tugas Besar TPKI (BAB III, BAB IV, dan BAB V).

Aplikasi ini kini dikemas sebagai **Progressive Web App (PWA)** statis (tanpa backend) yang dapat diakses melalui browser desktop, Android (Chrome), maupun iPhone (Safari), serta dapat dipasang ke layar utama ponsel dan dijalankan secara offline.

---

## Modul Utama

1. **Transaksi Otomatis**: Penjadwalan transaksi berulang dengan validasi input, proteksi saldo minimum, limit harian, penguncian transaksi sementara, dan simulasi verifikasi sidik jari.
2. **Pantau Transaksi**: Monitoring riwayat transaksi per status (*Berhasil*, *Tertunda*, *Gagal*), antrean retry otomatis untuk transaksi terganggu (maksimal 5 kali percobaan), dan opsi pembatalan manual nasabah.
3. **Pusat Keamanan**: Pengaturan limit transaksi harian, ambang verifikasi sidik jari, sakelar kunci transaksi keluar sementara dengan pilihan durasi (1, 6, 24 jam), log kejadian keamanan, dan kontrol simulasi layanan bank.
4. **Navigasi Sederhana**: Pencarian fitur cerdas, pengelolaan penerima favorit (tambah & hapus), serta sakelar Mode Sederhana (*Simple Mode*) berikon besar untuk kemudahan aksesibilitas.

---

## Menjalankan di HP

### A. Hosting Gratis (Wajib HTTPS)
Agar fitur PWA dan Service Worker aktif di perangkat seluler, aplikasi wajib disajikan melalui protokol **HTTPS** (localhost dikecualikan untuk pengujian komputer lokal). Pilihan hosting gratis tanpa backend:
- **Netlify Drop**: Seret folder proyek ini langsung ke [Netlify Drop](https://app.netlify.com/drop) untuk deploy instan dengan HTTPS otomatis.
- **GitHub Pages**: Unggah kode ke repositori GitHub, lalu aktifkan *GitHub Pages* di menu *Settings* &rarr; *Pages*. Path aplikasi sudah menggunakan format relatif (`./`) sehingga mendukung subfolder (misalnya `https://username.github.io/livin-smart-assist/`).
- **Vercel**: Hubungkan repositori atau gunakan CLI `vercel` untuk deploy otomatis.

### B. Cara Memasang di Android (Google Chrome)
1. Buka URL aplikasi di Google Chrome pada perangkat Android Anda.
2. Ketuk ikon menu titik tiga (**⋮**) di pojok kanan atas browser.
3. Pilih menu **"Install app"** atau **"Tambahkan ke Layar Utama"** (*Add to Home screen*).
4. Alternatif: Buka menu **Keamanan** &rarr; buka bagian **"Pengaturan Simulasi (Demo)"** di bagian bawah &rarr; ketuk tombol **"Pasang Aplikasi ke Layar Utama"**.
5. Ikon **Livin' Smart Assist** akan muncul di beranda dan laci aplikasi perangkat Android Anda.

### C. Cara Memasang di iPhone (Apple Safari)
1. Buka URL aplikasi menggunakan browser **Safari** di perangkat iOS (iPhone / iPad).
2. Ketuk tombol **Bagikan** (*Share button* berbentuk ikon kotak dengan panah ke atas) di bilah alat Safari.
3. Gulir ke bawah dan pilih **"Tambahkan ke Layar Utama"** (*Add to Home Screen*).
4. Beri konfirmasi dengan mengetuk **"Tambah"** (*Add*) di pojok kanan atas.
5. Aplikasi akan berjalan mandiri (*standalone*) dalam layar penuh tanpa bilah URL Safari, lengkap dengan dukungan *Safe Area* untuk *notch* dan *Dynamic Island*.

### D. Catatan Penyimpanan Data Simulasi
- Seluruh data (saldo simulasi, daftar jadwal, riwayat transaksi, pengaturan limit, dan log keamanan) tersimpan secara lokal di browser melalui `localStorage` per perangkat pengguna.
- Tidak ada data yang dikirim ke server pihak ketiga maupun Bank Mandiri.
- Jika pengguna membuka mode penjelajahan privat (*Private Browsing* / *Incognito*), aplikasi secara cerdas beralih ke penyimpanan memori sementara (*in-memory fallback*) tanpa terjadi *crash*.
- Untuk mereset data simulasi kembali ke kondisi awal, masuk ke menu **Keamanan** &rarr; **Pengaturan Simulasi (Demo)** &rarr; **Reset Data Simulasi**.

---

## Pengujian Kepatuhan Fungsional (Blackbox Testing)

Seluruh 29 skenario uji fungsional (U01–U29) dari Tabel 5.4 Laporan Tugas Besar TPKI dipisahkan ke dalam dashboard pengujian mandiri:
- Buka file [tests.html](./tests.html) di browser.
- Seluruh pengujian dieksekusi secara otomatis dengan tingkat kesesuaian **29 dari 29 Sesuai (100%)**.

---

## Struktur File

```
livin-smart-assist/
├── index.html            # Halaman utama aplikasi (PWA Viewport)
├── tests.html            # Dashboard pengujian Blackbox Testing (Tabel 5.4)
├── manifest.json         # Web App Manifest PWA
├── sw.js                 # Service Worker (Cache-First & Offline Fallback)
├── _headers              # Header kontrol cache Netlify/Cloudflare
├── netlify.toml          # Konfigurasi deploy Netlify
├── README.md             # Panduan instalasi dan penggunaan
├── css/
│   └── style.css         # Stylesheet responsive, safe-area, dan komponen Livin'
├── js/
│   ├── app.js            # Controller antarmuka, routing view, jam real-time, PWA
│   ├── data.js           # Data seed awal (D1–D6)
│   ├── storage.js        # Wrapper localStorage dengan try-catch & in-memory fallback
│   ├── security.js       # Logika Pusat Keamanan (limit, ambang, kunci)
│   ├── transaction.js    # Logika Transaksi Otomatis, validasi, dan antrean retry
│   └── navigation.js     # Logika Navigasi Sederhana, pencarian, dan favorit
└── icons/
    ├── icon-192.png           # Ikon PWA 192x192
    ├── icon-512.png           # Ikon PWA 512x512
    ├── icon-512-maskable.png  # Ikon PWA Maskable 512x512 (area aman 80%)
    ├── apple-touch-icon.png   # Ikon Apple iOS 180x180
    └── icon.svg               # Master vector ikon
```
