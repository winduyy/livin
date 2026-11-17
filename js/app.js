/* ======================================================
   Livin' Smart Assist — Main Application Controller (js/app.js)
   Renders 10 Views according to Table 4.9 & manages interactions:
   1. Beranda
   2. Mode Sederhana
   3. Pencarian Fitur
   4. Penerima Favorit
   5. Transaksi Otomatis
   6. Buat Jadwal
   7. Pantau Transaksi
   8. Detail Transaksi
   9. Pusat Keamanan
   10. Log Peringatan
   ====================================================== */

// Helper functions for relative dates
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelativeDateTime(offsetDays, hours = 8, minutes = 15) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${year}-${month}-${day}T${hh}:${mm}:00`;
}

const App = {
  currentView: 'beranda',
  selectedTrxId: null,
  activeScheduleTab: 'Aktif',
  activeTrxFilter: 'Semua',
  pendingFingerprintResolve: null,
  selectedDuration: 1,

  init() {
    Storage.init();
    this.seedInitialSampleData();
    this.startClock();
    this.bindGlobalEvents();
    this.setupPWAInstallUI();
    this.renderCurrentView();

    if (Storage.isUsingMemoryFallback) {
      setTimeout(() => {
        this.showToast('Penyimpanan privat terdeteksi: data tersimpan di memori sesi');
      }, 1200);
    }
  },

  /**
   * Real-time status bar clock (HH.mm)
   * Ticks every second based on user device time.
   */
  startClock() {
    const update = () => {
      const clockEl = document.getElementById('status-bar-clock');
      if (clockEl) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = `${hh}.${mm}`;
      }
    };
    update();
    setInterval(update, 1000);
  },

  /**
   * Seed realistic sample data matching Figures 5.1–5.7
   * All dates are calculated relative to current device date.
   */
  seedInitialSampleData() {
    const schedules = Storage.get('jadwal_transaksi') || [];
    if (schedules.length === 0) {
      const initialSchedules = [
        {
          id_jadwal: 'J001',
          id_nasabah: 'N001',
          jenis_transaksi: 'Transfer',
          tujuan: 'Ibu Kos',
          nominal: 900000,
          frekuensi: 'Bulanan',
          tanggal_berikutnya: getRelativeDate(15),
          saldo_minimum: 100000,
          status_jadwal: 'Aktif'
        },
        {
          id_jadwal: 'J002',
          id_nasabah: 'N001',
          jenis_transaksi: 'Top up',
          tujuan: 'Dompet Digital Saya',
          nominal: 100000,
          frekuensi: 'Mingguan',
          tanggal_berikutnya: getRelativeDate(3),
          saldo_minimum: 50000,
          status_jadwal: 'Aktif'
        },
        {
          id_jadwal: 'J003',
          id_nasabah: 'N001',
          jenis_transaksi: 'Tagihan',
          tujuan: 'Cicilan Motor',
          nominal: 650000,
          frekuensi: 'Bulanan',
          tanggal_berikutnya: getRelativeDate(10),
          saldo_minimum: 200000,
          status_jadwal: 'Aktif'
        }
      ];
      Storage.set('jadwal_transaksi', initialSchedules);
    }

    const trxs = Storage.get('transaksi') || [];
    if (trxs.length === 0) {
      const initialTrx = [
        {
          id_transaksi: 'TRX-' + getTodayDateString().replace(/-/g, '') + '-0042',
          id_nasabah: 'N001',
          id_jadwal: 'J002',
          jenis_transaksi: 'Top up',
          tujuan: 'Dompet Digital Saya',
          nominal: 100000,
          waktu: getRelativeDateTime(0, 8, 15),
          status_transaksi: 'Tertunda'
        },
        {
          id_transaksi: 'TRX-' + getRelativeDate(-3).replace(/-/g, '') + '-0005',
          id_nasabah: 'N001',
          id_jadwal: 'J001',
          jenis_transaksi: 'Transfer',
          tujuan: 'Ibu Kos',
          nominal: 900000,
          waktu: getRelativeDateTime(-3, 10, 5),
          status_transaksi: 'Berhasil'
        },
        {
          id_transaksi: 'TRX-' + getRelativeDate(-7).replace(/-/g, '') + '-1940',
          id_nasabah: 'N001',
          id_jadwal: null,
          jenis_transaksi: 'Tagihan',
          tujuan: 'Bayar Tagihan Listrik',
          nominal: 312500,
          waktu: getRelativeDateTime(-7, 19, 40),
          status_transaksi: 'Gagal'
        },
        {
          id_transaksi: 'TRX-' + getRelativeDate(-12).replace(/-/g, '') + '-0005',
          id_nasabah: 'N001',
          id_jadwal: 'J003',
          jenis_transaksi: 'Tagihan',
          tujuan: 'Cicilan Motor',
          nominal: 650000,
          waktu: getRelativeDateTime(-12, 14, 20),
          status_transaksi: 'Berhasil'
        }
      ];
      Storage.set('transaksi', initialTrx);

      // Antrean for the pending transaction
      const initialQueue = [
        {
          id_antrean: 'A001',
          id_transaksi: initialTrx[0].id_transaksi,
          jumlah_percobaan: 2,
          percobaan_berikutnya: getRelativeDateTime(0, 8, 30),
          status_antrean: 'Menunggu'
        }
      ];
      Storage.set('antrean_transaksi', initialQueue);

      // Initial security logs
      const initialLogs = [
        {
          id_log: 'L001',
          id_nasabah: 'N001',
          id_transaksi: null,
          jenis_peringatan: 'Melebihi limit harian',
          pesan: 'Ditolak: melebihi limit harian Rp 5.000.000',
          waktu: getRelativeDateTime(0, 9, 2)
        },
        {
          id_log: 'L002',
          id_nasabah: 'N001',
          id_transaksi: null,
          jenis_peringatan: 'Verifikasi sidik jari diminta',
          pesan: 'Nominal Rp 1.500.000 melebihi ambang Rp 1.000.000 (Terverifikasi)',
          waktu: getRelativeDateTime(0, 8, 47)
        },
        {
          id_log: 'L003',
          id_nasabah: 'N001',
          id_transaksi: null,
          jenis_peringatan: 'Kunci sementara diaktifkan',
          pesan: 'Transaksi keluar diblokir sementara',
          waktu: getRelativeDateTime(-1, 21, 10)
        }
      ];
      Storage.set('log_peringatan', initialLogs);
    }
  },

  /**
   * Reset simulation data to initial seed
   */
  resetSimulationData() {
    Storage.reset();
    this.seedInitialSampleData();
    this.renderCurrentView();
    alert('Data simulasi berhasil di-reset ke nilai awal.');
  },

  setBankSimulationMode(mode) {
    Transaction.setBankServiceMode(mode);
    alert(`Mode Layanan Bank diubah ke: ${mode}`);
  },

  /**
   * Navigate between 10 views
   */
  navigateTo(viewId, param = null) {
    this.currentView = viewId;
    if (param) {
      if (viewId === 'detail-transaksi') this.selectedTrxId = param;
    }

    // Update bottom nav highlights
    document.querySelectorAll('.nav-item-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.target === viewId) {
        btn.classList.add('active');
      }
    });

    // Check if in mode sederhana
    const mode = Navigation.getMode();
    if (mode === 'sederhana' && viewId === 'beranda') {
      this.currentView = 'mode-sederhana';
    }

    this.renderCurrentView();
  },

  /**
   * Main render router
   */
  renderCurrentView() {
    // Hide all pages
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));

    const pageElem = document.getElementById(`view-${this.currentView}`);
    if (pageElem) {
      pageElem.classList.add('active');
    }

    // Scroll container to top
    const screen = document.getElementById('screen-scroll-container');
    if (screen) screen.scrollTop = 0;

    // Trigger specific view renderer
    switch (this.currentView) {
      case 'beranda':
        this.renderBeranda();
        break;
      case 'mode-sederhana':
        this.renderModeSederhana();
        break;
      case 'pencarian-fitur':
        this.renderPencarianFitur();
        break;
      case 'penerima-favorit':
        this.renderPenerimaFavorit();
        break;
      case 'transaksi-otomatis':
        this.renderTransaksiOtomatis();
        break;
      case 'buat-jadwal':
        this.renderBuatJadwal();
        break;
      case 'pantau-transaksi':
        this.renderPantauTransaksi();
        break;
      case 'detail-transaksi':
        this.renderDetailTransaksi();
        break;
      case 'pusat-keamanan':
        this.renderPusatKeamanan();
        break;
      case 'log-peringatan':
        this.renderLogPeringatan();
        break;
    }
  },

  /* ====================================================
     VIEW 1: BERANDA (Wireframe Gambar 4.11 Kiri)
     ==================================================== */
  renderBeranda() {
    const nasabah = Storage.getNasabah();
    const saldoFormatted = 'Rp ' + Number(nasabah.saldo).toLocaleString('id-ID');
    
    // Header greeting text: Halo, Nasabah Simulasi · Saldo Rp 2.450.000
    const greetingEl = document.getElementById('home-greeting-text');
    if (greetingEl) {
      greetingEl.innerHTML = `Halo, ${nasabah.nama_nasabah} &middot; Saldo <strong>${saldoFormatted}</strong>`;
    }

    // Render favorites row: Ibu Kos, Cicilan, Adik, + Tambah
    const favorites = Storage.get('penerima_favorit') || [];
    const favRow = document.getElementById('home-favorites-row');
    if (favRow) {
      // Find Ibu Kos, Cicilan Motor, Adik
      const ibuKos = favorites.find(f => f.nama_penerima.toLowerCase().includes('ibu kos')) || { id_favorit: 'F001', nama_penerima: 'Ibu Kos', jenis: 'Transfer' };
      const cicilan = favorites.find(f => f.nama_penerima.toLowerCase().includes('cicilan')) || { id_favorit: 'F002', nama_penerima: 'Cicilan Motor', jenis: 'Pembayaran' };
      const adik = favorites.find(f => f.nama_penerima.toLowerCase().includes('adik')) || { id_favorit: 'F003', nama_penerima: 'Adik', jenis: 'Transfer' };

      favRow.innerHTML = `
        <div class="fav-item-col" onclick="App.quickUseFavorite('${ibuKos.id_favorit}')">
          <div class="fav-avatar"><i class="fas fa-user"></i></div>
          <div class="fav-name">Ibu Kos</div>
        </div>
        <div class="fav-item-col" onclick="App.quickUseFavorite('${cicilan.id_favorit}')">
          <div class="fav-avatar"><i class="fas fa-file-invoice-dollar"></i></div>
          <div class="fav-name">Cicilan</div>
        </div>
        <div class="fav-item-col" onclick="App.quickUseFavorite('${adik.id_favorit}')">
          <div class="fav-avatar"><i class="fas fa-user"></i></div>
          <div class="fav-name">Adik</div>
        </div>
        <div class="fav-item-col" onclick="App.navigateTo('penerima-favorit')">
          <div class="fav-avatar fav-add"><i class="fas fa-plus"></i></div>
          <div class="fav-name">Tambah</div>
        </div>
      `;
    }
  },

  /* ====================================================
     VIEW 2: MODE SEDERHANA (Gambar 5.1 Kanan)
     ==================================================== */
  renderModeSederhana() {
    const switchToggle = document.getElementById('mode-sederhana-switch');
    if (switchToggle) {
      switchToggle.checked = (Navigation.getMode() === 'sederhana');
    }
  },

  toggleSimpleMode(checked) {
    Navigation.setMode(checked ? 'sederhana' : 'normal');
    if (!checked) {
      this.navigateTo('beranda');
    } else {
      this.navigateTo('mode-sederhana');
    }
  },

  /* ====================================================
     VIEW 3: PENCARIAN FITUR (Gambar 5.2 Kiri)
     ==================================================== */
  renderPencarianFitur() {
    const searchInput = document.getElementById('feature-search-input');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    this.executeFeatureSearch('');
  },

  executeFeatureSearch(query) {
    const container = document.getElementById('feature-search-results');
    const msgBox = document.getElementById('feature-search-msg');

    if (!query || query.trim() === '') {
      msgBox.textContent = 'Masukkan kata kunci pencarian (mis. "listrik", "transfer", "top up")';
      msgBox.style.display = 'block';
      container.innerHTML = '';
      return;
    }

    const res = Navigation.searchFeatures(query);
    if (!res.ok) {
      msgBox.textContent = res.msg;
      msgBox.style.display = 'block';
      container.innerHTML = '';
      return;
    }

    if (res.count === 0) {
      msgBox.textContent = 'Fitur tidak ditemukan';
      msgBox.style.display = 'block';
      container.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color: #94a3b8;">
          <i class="fas fa-search" style="font-size: 38px; margin-bottom: 12px; opacity: 0.5;"></i>
          <p style="font-size: 13px;">Tidak ada fitur yang cocok dengan kata kunci "<strong>${query}</strong>"</p>
        </div>
      `;
      return;
    }

    msgBox.textContent = `${res.count} fitur ditemukan`;
    msgBox.style.display = 'block';

    container.innerHTML = res.results.map(f => `
      <div class="card card-clickable" onclick="App.handleFeatureClick('${f.id_fitur}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${f.nama_fitur}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${f.kategori} &bull; Kata kunci: ${f.kata_kunci}</div>
          </div>
          <i class="fas fa-chevron-right" style="color: #cbd5e1; font-size: 13px;"></i>
        </div>
      </div>
    `).join('');
  },

  handleFeatureClick(idFitur) {
    if (idFitur === 'FM14' || idFitur === 'FM15' || idFitur === 'FM16') {
      this.navigateTo('buat-jadwal');
    } else if (idFitur === 'FM17') {
      this.navigateTo('pantau-transaksi');
    } else if (idFitur === 'FM18') {
      this.navigateTo('pusat-keamanan');
    } else if (idFitur === 'FM19') {
      this.toggleSimpleMode(true);
    } else if (idFitur === 'FM20') {
      this.navigateTo('penerima-favorit');
    } else {
      this.navigateTo('buat-jadwal');
    }
  },

  /* ====================================================
     VIEW 4: PENERIMA FAVORIT (Gambar 5.2 Kanan)
     ==================================================== */
  renderPenerimaFavorit() {
    const list = Storage.get('penerima_favorit') || [];
    const container = document.getElementById('favorit-list-container');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <p>Belum ada penerima favorit tersimpan.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(f => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${f.nama_penerima}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              Rek. <strong>${f.tujuan}</strong> &bull; ${f.jenis}
            </div>
          </div>
          <div style="display:flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="App.quickUseFavorite('${f.id_favorit}')">Pakai</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteFavoriteAction('${f.id_favorit}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('');
  },

  quickUseFavorite(idFavorit) {
    const list = Storage.get('penerima_favorit') || [];
    const item = list.find(f => f.id_favorit === idFavorit);
    if (!item) return;

    this.navigateTo('buat-jadwal');
    setTimeout(() => {
      document.getElementById('jadwal-input-tujuan').value = `${item.nama_penerima} (${item.tujuan})`;
      if (item.jenis) {
        let matchingJenis = 'Transfer';
        if (item.jenis.toLowerCase().includes('top')) matchingJenis = 'Top up';
        else if (item.jenis.toLowerCase().includes('bayar') || item.jenis.toLowerCase().includes('tagih')) matchingJenis = 'Tagihan';
        document.getElementById('jadwal-input-jenis').value = matchingJenis;
      }
    }, 50);
  },

  deleteFavoriteAction(idFavorit) {
    if (confirm('Hapus penerima favorit ini?')) {
      Navigation.removeFavorite(idFavorit);
      this.renderPenerimaFavorit();
      this.renderBeranda();
    }
  },

  saveNewFavoriteFromModal() {
    const nama = document.getElementById('fav-modal-nama').value;
    const tujuan = document.getElementById('fav-modal-tujuan').value;
    const jenis = document.getElementById('fav-modal-jenis').value;

    const res = Navigation.addFavorite(nama, tujuan, jenis);
    if (!res.ok) {
      alert(res.msg);
      return;
    }

    this.closeModal('modal-tambah-favorit');
    document.getElementById('fav-modal-nama').value = '';
    document.getElementById('fav-modal-tujuan').value = '';
    this.renderPenerimaFavorit();
    this.renderBeranda();
    alert('Penerima favorit berhasil disimpan.');
  },

  /* ====================================================
     VIEW 5: TRANSAKSI OTOMATIS (Gambar 4.11 & 5.3 Kiri)
     ==================================================== */
  renderTransaksiOtomatis() {
    const schedules = Storage.get('jadwal_transaksi') || [];
    const container = document.getElementById('jadwal-list-container');
    if (!container) return;

    let filtered = schedules;
    if (this.activeScheduleTab === 'Aktif') {
      filtered = schedules.filter(s => s.status_jadwal === 'Aktif');
    } else if (this.activeScheduleTab === 'Dijeda') {
      filtered = schedules.filter(s => s.status_jadwal === 'Dijeda');
    }

    // Update tab counts
    const countAktif = schedules.filter(s => s.status_jadwal === 'Aktif').length;
    const countDijeda = schedules.filter(s => s.status_jadwal === 'Dijeda').length;
    document.getElementById('tab-count-aktif').textContent = countAktif;
    document.getElementById('tab-count-dijeda').textContent = countDijeda;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <p>Tidak ada jadwal transaksi pada tab ini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(s => `
      <div class="card">
        <div class="jadwal-card-head">
          <div>
            <div style="font-size: 14px; font-weight: 700;">${s.jenis_transaksi} &bull; ${s.tujuan}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              Rp ${Number(s.nominal).toLocaleString('id-ID')} &bull; ${s.frekuensi}
            </div>
          </div>
          <span class="${s.status_jadwal === 'Aktif' ? 'jadwal-badge-aktif' : 'jadwal-badge-dijeda'}">
            ${s.status_jadwal}
          </span>
        </div>
        <div class="jadwal-info-grid">
          <div>Berikutnya: <strong>${s.tanggal_berikutnya}</strong></div>
          <div>Saldo minimum dilindungi: <strong>Rp ${Number(s.saldo_minimum).toLocaleString('id-ID')}</strong></div>
        </div>
        <div class="jadwal-actions">
          <button class="btn btn-gold btn-sm" onclick="App.triggerExecuteSchedule('${s.id_jadwal}')">
            <i class="fas fa-play"></i> Eksekusi Jadwal
          </button>
          <button class="btn btn-secondary btn-sm" onclick="App.toggleSchedule('${s.id_jadwal}')">
            ${s.status_jadwal === 'Aktif' ? 'Jeda' : 'Lanjutkan'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="App.deleteScheduleAction('${s.id_jadwal}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  },

  setScheduleTab(tabName) {
    this.activeScheduleTab = tabName;
    document.querySelectorAll('.jadwal-tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) btn.classList.add('active');
    });
    this.renderTransaksiOtomatis();
  },

  toggleSchedule(idJadwal) {
    Transaction.toggleScheduleStatus(idJadwal);
    this.renderTransaksiOtomatis();
  },

  deleteScheduleAction(idJadwal) {
    if (confirm('Hapus jadwal transaksi ini?')) {
      Transaction.deleteSchedule(idJadwal);
      this.renderTransaksiOtomatis();
    }
  },

  async triggerExecuteSchedule(idJadwal) {
    const schedules = Storage.get('jadwal_transaksi') || [];
    const item = schedules.find(s => s.id_jadwal === idJadwal);
    if (!item) return;

    const res = await Transaction.executeTransaction(item);

    if (res.step === 'saldo_minimum') {
      this.showSaldoMinWarning(res.checkResult, item);
      return;
    }

    if (res.step === 'security_check') {
      alert(res.checkResult.msg);
      return;
    }

    if (res.step === 'verification_failed') {
      alert('Transaksi Ditolak: Verifikasi Sidik Jari Gagal.');
      this.navigateTo('log-peringatan');
      return;
    }

    if (res.ok) {
      alert(`Transaksi ${res.status}: ${res.msg}`);
      this.navigateTo('pantau-transaksi');
    }
  },

  /* ====================================================
     VIEW 6: BUAT JADWAL (Gambar 5.3 Kanan)
     ==================================================== */
  renderBuatJadwal() {
    // Populate favorite picker
    const favs = Storage.get('penerima_favorit') || [];
    const picker = document.getElementById('jadwal-fav-picker');
    if (picker) {
      picker.innerHTML = '<option value="">-- Pilih dari Penerima Favorit --</option>' +
        favs.map(f => `<option value="${f.nama_penerima}">${f.nama_penerima} (${f.tujuan}) - ${f.jenis}</option>`).join('');
    }

    // Set default date to today
    const dateInput = document.getElementById('jadwal-input-tanggal');
    if (dateInput && !dateInput.value) {
      dateInput.value = getTodayDateString();
    }
  },

  onFavPickerChange(val) {
    if (!val) return;
    const favs = Storage.get('penerima_favorit') || [];
    const f = favs.find(item => item.nama_penerima === val);
    if (f) {
      document.getElementById('jadwal-input-tujuan').value = `${f.nama_penerima} (${f.tujuan})`;
      if (f.jenis) {
        let matchingJenis = 'Transfer';
        if (f.jenis.toLowerCase().includes('top')) matchingJenis = 'Top up';
        else if (f.jenis.toLowerCase().includes('bayar') || f.jenis.toLowerCase().includes('tagih')) matchingJenis = 'Tagihan';
        document.getElementById('jadwal-input-jenis').value = matchingJenis;
      }
    }
  },

  saveScheduleForm() {
    const jenis = document.getElementById('jadwal-input-jenis').value;
    const tujuan = document.getElementById('jadwal-input-tujuan').value;
    const nominal = document.getElementById('jadwal-input-nominal').value;
    const frekuensi = document.getElementById('jadwal-input-frekuensi').value;
    const tanggal_mulai = document.getElementById('jadwal-input-tanggal').value;
    const saldo_minimum = document.getElementById('jadwal-input-saldomin').value;

    const res = Transaction.createSchedule({
      jenis_transaksi: jenis,
      tujuan: tujuan,
      nominal: nominal,
      frekuensi: frekuensi,
      tanggal_mulai: tanggal_mulai,
      saldo_minimum: saldo_minimum
    });

    if (!res.ok) {
      alert(`Gagal: ${res.msg}`);
      return;
    }

    alert('Jadwal tersimpan dengan Status Aktif.');
    this.navigateTo('transaksi-otomatis');
  },

  /* ====================================================
     VIEW 7: PANTAU TRANSAKSI (Gambar 4.12 & 5.5 Kiri)
     ==================================================== */
  renderPantauTransaksi() {
    const list = Storage.get('transaksi') || [];
    const container = document.getElementById('pantau-trx-list');
    if (!container) return;

    let filtered = list;
    if (this.activeTrxFilter !== 'Semua') {
      filtered = list.filter(t => t.status_transaksi === this.activeTrxFilter);
    }

    // Update counts
    const countSemua = list.length;
    const countBerhasil = list.filter(t => t.status_transaksi === 'Berhasil').length;
    const countTertunda = list.filter(t => t.status_transaksi === 'Tertunda').length;
    const countGagal = list.filter(t => t.status_transaksi === 'Gagal').length;

    document.getElementById('tab-trx-semua').textContent = `Semua (${countSemua})`;
    document.getElementById('tab-trx-berhasil').textContent = `Berhasil (${countBerhasil})`;
    document.getElementById('tab-trx-tertunda').textContent = `Tertunda (${countTertunda})`;
    document.getElementById('tab-trx-gagal').textContent = `Gagal (${countGagal})`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <p>Tidak ada transaksi pada status ini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(t => {
      const statusClass = t.status_transaksi ? `status-${t.status_transaksi.toLowerCase()}` : '';
      const waktuFormatted = t.waktu ? t.waktu.replace('T', ' ').slice(0, 16) : '-';
      
      return `
        <div class="card card-clickable" onclick="App.navigateTo('detail-transaksi', '${t.id_transaksi}')">
          <div class="trx-row">
            <div class="trx-left">
              <div class="trx-title">${t.jenis_transaksi} &bull; ${t.tujuan}</div>
              <div class="trx-meta">${waktuFormatted}</div>
            </div>
            <div class="trx-right">
              <div class="trx-nominal">Rp ${Number(t.nominal).toLocaleString('id-ID')}</div>
              <span class="status-badge ${statusClass}">${t.status_transaksi}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  setTrxFilter(filterName) {
    this.activeTrxFilter = filterName;
    document.querySelectorAll('.trx-filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === filterName) btn.classList.add('active');
    });
    this.renderPantauTransaksi();
  },

  /* ====================================================
     VIEW 8: DETAIL TRANSAKSI (Gambar 5.5 Kanan)
     ==================================================== */
  renderDetailTransaksi() {
    const list = Storage.get('transaksi') || [];
    const t = list.find(item => item.id_transaksi === this.selectedTrxId);
    if (!t) {
      document.getElementById('detail-trx-content').innerHTML = '<p>Transaksi tidak ditemukan.</p>';
      return;
    }

    const queueList = Storage.get('antrean_transaksi') || [];
    const q = queueList.find(a => a.id_transaksi === t.id_transaksi);

    const statusClass = t.status_transaksi ? `status-${t.status_transaksi.toLowerCase()}` : '';

    let queueSection = '';
    if (t.status_transaksi === 'Tertunda' && q) {
      queueSection = `
        <div class="info-box warning" style="margin-top: 14px;">
          <i class="fas fa-info-circle"></i>
          <div>
            <strong>Saldo Anda belum terdebet.</strong><br>
            Transaksi diproses otomatis saat layanan pulih.
          </div>
        </div>

        <div class="card" style="margin-top: 10px;">
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Antrean Pemrosesan Ulang</div>
          <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
            <div>Percobaan ke: <strong>${q.jumlah_percobaan} dari 5</strong></div>
            <div>Waktu percobaan berikutnya: <strong>${q.percobaan_berikutnya ? q.percobaan_berikutnya.replace('T', ' ').slice(0, 16) : '-'}</strong></div>
            <div>Penyebab: <strong>Layanan bank terganggu</strong></div>
            <div>Status Antrean: <strong>${q.status_antrean}</strong></div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; margin-top: 14px;">
          <button class="btn btn-gold btn-block" onclick="App.retryQueueNow('${q.id_antrean}')">
            <i class="fas fa-sync-alt"></i> Simulasi Pemrosesan Ulang
          </button>
          <button class="btn btn-danger btn-block" onclick="App.cancelTrxAction('${t.id_transaksi}')">
            <i class="fas fa-times"></i> Batalkan Transaksi
          </button>
        </div>
      `;
    }

    document.getElementById('detail-trx-content').innerHTML = `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">ID: ${t.id_transaksi}</span>
          <span class="status-badge ${statusClass}">${t.status_transaksi}</span>
        </div>
        <div style="font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 12px;">
          Rp ${Number(t.nominal).toLocaleString('id-ID')}
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.8; border-top: 1px solid var(--border-light); padding-top: 10px;">
          <div>Jenis Transaksi: <strong>${t.jenis_transaksi}</strong></div>
          <div>Tujuan / Penerima: <strong>${t.tujuan}</strong></div>
          <div>Waktu Transaksi: <strong>${t.waktu ? t.waktu.replace('T', ' ').slice(0, 19) : '-'}</strong></div>
          <div>ID Jadwal: <strong>${t.id_jadwal || '- (Transaksi Manual)'}</strong></div>
        </div>
      </div>
      ${queueSection}
    `;
  },

  retryQueueNow(idAntrean) {
    const res = Transaction.processRetryQueue(idAntrean, 'berhasil');
    alert(res.msg);
    this.renderDetailTransaksi();
    this.renderPantauTransaksi();
  },

  cancelTrxAction(idTransaksi) {
    if (confirm('Batalkan transaksi tertunda ini?')) {
      const res = Transaction.cancelPendingTransaction(idTransaksi);
      alert(res.msg);
      this.renderDetailTransaksi();
      this.renderPantauTransaksi();
    }
  },

  /* ====================================================
     VIEW 9: PUSAT KEAMANAN (Gambar 4.12 & 5.6)
     ==================================================== */
  renderPusatKeamanan() {
    const k = Storage.getKeamanan();
    const isLocked = Security.isLocked();

    document.getElementById('sec-limit-harian').textContent = `Rp ${Number(k.limit_harian).toLocaleString('id-ID')}`;
    const usedToday = Storage.getTotalHariIni();
    document.getElementById('sec-used-today').textContent = `Terpakai hari ini Rp ${usedToday.toLocaleString('id-ID')}`;

    document.getElementById('sec-ambang-verif').textContent = `Rp ${Number(k.ambang_verifikasi).toLocaleString('id-ID')}`;

    // Lock switch & Banner
    const lockSwitch = document.getElementById('sec-lock-switch');
    if (lockSwitch) lockSwitch.checked = isLocked;

    const lockBanner = document.getElementById('sec-lock-banner');
    if (lockBanner) {
      if (isLocked) {
        lockBanner.style.display = 'block';
        const untilStr = k.kunci_hingga ? new Date(k.kunci_hingga).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
        document.getElementById('sec-lock-info-text').textContent = `Aktif sampai ${untilStr}. Semua transfer dan pembayaran keluar diblokir.`;
      } else {
        lockBanner.style.display = 'none';
      }
    }

    // Log count
    const logs = Storage.get('log_peringatan') || [];
    document.getElementById('sec-log-count').textContent = `(${logs.length} catatan)`;

    // Sync bank simulation mode dropdown
    const bankSelect = document.getElementById('bank-simulation-select');
    if (bankSelect) {
      bankSelect.value = Transaction.bankServiceMode || 'auto';
    }

    // Update PWA install prompt / tip
    this.setupPWAInstallUI();
  },

  toggleLockSwitch(checked) {
    if (checked) {
      this.openModal('modal-pilih-durasi-kunci');
    } else {
      Security.deactivateLock();
      this.renderPusatKeamanan();
      alert('Kunci transaksi keluar dinonaktifkan.');
    }
  },

  confirmLockWithDuration() {
    Security.activateLock(this.selectedDuration);
    this.closeModal('modal-pilih-durasi-kunci');
    this.renderPusatKeamanan();
    alert(`Transaksi keluar dikunci selama ${this.selectedDuration} jam.`);
  },

  selectDuration(hours, elem) {
    this.selectedDuration = hours;
    document.querySelectorAll('.duration-pill').forEach(p => p.classList.remove('active'));
    elem.classList.add('active');
  },

  openEditLimitModal() {
    const k = Storage.getKeamanan();
    document.getElementById('modal-input-limit').value = k.limit_harian;
    document.getElementById('modal-input-ambang').value = k.ambang_verifikasi;
    this.openModal('modal-edit-limit');
  },

  saveEditLimitModal() {
    const limit = Number(document.getElementById('modal-input-limit').value);
    const ambang = Number(document.getElementById('modal-input-ambang').value);

    const res = Security.updateLimitAmbang(limit, ambang);
    if (!res.ok) {
      alert(`Gagal: ${res.msg}`);
      return;
    }

    this.closeModal('modal-edit-limit');
    this.renderPusatKeamanan();
    alert('Pengaturan keamanan tersimpan.');
  },

  /* ====================================================
     VIEW 10: LOG PERINGATAN (Gambar 5.7 Kiri)
     ==================================================== */
  renderLogPeringatan() {
    const logs = Storage.get('log_peringatan') || [];
    const container = document.getElementById('log-list-container');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color: #94a3b8;">
          <p>Belum ada catatan keamanan.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = logs.map(l => {
      const waktuStr = l.waktu ? l.waktu.replace('T', ' ').slice(0, 16) : '-';
      return `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
            <div style="font-size: 13px; font-weight: 700; color: #b91c1c;">
              <i class="fas fa-shield-alt"></i> ${l.jenis_peringatan}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">${waktuStr}</div>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
            ${l.pesan}
          </div>
          ${l.id_transaksi ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">ID Trx: ${l.id_transaksi}</div>` : ''}
        </div>
      `;
    }).join('');
  },

  /* ====================================================
     MODAL CONTROLLERS & FINGERPRINT SIMULATION
     ==================================================== */
  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('active');
  },

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  },

  showFingerprintModal(resolve) {
    this.pendingFingerprintResolve = resolve;
    this.openModal('modal-fingerprint');
  },

  resolveFingerprint(isSuccess) {
    this.closeModal('modal-fingerprint');
    if (this.pendingFingerprintResolve) {
      this.pendingFingerprintResolve(isSuccess);
      this.pendingFingerprintResolve = null;
    }
  },

  showSaldoMinWarning(checkResult, item) {
    const banner = document.getElementById('saldo-min-modal-text');
    if (banner) {
      banner.innerHTML = `Transaksi ditahan. Saldo setelah transaksi (Rp ${checkResult.saldoAfter.toLocaleString('id-ID')}) berada di bawah saldo minimum yang Anda lindungi (Rp ${checkResult.saldoMinimum.toLocaleString('id-ID')}).`;
    }
    this.openModal('modal-saldo-minimum');
  },

  /* ====================================================
     GLOBAL EVENT BINDINGS
     ==================================================== */
  bindGlobalEvents() {
    // Close modal on click outside modal-sheet
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          if (App.pendingFingerprintResolve) {
            App.pendingFingerprintResolve(false);
            App.pendingFingerprintResolve = null;
          }
        }
      });
    });
  },

  /* ====================================================
     PWA INSTALL PROMPT & NOTIFICATIONS
     ==================================================== */
  showToast(msg) {
    let toast = document.getElementById('livin-app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'livin-app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  },

  setupPWAInstallUI() {
    const container = document.getElementById('pwa-install-container');
    const btn = document.getElementById('pwa-install-btn');
    const iosTip = document.getElementById('pwa-ios-tip');
    if (!container) return;

    // Check if already running in standalone PWA mode
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || 
                         window.navigator.standalone === true;
    if (isStandalone) {
      container.style.display = 'none';
      return;
    }

    // Detect iOS (iPhone / iPad / iPod)
    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);

    if (isIOS) {
      container.style.display = 'block';
      if (iosTip) iosTip.style.display = 'block';
      if (btn) btn.style.display = 'none';
    } else if (window.deferredInstallPrompt) {
      container.style.display = 'block';
      if (btn) btn.style.display = 'block';
      if (iosTip) iosTip.style.display = 'none';
    } else {
      // Chrome Android or Desktop ready to trigger
      container.style.display = 'block';
      if (btn) btn.style.display = 'block';
      if (iosTip) iosTip.style.display = 'none';
    }
  },

  installPWA() {
    if (window.deferredInstallPrompt) {
      window.deferredInstallPrompt.prompt();
      window.deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] Pengguna menyetujui instalasi aplikasi');
        }
        window.deferredInstallPrompt = null;
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'none';
        const container = document.getElementById('pwa-install-container');
        if (container) container.style.display = 'none';
      });
    } else {
      this.showToast('Gunakan menu browser (⋮) lalu pilih "Install App" / "Tambahkan ke Layar Utama"');
    }
  }
};

// Global PWA Installation Listeners
window.deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
  if (typeof App !== 'undefined' && App.setupPWAInstallUI) {
    App.setupPWAInstallUI();
  }
});

window.addEventListener('appinstalled', () => {
  window.deferredInstallPrompt = null;
  const container = document.getElementById('pwa-install-container');
  if (container) container.style.display = 'none';
  if (typeof App !== 'undefined' && App.showToast) {
    App.showToast('Livin\' Smart Assist berhasil dipasang!');
  }
});

// Initialize App on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
