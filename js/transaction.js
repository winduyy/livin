/* ======================================================
   Livin' Smart Assist — Transaction Module (js/transaction.js)
   Implements DFD Process 1.0 (Kelola Transaksi Otomatis) &
   DFD Process 2.0 (Pantau Transaksi)
   Follows Flowchart Figure 4.2 & Figure 4.3 strictly.
   ====================================================== */

const Transaction = {
  /**
   * Bank Service Simulation (Layanan Bank Simulasi)
   * Modes: 'auto' | 'normal' | 'gangguan_once' | 'always_disruption' | 'always_fail'
   */
  bankServiceMode: 'auto',

  setBankServiceMode(mode) {
    this.bankServiceMode = mode;
  },

  /**
   * Call simulated bank service
   * Returns: 'berhasil' | 'gangguan' | 'gagal'
   */
  callBankService(nominal) {
    if (this.bankServiceMode === 'always_success' || this.bankServiceMode === 'normal') return 'berhasil';
    if (this.bankServiceMode === 'always_disruption') return 'gangguan';
    if (this.bankServiceMode === 'always_fail') return 'gagal';
    if (this.bankServiceMode === 'gangguan_once') {
      this.bankServiceMode = 'auto'; // Switches to auto/berhasil for subsequent retries
      return 'gangguan';
    }

    // Auto behavior: normal operation is 'berhasil'
    return 'berhasil';
  },

  /* ----------------------------------------------------
     1.0 KELOLA TRANSAKSI OTOMATIS
     ---------------------------------------------------- */

  /**
   * 1.1 Atur Jadwal Transaksi (Validation & Storage)
   * Validates inputs according to Table 4.5 & Test Scenarios U01-U06
   */
  validateScheduleInput(data) {
    // U05: Penerima/tujuan dikosongkan
    if (!data.tujuan || String(data.tujuan).trim() === '') {
      return { ok: false, field: 'tujuan', msg: 'Penerima/tujuan wajib diisi' };
    }

    // U02: Nominal dikosongkan
    if (data.nominal === undefined || data.nominal === null || String(data.nominal).trim() === '') {
      return { ok: false, field: 'nominal', msg: 'Nominal wajib diisi' };
    }

    // U04: Nominal bukan angka
    const cleanNominalStr = String(data.nominal).replace(/[^0-9.-]+/g, '');
    const num = Number(cleanNominalStr);
    if (isNaN(num) || isNaN(Number(data.nominal))) {
      return { ok: false, field: 'nominal', msg: 'Nominal harus berupa angka' };
    }

    // U03: Nominal nol atau negatif
    if (num <= 0) {
      return { ok: false, field: 'nominal', msg: 'Nominal harus lebih dari 0' };
    }

    // U06: Tanggal mulai di masa lalu
    if (!data.tanggal_mulai) {
      return { ok: false, field: 'tanggal_mulai', msg: 'Tanggal mulai wajib diisi' };
    }

    const inputDate = new Date(data.tanggal_mulai + 'T00:00:00');
    // For academic prototype testing reference date is today or 2026-11-10
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inputDate < today) {
      return { ok: false, field: 'tanggal_mulai', msg: 'Tanggal mulai tidak boleh di masa lalu' };
    }

    // Saldo minimum validation
    const saldoMin = Number(data.saldo_minimum);
    if (isNaN(saldoMin) || saldoMin < 0) {
      return { ok: false, field: 'saldo_minimum', msg: 'Saldo minimum harus berupa angka valid' };
    }

    return { ok: true, cleanNominal: num, cleanSaldoMin: saldoMin };
  },

  /**
   * Create and save a new schedule (JADWAL_TRANSAKSI)
   */
  createSchedule(formData) {
    const val = this.validateScheduleInput(formData);
    if (!val.ok) {
      return val;
    }

    const idJadwal = genJadwalId();
    const newSchedule = {
      id_jadwal: idJadwal,
      id_nasabah: 'N001',
      jenis_transaksi: formData.jenis_transaksi || 'Transfer',
      tujuan: formData.tujuan.trim(),
      nominal: val.cleanNominal,
      frekuensi: formData.frekuensi || 'Bulanan',
      tanggal_berikutnya: formData.tanggal_mulai,
      saldo_minimum: val.cleanSaldoMin,
      status_jadwal: 'Aktif' // 'Aktif' | 'Dijeda'
    };

    Storage.addItem('jadwal_transaksi', newSchedule);
    Security.addNotif(`Jadwal transaksi ${newSchedule.jenis_transaksi} ke ${newSchedule.tujuan} berhasil disimpan.`);

    return { ok: true, msg: 'Jadwal tersimpan dengan Status Aktif', jadwal: newSchedule };
  },

  /**
   * Pause / Resume schedule
   */
  toggleScheduleStatus(idJadwal) {
    const schedules = Storage.get('jadwal_transaksi') || [];
    const item = schedules.find(s => s.id_jadwal === idJadwal);
    if (!item) return { ok: false, msg: 'Jadwal tidak ditemukan' };

    const newStatus = item.status_jadwal === 'Aktif' ? 'Dijeda' : 'Aktif';
    Storage.updateItem('jadwal_transaksi', 'id_jadwal', idJadwal, { status_jadwal: newStatus });
    return { ok: true, newStatus: newStatus };
  },

  /**
   * Delete schedule
   */
  deleteSchedule(idJadwal) {
    Storage.removeItem('jadwal_transaksi', 'id_jadwal', idJadwal);
    return { ok: true, msg: 'Jadwal berhasil dihapus' };
  },

  /* ----------------------------------------------------
     EXECUTION ENGINE (Flowchart Gambar 4.2)
     Steps:
     1. Cek saldo setelah transaksi >= saldo minimum
        - If No -> Tahan transaksi, kirim peringatan
     2. Cek nominal <= limit harian & transaksi tidak dikunci
        - If No -> Ditolak, catat log peringatan
     3. Cek nominal > ambang verifikasi
        - If Yes -> Minta verifikasi sidik jari
          - Gagal -> Catat log peringatan, tolak transaksi
          - Berhasil -> Lanjutkan
     4. Kirim transaksi ke layanan bank
     ---------------------------------------------------- */

  /**
   * Pre-execution security & balance checks
   * Returns:
   *  { status: 'DITAHAN', reason: ... }
   *  { status: 'DITOLAK_KUNCI', reason: ... }
   *  { status: 'DITOLAK_LIMIT', reason: ... }
   *  { status: 'NEED_VERIFICATION', reason: ... }
   *  { status: 'READY_TO_EXECUTE' }
   */
  checkExecutionPrerequisites(nominal, saldoMinimum, idTransaksi) {
    const nasabah = Storage.getNasabah();
    const currentSaldo = nasabah.saldo;
    const saldoAfter = currentSaldo - nominal;

    // 1. Validasi saldo minimum (U07, U08)
    if (saldoAfter < saldoMinimum) {
      const msg = `Ditahan: saldo setelah transaksi Rp ${saldoAfter.toLocaleString('id-ID')} di bawah saldo minimum Rp ${saldoMinimum.toLocaleString('id-ID')}`;
      Security.addLog('Saldo Minimum', msg, idTransaksi);
      Security.addNotif(msg, idTransaksi);
      return {
        ok: false,
        status: 'DITAHAN',
        currentSaldo: currentSaldo,
        saldoAfter: saldoAfter,
        saldoMinimum: saldoMinimum,
        msg: msg
      };
    }

    // 2. Cek transaksi keluar sedang dikunci (U21)
    if (Security.isLocked()) {
      const msg = 'Ditolak: transaksi keluar sedang dikunci; Log dicatat';
      Security.addLog('Transaksi Keluar Dikunci', msg, idTransaksi);
      Security.addNotif(msg, idTransaksi);
      return {
        ok: false,
        status: 'DITOLAK_KUNCI',
        msg: msg
      };
    }

    // 3. Cek total transaksi harian melebihi limit (U20)
    const usedToday = Storage.getTotalHariIni();
    const keamanan = Storage.getKeamanan();
    if (usedToday + nominal > keamanan.limit_harian) {
      const msg = `Ditolak: melebihi Limit harian Rp ${keamanan.limit_harian.toLocaleString('id-ID')}; Log dicatat`;
      Security.addLog('Limit Harian', msg, idTransaksi);
      Security.addNotif(msg, idTransaksi);
      return {
        ok: false,
        status: 'DITOLAK_LIMIT',
        usedToday: usedToday,
        limitHarian: keamanan.limit_harian,
        msg: msg
      };
    }

    // 4. Cek ambang verifikasi sidik jari (U17, U18)
    if (Security.needsVerification(nominal)) {
      return {
        ok: true,
        status: 'NEED_VERIFICATION',
        nominal: nominal,
        ambang: keamanan.ambang_verifikasi,
        msg: 'Verifikasi sidik jari diminta'
      };
    }

    // Semuanya aman tanpa verifikasi tambahan (U18, U22)
    return {
      ok: true,
      status: 'READY_TO_EXECUTE',
      msg: 'Transaksi diproses tanpa verifikasi tambahan'
    };
  },

  /**
   * Execute scheduled transaction or direct transaction
   * @param {Object} item { id_jadwal, jenis_transaksi, tujuan, nominal, saldo_minimum }
   * @param {Object} options { forceVerificationResult: true|false|null, forceBankResponse: 'berhasil'|'gangguan'|'gagal' }
   */
  async executeTransaction(item, options = {}) {
    const nominal = Number(item.nominal);
    const saldoMin = Number(item.saldo_minimum || 0);
    const idTransaksi = genTransaksiId();

    // Check prerequisites
    const check = this.checkExecutionPrerequisites(nominal, saldoMin, idTransaksi);

    if (check.status === 'DITAHAN') {
      // Record held transaction in TRANSAKSI with status 'Ditahan'
      const trx = {
        id_transaksi: idTransaksi,
        id_nasabah: 'N001',
        id_jadwal: item.id_jadwal || null,
        jenis_transaksi: item.jenis_transaksi,
        tujuan: item.tujuan,
        nominal: nominal,
        waktu: new Date().toISOString(),
        status_transaksi: 'Ditahan'
      };
      Storage.addItem('transaksi', trx);
      return { ok: false, step: 'saldo_minimum', checkResult: check, transaksi: trx };
    }

    if (check.status === 'DITOLAK_KUNCI' || check.status === 'DITOLAK_LIMIT') {
      return { ok: false, step: 'security_check', checkResult: check };
    }

    // Handle fingerprint verification
    if (check.status === 'NEED_VERIFICATION') {
      let verified = false;
      if (options.forceVerificationResult !== undefined) {
        verified = options.forceVerificationResult;
      } else {
        // UI prompt
        verified = await Security.simulateFingerprint();
      }

      if (!verified) {
        // U19: Verifikasi sidik jari gagal -> tolak dan catat log
        const msg = 'Verifikasi gagal: transaksi dibatalkan; Log dicatat';
        Security.addLog('Verifikasi Gagal', msg, idTransaksi);
        Security.addNotif(msg, idTransaksi);
        return { ok: false, step: 'verification_failed', msg: msg };
      } else {
        Security.addLog('Verifikasi Berhasil', 'Verifikasi sidik jari berhasil', idTransaksi);
      }
    }

    // Send to Bank Service
    const bankResponse = options.forceBankResponse || this.callBankService(nominal);

    if (bankResponse === 'berhasil') {
      // Deduct balance
      Storage.updateSaldo(-nominal);

      const trx = {
        id_transaksi: idTransaksi,
        id_nasabah: 'N001',
        id_jadwal: item.id_jadwal || null,
        jenis_transaksi: item.jenis_transaksi,
        tujuan: item.tujuan,
        nominal: nominal,
        waktu: new Date().toISOString(),
        status_transaksi: 'Berhasil'
      };
      Storage.addItem('transaksi', trx);
      Security.addNotif(`Transaksi ${trx.jenis_transaksi} Rp ${trx.nominal.toLocaleString('id-ID')} ke ${trx.tujuan} Berhasil.`, idTransaksi);

      return { ok: true, status: 'Berhasil', transaksi: trx, msg: 'Berhasil pada percobaan pertama' };
    }

    if (bankResponse === 'gangguan') {
      // Create pending transaction (saldo NOT deducted!)
      const trx = {
        id_transaksi: idTransaksi,
        id_nasabah: 'N001',
        id_jadwal: item.id_jadwal || null,
        jenis_transaksi: item.jenis_transaksi,
        tujuan: item.tujuan,
        nominal: nominal,
        waktu: new Date().toISOString(),
        status_transaksi: 'Tertunda'
      };
      Storage.addItem('transaksi', trx);

      // Create queue record
      const nextTry = new Date();
      nextTry.setMinutes(nextTry.getMinutes() + 15);

      const antrean = {
        id_antrean: genAntreanId(),
        id_transaksi: idTransaksi,
        jumlah_percobaan: 1,
        percobaan_berikutnya: nextTry.toISOString(),
        status_antrean: 'Menunggu' // 'Menunggu' | 'Selesai' | 'Habis'
      };
      Storage.addItem('antrean_transaksi', antrean);

      const msg = 'Tertunda: masuk antrean, percobaan ke-1';
      Security.addNotif(`Transaksi ${trx.jenis_transaksi} tertunda karena layanan bank terganggu. Saldo belum terdebet.`, idTransaksi);

      return { ok: true, status: 'Tertunda', transaksi: trx, antrean: antrean, msg: msg };
    }

    // Direct failure
    const trx = {
      id_transaksi: idTransaksi,
      id_nasabah: 'N001',
      id_jadwal: item.id_jadwal || null,
      jenis_transaksi: item.jenis_transaksi,
      tujuan: item.tujuan,
      nominal: nominal,
      waktu: new Date().toISOString(),
      status_transaksi: 'Gagal'
    };
    Storage.addItem('transaksi', trx);
    Security.addNotif(`Transaksi ${trx.jenis_transaksi} Gagal. Saldo tidak terdebet.`, idTransaksi);

    return { ok: false, status: 'Gagal', transaksi: trx, msg: 'Transaksi gagal' };
  },

  /* ----------------------------------------------------
     2.0 PANTAU TRANSAKSI & ANTREAN PEMROSESAN ULANG
     (Flowchart Gambar 4.3)
     ---------------------------------------------------- */

  /**
   * Process retry for a queued transaction
   * @param {string} idAntrean
   * @param {string} forceBankResponse 'berhasil' | 'gangguan' | 'gagal'
   */
  processRetryQueue(idAntrean, forceBankResponse) {
    const queueList = Storage.get('antrean_transaksi') || [];
    const antrean = queueList.find(a => a.id_antrean === idAntrean);
    if (!antrean) return { ok: false, msg: 'Antrean tidak ditemukan' };

    const trxList = Storage.get('transaksi') || [];
    const trx = trxList.find(t => t.id_transaksi === antrean.id_transaksi);
    if (!trx) return { ok: false, msg: 'Transaksi tidak ditemukan' };

    antrean.jumlah_percobaan += 1;

    const resp = forceBankResponse || this.callBankService(trx.nominal);

    if (resp === 'berhasil') {
      // Berhasil
      Storage.updateSaldo(-trx.nominal);
      Storage.updateItem('transaksi', 'id_transaksi', trx.id_transaksi, {
        status_transaksi: 'Berhasil'
      });
      Storage.updateItem('antrean_transaksi', 'id_antrean', idAntrean, {
        jumlah_percobaan: antrean.jumlah_percobaan,
        status_antrean: 'Selesai'
      });

      const msg = `Berhasil pada percobaan ke-${antrean.jumlah_percobaan} dari antrean`;
      Security.addNotif(`Transaksi ${trx.id_transaksi} berhasil diproses dari antrean.`, trx.id_transaksi);
      return { ok: true, status: 'Berhasil', msg: msg, percobaan: antrean.jumlah_percobaan };
    }

    // Still disruption or failure
    if (antrean.jumlah_percobaan >= 5) {
      // Reached max retries (5x) -> Status Gagal
      Storage.updateItem('transaksi', 'id_transaksi', trx.id_transaksi, {
        status_transaksi: 'Gagal'
      });
      Storage.updateItem('antrean_transaksi', 'id_antrean', idAntrean, {
        jumlah_percobaan: antrean.jumlah_percobaan,
        status_antrean: 'Habis'
      });

      const msg = 'Gagal setelah 5 percobaan; saldo tidak terdebet; notifikasi dikirim';
      Security.addNotif(`Transaksi ${trx.id_transaksi} Gagal setelah 5 kali percobaan. Saldo Anda tidak terdebet.`, trx.id_transaksi);
      return { ok: false, status: 'Gagal', msg: msg, percobaan: antrean.jumlah_percobaan };
    } else {
      // Still in queue
      const nextTry = new Date();
      nextTry.setMinutes(nextTry.getMinutes() + 15 * antrean.jumlah_percobaan);
      Storage.updateItem('antrean_transaksi', 'id_antrean', idAntrean, {
        jumlah_percobaan: antrean.jumlah_percobaan,
        percobaan_berikutnya: nextTry.toISOString(),
        status_antrean: 'Menunggu'
      });

      const msg = `Percobaan ke-${antrean.jumlah_percobaan} gagal; tetap di antrean`;
      return { ok: true, status: 'Tertunda', msg: msg, percobaan: antrean.jumlah_percobaan };
    }
  },

  /**
   * Cancel a pending transaction by user
   */
  cancelPendingTransaction(idTransaksi) {
    const trxList = Storage.get('transaksi') || [];
    const trx = trxList.find(t => t.id_transaksi === idTransaksi);
    if (!trx) return { ok: false, msg: 'Transaksi tidak ditemukan' };

    if (trx.status_transaksi !== 'Tertunda') {
      return { ok: false, msg: 'Hanya transaksi tertunda yang dapat dibatalkan' };
    }

    Storage.updateItem('transaksi', 'id_transaksi', idTransaksi, { status_transaksi: 'Gagal' });

    // Cancel related queue
    const queueList = Storage.get('antrean_transaksi') || [];
    const q = queueList.find(a => a.id_transaksi === idTransaksi && a.status_antrean === 'Menunggu');
    if (q) {
      Storage.updateItem('antrean_transaksi', 'id_antrean', q.id_antrean, { status_antrean: 'Habis' });
    }

    Security.addNotif(`Transaksi ${idTransaksi} dibatalkan oleh pengguna.`, idTransaksi);
    return { ok: true, msg: 'Transaksi tertunda berhasil dibatalkan' };
  }
};
