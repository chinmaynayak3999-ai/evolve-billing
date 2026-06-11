/**
 * cloudSync.js
 * Mirrors every Dexie write to Firestore so data is available on any device.
 * Pages don't need to change — this runs transparently in the background.
 */
import {
  doc, setDoc, deleteDoc, collection,
  getDocs, writeBatch
} from 'firebase/firestore';
import { db2 } from './firebase';

let _uid = null;   // set after Google sign-in

export function setCloudUid(uid) { _uid = uid; }
export function getCloudUid()    { return _uid; }

const TABLES = ['invoices','parties','products','transactions','expenses','settings'];

/* ── Write helpers ───────────────────────────────────── */
export async function cloudPut(table, id, data) {
  if (!_uid) return;
  try {
    await setDoc(
      doc(db2, `users/${_uid}/${table}/${id}`),
      { ...data, _id: id }
    );
  } catch(e) { console.warn('cloudPut failed', e); }
}

export async function cloudDelete(table, id) {
  if (!_uid) return;
  try {
    await deleteDoc(doc(db2, `users/${_uid}/${table}/${id}`));
  } catch(e) { console.warn('cloudDelete failed', e); }
}

/* ── Pull all data from Firestore → Dexie (on login / new device) ── */
export async function pullFromCloud(dexieDb) {
  if (!_uid) return;
  try {
    for (const table of TABLES) {
      const snap = await getDocs(collection(db2, `users/${_uid}/${table}`));
      if (snap.empty) continue;
      const rows = snap.docs.map(d => {
        const row = d.data();
        // restore numeric id from _id field
        if (row._id !== undefined) row.id = row._id;
        return row;
      });
      await dexieDb[table].bulkPut(rows);
    }
    console.log('✅ Data pulled from cloud');
  } catch(e) { console.warn('pullFromCloud failed', e); }
}

/* ── Push ALL local Dexie data to Firestore (first-time upload) ── */
export async function pushAllToCloud(dexieDb) {
  if (!_uid) return;
  try {
    for (const table of TABLES) {
      const rows = await dexieDb[table].toArray();
      if (!rows.length) continue;
      // batch writes (max 500 per batch)
      for (let i = 0; i < rows.length; i += 400) {
        const batch = writeBatch(db2);
        rows.slice(i, i + 400).forEach(row => {
          const id = String(row.id ?? row.key ?? Date.now());
          batch.set(
            doc(db2, `users/${_uid}/${table}/${id}`),
            { ...row, _id: row.id ?? row.key }
          );
        });
        await batch.commit();
      }
    }
    console.log('✅ Local data pushed to cloud');
  } catch(e) { console.warn('pushAllToCloud failed', e); }
}
