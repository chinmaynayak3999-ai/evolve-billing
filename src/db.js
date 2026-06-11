import Dexie from 'dexie';
import { cloudPut, cloudDelete, getCloudUid } from './cloudSync';

export const db = new Dexie('EvolveDB');
db.version(1).stores({
  settings:    'key',
  products:    '++id, name, category, brand',
  parties:     '++id, name, type, phone',
  invoices:    '++id, number, type, date, partyId, status',
  transactions:'++id, date, type, partyId, invoiceId',
  expenses:    '++id, date, category',
  journal:     '++id, date',
});

/* ── Firestore sync hooks (transparent — no page code changes needed) ── */
const SYNC_TABLES = ['invoices','parties','products','transactions','expenses','settings'];

SYNC_TABLES.forEach(tableName => {
  db[tableName].hook('creating', function(primKey, obj) {
    this.onsuccess = (id) => {
      if (getCloudUid()) cloudPut(tableName, String(id ?? primKey), { ...obj, id: id ?? primKey });
    };
  });
  db[tableName].hook('updating', function(modifications, primKey, obj) {
    this.onsuccess = () => {
      if (getCloudUid()) cloudPut(tableName, String(primKey), { ...obj, ...modifications, id: primKey });
    };
  });
  db[tableName].hook('deleting', function(primKey) {
    this.onsuccess = () => {
      if (getCloudUid()) cloudDelete(tableName, String(primKey));
    };
  });
});

// ── Helpers ──────────────────────────────────────────────────────────
export const getSetting = async (key) => {
  const row = await db.settings.get(key);
  return row ? row.value : null;
};
export const setSetting = (key, value) => db.settings.put({ key, value });

export const getSettings = async () => {
  const all = await db.settings.toArray();
  return Object.fromEntries(all.map(r => [r.key, r.value]));
};

// ── Invoice number generator ─────────────────────────────────────────
export const nextInvoiceNumber = async (prefix = 'EVOLVE') => {
  const last = await db.invoices.orderBy('id').last();
  const n = last ? (parseInt(last.number?.split('-').pop()) || 0) + 1 : 1;
  const yr = new Date().getFullYear().toString().slice(2);
  return `${prefix}-${yr}-${String(n).padStart(3, '0')}`;
};

// ── Party balance (running) ──────────────────────────────────────────
export const partyBalance = async (partyId) => {
  const party = await db.parties.get(partyId);
  const opening = party?.openingBalance || 0;
  const txns = await db.transactions.where('partyId').equals(partyId).toArray();
  const net = txns.reduce((sum, t) => {
    if (t.type === 'sale' || t.type === 'debit_note') return sum + t.amount;
    if (t.type === 'purchase' || t.type === 'credit_note') return sum - t.amount;
    if (t.type === 'payment_in') return sum - t.amount;
    if (t.type === 'payment_out') return sum + t.amount;
    return sum;
  }, opening);
  return net;
};

// ── Stock auto-adjust ────────────────────────────────────────────────
export const adjustStock = async (items, direction = 1) => {
  for (const item of items) {
    const prod = await db.products.get(item.productId);
    if (prod) {
      await db.products.update(item.productId, {
        stock: Math.max(0, (prod.stock || 0) + direction * item.qty)
      });
    }
  }
};
