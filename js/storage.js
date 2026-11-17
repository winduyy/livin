/* ======================================================
   Livin' Smart Assist — Storage Layer (js/storage.js)
   Wraps LocalStorage with JSON serialisation.
   Maps to D1–D6 data stores from DFD.
   ====================================================== */

const STORAGE_KEY = 'livin_smart_assist';

const Storage = {
  _memoryStore: null,
  isUsingMemoryFallback: false,

  _isLocalStorageAvailable() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__livin_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },

  _load() {
    try {
      if (this._isLocalStorageAvailable()) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
        return null;
      }
    } catch (e) {
      console.warn('[Storage] LocalStorage read blocked or failed:', e);
      this.isUsingMemoryFallback = true;
    }

    // Fallback to memory store (e.g. Safari Private Browsing)
    this.isUsingMemoryFallback = true;
    return this._memoryStore ? JSON.parse(JSON.stringify(this._memoryStore)) : null;
  },

  _save(data) {
    let saved = false;
    try {
      if (this._isLocalStorageAvailable()) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        saved = true;
      }
    } catch (e) {
      console.warn('[Storage] LocalStorage write blocked or quota exceeded:', e);
      this.isUsingMemoryFallback = true;
    }

    if (!saved) {
      this.isUsingMemoryFallback = true;
      this._memoryStore = JSON.parse(JSON.stringify(data));
    }
  },

  /** Initialise storage from seed DATA if empty */
  init() {
    if (!this._load()) {
      this._save(JSON.parse(JSON.stringify(DATA)));
    }
  },

  /** Reset storage to seed DATA */
  reset() {
    this._save(JSON.parse(JSON.stringify(DATA)));
  },

  /** Get a top-level key from store */
  get(key) {
    const d = this._load();
    return d ? JSON.parse(JSON.stringify(d[key])) : null;
  },

  /** Set a top-level key */
  set(key, value) {
    const d = this._load();
    d[key] = value;
    this._save(d);
  },

  /** Get full data object */
  getAll() {
    return this._load();
  },

  /** Helper: get nasabah object */
  getNasabah() { return this.get('nasabah'); },

  /** Helper: update nasabah */
  setNasabah(n) { this.set('nasabah', n); },

  /** Helper: update saldo */
  updateSaldo(amount) {
    const n = this.getNasabah();
    n.saldo += amount;
    this.setNasabah(n);
  },

  /** Helper: get security settings */
  getKeamanan() { return this.get('pengaturan_keamanan'); },
  setKeamanan(k) { this.set('pengaturan_keamanan', k); },

  /** Add item to array store */
  addItem(key, item) {
    const arr = this.get(key) || [];
    arr.push(item);
    this.set(key, arr);
  },

  /** Update item in array store by primary key */
  updateItem(key, pkField, pkValue, updates) {
    const arr = this.get(key) || [];
    const idx = arr.findIndex(i => i[pkField] === pkValue);
    if (idx !== -1) {
      Object.assign(arr[idx], updates);
      this.set(key, arr);
      return true;
    }
    return false;
  },

  /** Remove item from array store */
  removeItem(key, pkField, pkValue) {
    let arr = this.get(key) || [];
    arr = arr.filter(i => i[pkField] !== pkValue);
    this.set(key, arr);
  },

  /** Get total spent today for daily limit check */
  getTotalHariIni() {
    const trx = this.get('transaksi') || [];
    const today = new Date().toISOString().slice(0, 10);
    return trx
      .filter(t => t.status_transaksi === 'Berhasil' && t.waktu && t.waktu.slice(0, 10) === today)
      .reduce((sum, t) => sum + t.nominal, 0);
  }
};
