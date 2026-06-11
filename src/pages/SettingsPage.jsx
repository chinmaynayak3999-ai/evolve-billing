import { useEffect, useState } from 'react';
import { getSettings, setSetting, db } from '../db';
import { Save, Download, Upload, Trash2, Settings, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [form, setForm] = useState({ storeName:'', address:'', phone:'', gstin:'', bankDetails:'', invoicePrefix:'EVOLVE', logo:'' });
  const [saved,      setSaved]      = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [counts,     setCounts]     = useState({});

  useEffect(() => {
    getSettings().then(s => setForm(f => ({...f, ...s})));
    setLastBackup(localStorage.getItem('evolve_last_backup'));
    Promise.all([
      db.invoices.count(), db.parties.count(), db.products.count(),
      db.transactions.count(), db.expenses.count()
    ]).then(([inv,par,pro,txn,exp]) => setCounts({inv,par,pro,txn,exp}));
  }, []);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    await Promise.all(Object.entries(form).map(([k,v]) => setSetting(k,v)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportData = async () => {
    const [invoices, parties, products, txns, expenses, settings] = await Promise.all([
      db.invoices.toArray(), db.parties.toArray(), db.products.toArray(),
      db.transactions.toArray(), db.expenses.toArray(), db.settings.toArray()
    ]);
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      invoices, parties, products,
      transactions: txns, expenses, settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `evolve-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const now = new Date().toLocaleString('en-IN');
    localStorage.setItem('evolve_last_backup', now);
    setLastBackup(now);
    alert('✅ Backup downloaded! Save this file on Google Drive or WhatsApp it to yourself to keep it safe.');
  };

  const exportCSV = async () => {
    const invoices = await db.invoices.toArray();
    const rows = [['Invoice#','Date','Type','Party','Phone','Total','Status','Payment Mode']];
    invoices.forEach(i => rows.push([i.number,i.date,i.type,i.partyName||'',i.partyPhone||'',i.total||0,i.status||'',i.paymentMode||'']));
    const csv  = rows.map(r=>r.map(c=>`"${c||''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `evolve-invoices-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('This will MERGE backup data with existing data. Continue?')) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.invoices)     await db.invoices.bulkPut(data.invoices);
      if (data.parties)      await db.parties.bulkPut(data.parties);
      if (data.products)     await db.products.bulkPut(data.products);
      if (data.transactions) await db.transactions.bulkPut(data.transactions);
      if (data.expenses)     await db.expenses.bulkPut(data.expenses);
      if (data.settings)     await db.settings.bulkPut(data.settings);
      alert('✅ Data restored successfully! All your bills, parties, and products are back.');
      window.location.reload();
    } catch(err) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const clearAll = async () => {
    if (!confirm('⚠️ This will delete ALL data. Are you sure?')) return;
    if (!confirm('Final confirm: Delete everything including invoices, parties, products?')) return;
    await Promise.all([db.invoices.clear(), db.parties.clear(), db.products.clear(), db.transactions.clear(), db.expenses.clear()]);
    alert('All data cleared.');
    window.location.reload();
  };

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('logo', ev.target.result);
    reader.readAsDataURL(file);
  };

  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup)) / 86400000)
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Settings</h1>
      <p className="text-gray-400 text-xs mb-5">Store configuration & data management</p>

      {/* ── Data Safety Banner ─────────────────────────────── */}
      <div className={`rounded-2xl p-4 mb-5 border ${daysSinceBackup === null || daysSinceBackup > 3 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-start gap-3">
          {daysSinceBackup !== null && daysSinceBackup <= 3
            ? <ShieldCheck size={22} className="text-green-600 flex-shrink-0 mt-0.5"/>
            : <AlertTriangle size={22} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          }
          <div className="flex-1">
            <div className={`font-bold text-sm ${daysSinceBackup !== null && daysSinceBackup <= 3 ? 'text-green-700' : 'text-amber-700'}`}>
              {daysSinceBackup === null
                ? 'No backup taken yet — take one now!'
                : daysSinceBackup <= 3
                  ? `Last backup: ${lastBackup} ✓`
                  : `Last backup: ${lastBackup} — ${daysSinceBackup} days ago, take a new one!`
              }
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Your data is saved in <strong>this browser only</strong>. To use on another phone or not lose data — download a backup below and save it to <strong>Google Drive / WhatsApp Saved Messages</strong>.
            </div>
            <div className="text-xs text-gray-500 mt-1">
              To move to a new device: export backup → open site on new device → import that file.
            </div>
          </div>
        </div>
        {/* Quick counts */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {[
            ['🧾', counts.inv, 'Invoices'],
            ['🤝', counts.par, 'Parties'],
            ['📦', counts.pro, 'Products'],
            ['💳', counts.txn, 'Payments'],
          ].map(([em,n,label]) => (
            <div key={label} className="bg-white rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 border">
              {em} {n ?? 0} {label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Store Info */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Settings size={15}/> Store Information</h2>
          <div className="space-y-3 text-sm">
            {[
              ['storeName','Store Name','text'],
              ['phone','Phone Number','text'],
              ['invoicePrefix','Invoice Prefix (e.g. EVOLVE)','text'],
            ].map(([k,label,type])=>(
              <div key={k}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input type={type} value={form[k]||''} onChange={e=>set(k,e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Address</label>
              <textarea value={form.address||''} onChange={e=>set('address',e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Bank Details (on invoices)</label>
              <textarea value={form.bankDetails||''} onChange={e=>set('bankDetails',e.target.value)} rows={3}
                placeholder="Bank: ..., Account: ..., IFSC: ..., UPI: ..."
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Store Logo</label>
              <input type="file" accept="image/*" onChange={handleLogo} className="text-xs"/>
              {form.logo && <img src={form.logo} alt="logo" className="mt-2 h-14 object-contain rounded border"/>}
            </div>
          </div>
          <button onClick={save}
            className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
            <Save size={15}/>{saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>

        {/* Backup & Data */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <ShieldCheck size={15} className="text-green-600"/> Backup & Restore
            </h2>
            <div className="space-y-2">
              {/* Download backup */}
              <button onClick={exportData}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left active:scale-95 transition-all"
                style={{background:'#f0fdf4', border:'1.5px solid #bbf7d0'}}>
                <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Download size={16} className="text-white"/>
                </div>
                <div>
                  <div className="font-bold text-sm text-green-800">Download Backup</div>
                  <div className="text-xs text-green-600">Save all data as a file — do this daily!</div>
                </div>
              </button>

              {/* Restore */}
              <label className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left cursor-pointer active:scale-95 transition-all"
                style={{background:'#eff6ff', border:'1.5px solid #bfdbfe'}}>
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Upload size={16} className="text-white"/>
                </div>
                <div>
                  <div className="font-bold text-sm text-blue-800">{importing ? 'Restoring...' : 'Restore from Backup'}</div>
                  <div className="text-xs text-blue-600">Use on new phone / recover data</div>
                </div>
                <input type="file" accept=".json" onChange={importData} className="hidden"/>
              </label>

              {/* CSV export */}
              <button onClick={exportCSV}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left active:scale-95 transition-all"
                style={{background:'#fafafa', border:'1px solid #e5e7eb'}}>
                <div className="w-9 h-9 rounded-xl bg-gray-400 flex items-center justify-center flex-shrink-0">
                  <Download size={16} className="text-white"/>
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-700">Export Invoices (CSV)</div>
                  <div className="text-xs text-gray-400">Open in Excel / Google Sheets</div>
                </div>
              </button>
            </div>
          </div>

          {/* How to not lose data */}
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
            <div className="font-bold text-indigo-800 text-sm mb-2">📱 How to keep data safe</div>
            <ol className="text-xs text-indigo-700 space-y-1.5 list-decimal list-inside">
              <li>Go to <strong>Settings → Download Backup</strong> every day or after each bill</li>
              <li>Save the file to <strong>Google Drive</strong> or send to <strong>WhatsApp Saved Messages</strong></li>
              <li>On a new phone — open the site, go to Settings, tap <strong>Restore from Backup</strong></li>
              <li>Select the saved file — all your bills, parties, products will be restored</li>
            </ol>
          </div>

          {/* Danger */}
          <div className="bg-red-50 rounded-xl border border-red-100 p-4">
            <h2 className="text-sm font-bold text-red-700 mb-1 flex items-center gap-2"><Trash2 size={14}/> Danger Zone</h2>
            <p className="text-xs text-gray-500 mb-3">Download a backup before doing this!</p>
            <button onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 active:scale-95 transition-all">
              <Trash2 size={13}/> Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
