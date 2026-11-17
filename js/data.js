/* ======================================================
   Livin' Smart Assist — Data Layer (js/data.js)
   Defines initial seed data for the 9 ERD entities
   and helper ID generators.
   ====================================================== */

const DATA = {
  /* ---- 1. NASABAH ---- */
  nasabah: {
    id_nasabah: 'N001',
    nama_nasabah: 'Nasabah Simulasi',
    no_rekening: '1370012345678',
    saldo: 2450000,
    mode_tampilan: 'normal'          // 'normal' | 'sederhana'
  },

  /* ---- 5. PENGATURAN_KEAMANAN (1:1 with NASABAH) ---- */
  pengaturan_keamanan: {
    id_pengaturan: 'PK001',
    id_nasabah: 'N001',
    limit_harian: 5000000,
    ambang_verifikasi: 1000000,
    status_kunci: false,
    kunci_hingga: null
  },

  /* ---- 2. JADWAL_TRANSAKSI (initial empty, populated relatively) ---- */
  jadwal_transaksi: [],

  /* ---- 3. TRANSAKSI ---- */
  transaksi: [],

  /* ---- 4. ANTREAN_TRANSAKSI ---- */
  antrean_transaksi: [],

  /* ---- 6. LOG_PERINGATAN ---- */
  log_peringatan: [],

  /* ---- 7. PENERIMA_FAVORIT ---- */
  penerima_favorit: [
    { id_favorit: 'F001', id_nasabah: 'N001', nama_penerima: 'Ibu Kos',             tujuan: '••••4821', jenis: 'Transfer' },
    { id_favorit: 'F002', id_nasabah: 'N001', nama_penerima: 'Cicilan Motor',       tujuan: '••••7310', jenis: 'Pembayaran' },
    { id_favorit: 'F003', id_nasabah: 'N001', nama_penerima: 'Adik',                tujuan: '••••7755', jenis: 'Transfer' },
    { id_favorit: 'F004', id_nasabah: 'N001', nama_penerima: 'Dompet Digital Saya', tujuan: '0812••••90', jenis: 'Top Up' },
    { id_favorit: 'F005', id_nasabah: 'N001', nama_penerima: 'Dina Pratama',        tujuan: '••••6612', jenis: 'Transfer' }
  ],

  /* ---- 8. NOTIFIKASI ---- */
  notifikasi: [],

  /* ---- 9. FITUR_MENU (reference data) ---- */
  fitur_menu: [
    { id_fitur: 'FM01', nama_fitur: 'Transfer Sesama Mandiri', kategori: 'Transfer', kata_kunci: 'transfer kirim uang mandiri sesama' },
    { id_fitur: 'FM02', nama_fitur: 'Transfer Bank Lain',      kategori: 'Transfer', kata_kunci: 'transfer kirim uang bank lain antar' },
    { id_fitur: 'FM03', nama_fitur: 'Top Up GoPay',            kategori: 'Top Up',   kata_kunci: 'top up gopay dompet digital isi saldo' },
    { id_fitur: 'FM04', nama_fitur: 'Top Up OVO',              kategori: 'Top Up',   kata_kunci: 'top up ovo dompet digital isi saldo' },
    { id_fitur: 'FM05', nama_fitur: 'Top Up DANA',             kategori: 'Top Up',   kata_kunci: 'top up dana dompet digital isi saldo' },
    { id_fitur: 'FM06', nama_fitur: 'Top Up ShopeePay',        kategori: 'Top Up',   kata_kunci: 'top up shopeepay dompet digital isi saldo shopee' },
    { id_fitur: 'FM07', nama_fitur: 'Bayar Listrik PLN',       kategori: 'Bayar',    kata_kunci: 'bayar listrik pln tagihan token' },
    { id_fitur: 'FM08', nama_fitur: 'Token Listrik Prabayar',  kategori: 'Bayar',    kata_kunci: 'token listrik prabayar pln beli' },
    { id_fitur: 'FM09', nama_fitur: 'Bayar BPJS Kesehatan',    kategori: 'Bayar',    kata_kunci: 'bayar bpjs kesehatan tagihan iuran' },
    { id_fitur: 'FM10', nama_fitur: 'Bayar Air PDAM',          kategori: 'Bayar',    kata_kunci: 'bayar air pdam tagihan' },
    { id_fitur: 'FM11', nama_fitur: 'Bayar Internet/TV Kabel', kategori: 'Bayar',    kata_kunci: 'bayar internet tv kabel indihome first media' },
    { id_fitur: 'FM12', nama_fitur: 'Bayar Cicilan',           kategori: 'Bayar',    kata_kunci: 'bayar cicilan kredit angsuran pinjaman' },
    { id_fitur: 'FM13', nama_fitur: 'QRIS',                    kategori: 'QRIS',     kata_kunci: 'qris scan bayar qr code' },
    { id_fitur: 'FM14', nama_fitur: 'Jadwalkan Bayar Listrik', kategori: 'Bayar Otomatis', kata_kunci: 'jadwal bayar listrik otomatis pln' },
    { id_fitur: 'FM15', nama_fitur: 'Jadwalkan Transfer Rutin',kategori: 'Bayar Otomatis', kata_kunci: 'jadwal transfer otomatis rutin' },
    { id_fitur: 'FM16', nama_fitur: 'Jadwalkan Top Up',        kategori: 'Bayar Otomatis', kata_kunci: 'jadwal top up otomatis dompet digital' },
    { id_fitur: 'FM17', nama_fitur: 'Pantau Transaksi',        kategori: 'Pantau',   kata_kunci: 'pantau riwayat status transaksi' },
    { id_fitur: 'FM18', nama_fitur: 'Pusat Keamanan',          kategori: 'Keamanan', kata_kunci: 'keamanan limit kunci verifikasi sidik jari' },
    { id_fitur: 'FM19', nama_fitur: 'Mode Sederhana',          kategori: 'Navigasi', kata_kunci: 'mode sederhana simple tampilan' },
    { id_fitur: 'FM20', nama_fitur: 'Penerima Favorit',        kategori: 'Navigasi', kata_kunci: 'favorit penerima kontak tersimpan' }
  ]
};

/* ---- ID generators ---- */
function generateId(prefix, list, key) {
  const nums = (list || []).map(item => {
    const n = parseInt(String(item[key]).replace(prefix, ''));
    return isNaN(n) ? 0 : n;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return prefix + String(max + 1).padStart(3, '0');
}

function genJadwalId()   { return generateId('J',  Storage.get('jadwal_transaksi'),  'id_jadwal'); }
function genTransaksiId(){ return generateId('T',  Storage.get('transaksi'),         'id_transaksi'); }
function genAntreanId()  { return generateId('A',  Storage.get('antrean_transaksi'), 'id_antrean'); }
function genLogId()      { return generateId('L',  Storage.get('log_peringatan'),    'id_log'); }
function genFavoritId()  { return generateId('F',  Storage.get('penerima_favorit'),  'id_favorit'); }
function genNotifId()    { return generateId('NTF',Storage.get('notifikasi'),         'id_notifikasi'); }
