/* ======================================================
   Livin' Smart Assist — Navigation Module (js/navigation.js)
   Implements DFD Process 4.0 — Navigasi Sederhana
   Subprocesses:
   - 4.1 Pencarian Fitur
   - 4.2 Pengelolaan Penerima Favorit
   - 4.3 Pengaturan Mode Sederhana
   ====================================================== */

const Navigation = {
  /**
   * 4.1 Pencarian Fitur
   * Searches within FITUR_MENU by keyword
   * Corresponds to Test Scenarios:
   * - U23: kata kunci = "listrik" -> 3 fitur ditemukan
   * - U24: kata kunci = "xyz123" -> "Fitur tidak ditemukan"
   * - U25: kata kunci = "" -> "Masukkan kata kunci pencarian"
   */
  searchFeatures(query) {
    if (!query || String(query).trim() === '') {
      return {
        ok: false,
        msg: 'Masukkan kata kunci pencarian',
        results: []
      };
    }

    const q = String(query).trim().toLowerCase();
    const menuList = Storage.get('fitur_menu') || [];

    const results = menuList.filter(item => {
      const matchName = item.nama_fitur.toLowerCase().includes(q);
      const matchKey = item.kata_kunci.toLowerCase().includes(q);
      const matchCat = item.kategori.toLowerCase().includes(q);
      return matchName || matchKey || matchCat;
    });

    if (results.length === 0) {
      return {
        ok: true,
        count: 0,
        msg: 'Fitur tidak ditemukan',
        results: []
      };
    }

    return {
      ok: true,
      count: results.length,
      msg: `${results.length} fitur ditemukan`,
      results: results
    };
  },

  /**
   * 4.2 Pengelolaan Penerima Favorit
   * Add favorite recipient with duplicate check
   * - U26: Add new -> "Penerima favorit tersimpan"
   * - U27: Duplicate check -> "Penerima sudah ada di daftar favorit"
   */
  addFavorite(nama, tujuan, jenis = 'Transfer') {
    if (!nama || String(nama).trim() === '') {
      return { ok: false, msg: 'Nama penerima wajib diisi' };
    }
    if (!tujuan || String(tujuan).trim() === '') {
      return { ok: false, msg: 'Tujuan penerima wajib diisi' };
    }

    const cleanNama = String(nama).trim();
    const cleanTujuan = String(tujuan).trim();
    const digitsOnly = cleanTujuan.replace(/[^0-9]/g, '');

    const favorites = Storage.get('penerima_favorit') || [];

    // Check duplicate by name or destination (including masked digit match)
    const exists = favorites.some(f => {
      const fName = f.nama_penerima.toLowerCase();
      const fTujuan = f.tujuan.toLowerCase();
      const fDigits = f.tujuan.replace(/[^0-9]/g, '');

      const matchName = (fName === cleanNama.toLowerCase());
      const matchTujuan = (fTujuan === cleanTujuan.toLowerCase());
      const matchDigits = (digitsOnly.length >= 4 && fDigits.length >= 4 && (fDigits.endsWith(digitsOnly) || digitsOnly.endsWith(fDigits)));

      return matchName || matchTujuan || matchDigits;
    });

    if (exists) {
      return {
        ok: false,
        isDuplicate: true,
        msg: 'Penerima sudah ada di daftar favorit'
      };
    }

    const newFav = {
      id_favorit: genFavoritId(),
      id_nasabah: 'N001',
      nama_penerima: cleanNama,
      tujuan: cleanTujuan,
      jenis: jenis
    };

    Storage.addItem('penerima_favorit', newFav);
    return {
      ok: true,
      msg: 'Penerima favorit tersimpan',
      favorit: newFav
    };
  },

  /**
   * Remove favorite
   */
  removeFavorite(idFavorit) {
    Storage.removeItem('penerima_favorit', 'id_favorit', idFavorit);
    return { ok: true, msg: 'Penerima favorit berhasil dihapus' };
  },

  /**
   * Get all favorites
   */
  getFavorites() {
    return Storage.get('penerima_favorit') || [];
  },

  /**
   * 4.3 Pengaturan Mode Tampilan (Normal vs Sederhana)
   * - U28: Aktifkan Mode Sederhana -> 4 Menu inti (Transfer, Top Up, Bayar, Pantau)
   * - U29: Nonaktifkan Mode Sederhana -> 8 Menu lengkap
   */
  setMode(mode) {
    const validMode = mode === 'sederhana' ? 'sederhana' : 'normal';
    const nasabah = Storage.getNasabah();
    nasabah.mode_tampilan = validMode;
    Storage.setNasabah(nasabah);

    if (validMode === 'sederhana') {
      return {
        ok: true,
        mode: 'sederhana',
        menuCount: 4,
        menus: ['Transfer', 'Top Up', 'Bayar', 'Pantau'],
        msg: 'Menampilkan 4 Menu inti: Transfer, Top up, Bayar, Pantau'
      };
    } else {
      return {
        ok: true,
        mode: 'normal',
        menuCount: 8,
        menus: ['Transfer', 'Top Up', 'Bayar', 'Otomatis', 'Pantau', 'Keamanan', 'QRIS', 'Mode'],
        msg: 'Menampilkan 8 Menu lengkap'
      };
    }
  },

  getMode() {
    const nasabah = Storage.getNasabah();
    return (nasabah && nasabah.mode_tampilan) || 'normal';
  }
};
