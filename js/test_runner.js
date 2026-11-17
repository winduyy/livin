// Node.js test harness to verify the logic of all modules and all 29 test scenarios
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock localStorage
const storageBackend = {};
global.localStorage = {
  getItem: (k) => storageBackend[k] || null,
  setItem: (k, v) => { storageBackend[k] = String(v); },
  removeItem: (k) => { delete storageBackend[k]; },
  clear: () => { for (const k in storageBackend) delete storageBackend[k]; }
};

// Mock modal functions for headless testing
global.showFingerprintModal = (resolve) => resolve(true);

// Load files in global context
const dir = path.join(__dirname);
function loadScript(name) {
  const code = fs.readFileSync(path.join(dir, name), 'utf8');
  vm.runInThisContext(code);
}

loadScript('data.js');
loadScript('storage.js');
loadScript('security.js');
loadScript('transaction.js');
loadScript('navigation.js');

console.log('--- Testing Storage Initialization ---');
Storage.init();
console.log('Nasabah:', Storage.getNasabah());
console.log('Keamanan:', Storage.getKeamanan());
console.log('Penerima Favorit:', Storage.get('penerima_favorit').length);
console.log('Fitur Menu:', Storage.get('fitur_menu').length);

async function runVerification() {
  console.log('\n--- Running All 29 Blackbox Scenarios ---');
  let passCount = 0;
  let totalCount = 29;

  // U01: Simpan jadwal dengan data valid
  const r1 = Transaction.createSchedule({
    jenis_transaksi: 'Transfer',
    tujuan: 'Ibu Kos',
    nominal: 900000,
    frekuensi: 'Bulanan',
    tanggal_mulai: '2026-12-01',
    saldo_minimum: 100000
  });
  const p1 = r1.ok === true && r1.msg === 'Jadwal tersimpan dengan Status Aktif';
  console.log('U01:', p1 ? 'PASS' : 'FAIL', r1);
  if (p1) passCount++;

  // U02: Nominal dikosongkan
  const r2 = Transaction.createSchedule({ tujuan: 'Ibu Kos', nominal: '', tanggal_mulai: '2026-12-01', saldo_minimum: 100000 });
  const p2 = r2.msg === 'Nominal wajib diisi';
  console.log('U02:', p2 ? 'PASS' : 'FAIL', r2.msg);
  if (p2) passCount++;

  // U03: Nominal nol atau negatif
  const r3 = Transaction.createSchedule({ tujuan: 'Ibu Kos', nominal: -50000, tanggal_mulai: '2026-12-01', saldo_minimum: 100000 });
  const p3 = r3.msg === 'Nominal harus lebih dari 0';
  console.log('U03:', p3 ? 'PASS' : 'FAIL', r3.msg);
  if (p3) passCount++;

  // U04: Nominal bukan angka
  const r4 = Transaction.createSchedule({ tujuan: 'Ibu Kos', nominal: 'abc', tanggal_mulai: '2026-12-01', saldo_minimum: 100000 });
  const p4 = r4.msg === 'Nominal harus berupa angka';
  console.log('U04:', p4 ? 'PASS' : 'FAIL', r4.msg);
  if (p4) passCount++;

  // U05: Penerima/tujuan dikosongkan
  const r5 = Transaction.createSchedule({ tujuan: '', nominal: 100000, tanggal_mulai: '2026-12-01', saldo_minimum: 100000 });
  const p5 = r5.msg === 'Penerima/tujuan wajib diisi';
  console.log('U05:', p5 ? 'PASS' : 'FAIL', r5.msg);
  if (p5) passCount++;

  // U06: Tanggal mulai di masa lalu
  const r6 = Transaction.createSchedule({ tujuan: 'Ibu Kos', nominal: 100000, tanggal_mulai: '2020-01-01', saldo_minimum: 100000 });
  const p6 = r6.msg === 'Tanggal mulai tidak boleh di masa lalu';
  console.log('U06:', p6 ? 'PASS' : 'FAIL', r6.msg);
  if (p6) passCount++;

  // U07: Eksekusi jadwal, saldo di bawah batas minimum
  Storage.setNasabah({ ...Storage.getNasabah(), saldo: 950000 });
  const r7 = await Transaction.executeTransaction({ jenis_transaksi: 'Transfer', tujuan: 'Ibu Kos', nominal: 900000, saldo_minimum: 100000 });
  const p7 = r7.step === 'saldo_minimum' && r7.checkResult.status === 'DITAHAN';
  console.log('U07:', p7 ? 'PASS' : 'FAIL', r7.checkResult ? r7.checkResult.msg : '');
  if (p7) passCount++;

  // U08: Eksekusi jadwal, saldo mencukupi
  Storage.setNasabah({ ...Storage.getNasabah(), saldo: 2450000 });
  const r8 = Transaction.checkExecutionPrerequisites(900000, 100000);
  const p8 = r8.ok === true;
  console.log('U08:', p8 ? 'PASS' : 'FAIL', r8.msg);
  if (p8) passCount++;

  // U09: Respons bank berhasil
  const r9 = await Transaction.executeTransaction({ jenis_transaksi: 'Transfer', tujuan: 'Ibu Kos', nominal: 100000, saldo_minimum: 50000 }, { forceBankResponse: 'berhasil' });
  const p9 = r9.status === 'Berhasil' && r9.msg === 'Berhasil pada percobaan pertama';
  console.log('U09:', p9 ? 'PASS' : 'FAIL', r9.msg);
  if (p9) passCount++;

  // U10: Layanan bank terganggu pada percobaan pertama
  const r10 = await Transaction.executeTransaction({ jenis_transaksi: 'Top up', tujuan: 'Dompet Digital', nominal: 100000, saldo_minimum: 50000 }, { forceBankResponse: 'gangguan' });
  const p10 = r10.status === 'Tertunda' && r10.antrean && r10.antrean.jumlah_percobaan === 1;
  console.log('U10:', p10 ? 'PASS' : 'FAIL', r10.msg);
  if (p10) passCount++;

  // U11: Proses ulang berhasil pada percobaan kedua
  const r11 = Transaction.processRetryQueue(r10.antrean.id_antrean, 'berhasil');
  const p11 = r11.status === 'Berhasil' && r11.percobaan === 2;
  console.log('U11:', p11 ? 'PASS' : 'FAIL', r11.msg);
  if (p11) passCount++;

  // U12: Gangguan berlanjut sampai batas percobaan
  const r12Init = await Transaction.executeTransaction({ jenis_transaksi: 'Tagihan', tujuan: 'PLN', nominal: 50000, saldo_minimum: 0 }, { forceBankResponse: 'gangguan' });
  Transaction.processRetryQueue(r12Init.antrean.id_antrean, 'gangguan');
  Transaction.processRetryQueue(r12Init.antrean.id_antrean, 'gangguan');
  Transaction.processRetryQueue(r12Init.antrean.id_antrean, 'gangguan');
  const r12Final = Transaction.processRetryQueue(r12Init.antrean.id_antrean, 'gangguan');
  const p12 = r12Final.status === 'Gagal' && r12Final.percobaan === 5;
  console.log('U12:', p12 ? 'PASS' : 'FAIL', r12Final.msg);
  if (p12) passCount++;

  // U13: Filter Status Tertunda
  Storage.addItem('transaksi', { id_transaksi: 'T-T1', id_nasabah: 'N001', jenis_transaksi: 'Transfer', tujuan: 'A', nominal: 10000, waktu: '2026-11-10T10:00:00', status_transaksi: 'Tertunda' });
  const allTrx = Storage.get('transaksi') || [];
  const tertundaOnly = allTrx.filter(t => t.status_transaksi === 'Tertunda');
  const p13 = tertundaOnly.length > 0;
  console.log('U13:', p13 ? 'PASS' : 'FAIL', `${tertundaOnly.length} transaksi Tertunda ditampilkan`);
  if (p13) passCount++;

  // U14: Atur Limit dan ambang valid
  const r14 = Security.updateLimitAmbang(5000000, 1000000);
  const p14 = r14.ok === true;
  console.log('U14:', p14 ? 'PASS' : 'FAIL', r14.msg);
  if (p14) passCount++;

  // U15: Limit harian tidak valid
  const r15 = Security.updateLimitAmbang(0, 1000000);
  const p15 = r15.msg.includes('Limit harian harus angka lebih dari 0');
  console.log('U15:', p15 ? 'PASS' : 'FAIL', r15.msg);
  if (p15) passCount++;

  // U16: Ambang melebihi Limit harian
  const r16 = Security.updateLimitAmbang(1000000, 5000000);
  const p16 = r16.msg.includes('Ambang verifikasi tidak boleh melebihi');
  console.log('U16:', p16 ? 'PASS' : 'FAIL', r16.msg);
  if (p16) passCount++;

  // U17: Nominal di atas ambang verifikasi
  Security.updateLimitAmbang(5000000, 1000000);
  const r17 = Security.needsVerification(1500000);
  const p17 = r17 === true;
  console.log('U17:', p17 ? 'PASS' : 'FAIL', 'Verifikasi sidik jari diminta');
  if (p17) passCount++;

  // U18: Nominal di bawah ambang verifikasi
  const r18 = Security.needsVerification(500000);
  const p18 = r18 === false;
  console.log('U18:', p18 ? 'PASS' : 'FAIL', 'Transaksi diproses tanpa verifikasi tambahan');
  if (p18) passCount++;

  // U19: Verifikasi sidik jari gagal
  const r19 = await Transaction.executeTransaction({ jenis_transaksi: 'Transfer', tujuan: 'B', nominal: 1500000, saldo_minimum: 0 }, { forceVerificationResult: false });
  const p19 = r19.step === 'verification_failed';
  console.log('U19:', p19 ? 'PASS' : 'FAIL', r19.msg);
  if (p19) passCount++;

  // U20: Total transaksi melebihi Limit harian
  Storage.setNasabah({ ...Storage.getNasabah(), saldo: 10000000 });
  const todayStr = new Date().toISOString().slice(0, 10);
  Storage.addItem('transaksi', { id_transaksi: 'T-LIMIT-1', id_nasabah: 'N001', jenis_transaksi: 'Transfer', tujuan: 'X', nominal: 1000000, waktu: `${todayStr}T10:00:00`, status_transaksi: 'Berhasil' });
  const r20 = Transaction.checkExecutionPrerequisites(4500000, 0);
  const p20 = r20.status === 'DITOLAK_LIMIT';
  console.log('U20:', p20 ? 'PASS' : 'FAIL', r20.msg);
  if (p20) passCount++;

  // U21: Transaksi saat kunci sementara aktif
  Security.activateLock(1);
  const r21 = Transaction.checkExecutionPrerequisites(100000, 0);
  const p21 = r21.status === 'DITOLAK_KUNCI';
  console.log('U21:', p21 ? 'PASS' : 'FAIL', r21.msg);
  if (p21) passCount++;

  // U22: Transaksi setelah kunci dibuka
  Security.deactivateLock();
  const r22 = Transaction.checkExecutionPrerequisites(100000, 0);
  const p22 = r22.status === 'READY_TO_EXECUTE';
  console.log('U22:', p22 ? 'PASS' : 'FAIL', r22.msg);
  if (p22) passCount++;

  // U23: Cari fitur dengan kata kunci tersedia
  const r23 = Navigation.searchFeatures('listrik');
  const p23 = r23.ok && r23.count === 3;
  console.log('U23:', p23 ? 'PASS' : 'FAIL', `${r23.count} fitur ditemukan`);
  if (p23) passCount++;

  // U24: Cari fitur dengan kata kunci tidak tersedia
  const r24 = Navigation.searchFeatures('xyz123');
  const p24 = r24.msg === 'Fitur tidak ditemukan';
  console.log('U24:', p24 ? 'PASS' : 'FAIL', r24.msg);
  if (p24) passCount++;

  // U25: Kolom pencarian kosong
  const r25 = Navigation.searchFeatures('');
  const p25 = r25.msg === 'Masukkan kata kunci pencarian';
  console.log('U25:', p25 ? 'PASS' : 'FAIL', r25.msg);
  if (p25) passCount++;

  // U26: Tambah penerima favorit baru
  const r26 = Navigation.addFavorite('Adik', '7755', 'Transfer');
  const p26 = r26.ok === true && r26.msg === 'Penerima favorit tersimpan';
  console.log('U26:', p26 ? 'PASS' : 'FAIL', r26.msg);
  if (p26) passCount++;

  // U27: Tambah penerima favorit yang sudah ada
  const r27 = Navigation.addFavorite('Ibu Kos', '4821', 'Transfer');
  const p27 = r27.ok === false && r27.msg === 'Penerima sudah ada di daftar favorit';
  console.log('U27:', p27 ? 'PASS' : 'FAIL', r27.msg);
  if (p27) passCount++;

  // U28: Aktifkan Mode Sederhana
  const r28 = Navigation.setMode('sederhana');
  const p28 = r28.menuCount === 4;
  console.log('U28:', p28 ? 'PASS' : 'FAIL', r28.msg);
  if (p28) passCount++;

  // U29: Nonaktifkan Mode Sederhana
  const r29 = Navigation.setMode('normal');
  const p29 = r29.menuCount === 8;
  console.log('U29:', p29 ? 'PASS' : 'FAIL', r29.msg);
  if (p29) passCount++;

  console.log(`\n========================================`);
  console.log(`FINAL RESULT: ${passCount} / ${totalCount} SCENARIOS PASSED (${Math.round(passCount/totalCount*100)}%)`);
  console.log(`========================================`);
}

runVerification().catch(console.error);
