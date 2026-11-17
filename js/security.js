/* ======================================================
   Livin' Smart Assist — Security Module (js/security.js)
   Implements DFD Process 3.0 — Kelola Pusat Keamanan
   ====================================================== */

const Security = {
  /** 3.1 Pengaturan Limit dan Ambang Verifikasi */
  updateLimitAmbang(limitHarian, ambangVerifikasi) {
    if (!limitHarian || limitHarian <= 0) return { ok: false, msg: 'Limit harian harus angka lebih dari 0.' };
    if (!ambangVerifikasi || ambangVerifikasi <= 0) return { ok: false, msg: 'Ambang verifikasi harus angka lebih dari 0.' };
    if (ambangVerifikasi > limitHarian) return { ok: false, msg: 'Ambang verifikasi tidak boleh melebihi limit harian.' };

    const k = Storage.getKeamanan();
    k.limit_harian = limitHarian;
    k.ambang_verifikasi = ambangVerifikasi;
    Storage.setKeamanan(k);
    return { ok: true, msg: 'Pengaturan keamanan tersimpan.' };
  },

  /** 3.2 Pengelolaan Kunci Sementara */
  activateLock(durasiJam) {
    const k = Storage.getKeamanan();
    k.status_kunci = true;
    const now = new Date();
    now.setHours(now.getHours() + durasiJam);
    k.kunci_hingga = now.toISOString();
    Storage.setKeamanan(k);

    // Log peringatan
    this.addLog('Kunci Aktif', `Transaksi keluar dikunci selama ${durasiJam} jam.`);
    this.addNotif(`Kunci transaksi keluar aktif selama ${durasiJam} jam.`);
    return { ok: true, msg: `Transaksi keluar dikunci selama ${durasiJam} jam.` };
  },

  deactivateLock() {
    const k = Storage.getKeamanan();
    k.status_kunci = false;
    k.kunci_hingga = null;
    Storage.setKeamanan(k);
    this.addLog('Kunci Nonaktif', 'Kunci transaksi keluar dinonaktifkan.');
    return { ok: true, msg: 'Kunci transaksi keluar dinonaktifkan.' };
  },

  /** Check if lock is currently active (auto-expire) */
  isLocked() {
    const k = Storage.getKeamanan();
    if (!k.status_kunci) return false;
    if (k.kunci_hingga && new Date(k.kunci_hingga) <= new Date()) {
      // Auto expire
      k.status_kunci = false;
      k.kunci_hingga = null;
      Storage.setKeamanan(k);
      return false;
    }
    return true;
  },

  /** Check daily limit */
  checkDailyLimit(nominal) {
    const k = Storage.getKeamanan();
    const used = Storage.getTotalHariIni();
    return (used + nominal) <= k.limit_harian;
  },

  /** Check if fingerprint verification needed */
  needsVerification(nominal) {
    const k = Storage.getKeamanan();
    return nominal >= k.ambang_verifikasi;
  },

  /** Simulate fingerprint verification — returns a Promise with dialog */
  simulateFingerprint() {
    return new Promise((resolve) => {
      showFingerprintModal(resolve);
    });
  },

  /** 3.3 Log Peringatan helpers */
  addLog(jenis, pesan, idTransaksi) {
    Storage.addItem('log_peringatan', {
      id_log: genLogId(),
      id_nasabah: 'N001',
      id_transaksi: idTransaksi || null,
      jenis_peringatan: jenis,
      pesan: pesan,
      waktu: new Date().toISOString()
    });
  },

  addNotif(pesan, idTransaksi) {
    Storage.addItem('notifikasi', {
      id_notifikasi: genNotifId(),
      id_nasabah: 'N001',
      id_transaksi: idTransaksi || null,
      pesan: pesan,
      waktu: new Date().toISOString(),
      status_baca: false
    });
  }
};
