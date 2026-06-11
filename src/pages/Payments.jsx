import { useEffect, useState } from 'react';
import { db } from '../db';
import { Plus, Search, CreditCard, X, Trash2, Pencil } from 'lucide-react';

const PAYMENT_MODES = ['Cash','GPay','PhonePe','Paytm','Bank Transfer','NEFT','Cheque','Credit (Udhaar)'];

function PaymentForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    date: new Date().toISOString().slice(0,10),
    type: 'payment_in', partyId: '', amount: '', paymentMode: 'Cash', notes: ''
  });
  const [allParties,   setAllParties]   = useState([]);
  const [partyQ,       setPartyQ]       = useState('');
  const [partyResults, setPartyResults] = useState([]);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    db.parties.orderBy('name').toArray().then(ps => {
      setAllParties(ps);
      if (initial?.partyId) {
        const p = ps.find(x=>x.id===initial.partyId);
        if (p) setPartyQ(p.name);
      }
    });
  }, []);

  useEffect(() => {
    if (!partyQ || form.partyId) { setPartyResults([]); return; }
    const q = partyQ.toLowerCase();
    setPartyResults(allParties.filter(p =>
      p.name.toLowerCase().includes(q) || (p.phone||'').includes(q)
    ).slice(0,6));
  }, [partyQ, allParties, form.partyId]);

  const selectParty = (p) => { set('partyId', p.id); setPartyQ(p.name); setPartyResults([]); };

  const save = () => {
    if (!form.amount || !form.partyId) { alert('Select party and enter amount'); return; }
    onSave({ ...form, amount: parseFloat(form.amount)||0 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {initial?.id ? 'Edit Payment' : 'Record Payment'}
          </h2>
          <button onClick={onCancel}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {/* Type toggle */}
          <div className="flex gap-2">
            {[['payment_in','Money In ↓ (Received)'],['payment_out','Money Out ↑ (Paid)']].map(([v,l])=>(
              <button key={v} onClick={()=>set('type',v)}
                className={`flex-1 py-2.5 rounded-xl font-medium border-2 text-xs transition-colors
                ${form.type===v?(v==='payment_in'?'bg-green-500 text-white border-green-500':'bg-red-500 text-white border-red-500'):'border-gray-200 text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Party autocomplete */}
          <div className="relative">
            <label className="text-xs text-gray-500 block mb-1">Party / Customer</label>
            <input value={partyQ}
              onChange={e=>{ setPartyQ(e.target.value); set('partyId',''); }}
              placeholder="Start typing name or phone..."
              className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:border-blue-400 text-sm"/>
            {partyResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-20 mt-1 overflow-hidden">
                {partyResults.map(p=>(
                  <button key={p.id} onClick={()=>selectParty(p)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between border-b last:border-0">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-400 text-xs">{p.phone} · <span className="capitalize">{p.type}</span></span>
                  </button>
                ))}
              </div>
            )}
            {form.partyId && <div className="mt-1 text-xs text-green-600">✓ {partyQ}</div>}
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Amount ₹</label>
            <input type="number" value={form.amount} onChange={e=>set('amount',e.target.value)}
              placeholder="0.00" className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:border-blue-400 text-lg font-semibold"/>
          </div>

          {/* Payment mode */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Payment Mode</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_MODES.map(m=>(
                <button key={m} onClick={()=>set('paymentMode',m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-colors
                  ${form.paymentMode===m?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-600'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Date</label>
            <input type="date" value={form.date} onChange={e=>set('date',e.target.value)}
              className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes (optional)</label>
            <input value={form.notes||''} onChange={e=>set('notes',e.target.value)}
              placeholder="e.g. Against invoice EVOLVE-25-001"
              className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:border-blue-400"/>
          </div>
        </div>
        <div className="p-5 pt-0 flex gap-3">
          <button onClick={save}
            className={`flex-1 py-3 rounded-xl font-bold text-white
            ${form.type==='payment_in'?'bg-green-500 hover:bg-green-600':'bg-red-500 hover:bg-red-600'}`}>
            {initial?.id ? 'Update Payment' : 'Save Payment'}
          </button>
          <button onClick={onCancel} className="px-5 py-3 border rounded-xl hover:bg-gray-50 text-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Payments() {
  const [txns,     setTxns]     = useState([]);
  const [q,        setQ]        = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTxn,  setEditTxn]  = useState(null);
  const [parties,  setParties]  = useState({});

  const load = async () => {
    const [all, ps] = await Promise.all([
      db.transactions.orderBy('id').reverse().toArray(),
      db.parties.toArray(),
    ]);
    setTxns(all);
    setParties(Object.fromEntries(ps.map(p=>[p.id, p.name])));
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    await db.transactions.add(form);
    setShowForm(false);
    load();
  };

  const update = async (form) => {
    const { id, ...data } = form;
    await db.transactions.update(id, data);
    setEditTxn(null);
    load();
  };

  const deleteTxn = async (id) => {
    if (!confirm('Delete this payment? This cannot be undone.')) return;
    await db.transactions.delete(id);
    load();
  };

  const totalIn  = txns.filter(t=>t.type==='payment_in').reduce((s,t)=>s+t.amount,0);
  const totalOut = txns.filter(t=>t.type==='payment_out').reduce((s,t)=>s+t.amount,0);

  const filtered = txns.filter(t => !q
    || parties[t.partyId]?.toLowerCase().includes(q.toLowerCase())
    || t.paymentMode?.toLowerCase().includes(q.toLowerCase()));

  const modeBreakdown = PAYMENT_MODES.map(m=>({
    mode:m,
    in:  txns.filter(t=>t.type==='payment_in'&&t.paymentMode===m).reduce((s,t)=>s+t.amount,0),
    out: txns.filter(t=>t.type==='payment_out'&&t.paymentMode===m).reduce((s,t)=>s+t.amount,0),
  })).filter(m=>m.in||m.out);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <button onClick={()=>setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm hover:bg-blue-700 font-medium">
          <Plus size={16}/> Record Payment
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
          <div className="text-xl font-bold text-green-700">₹{totalIn.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Received</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <div className="text-xl font-bold text-red-600">₹{totalOut.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Paid Out</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-center">
          <div className={`text-xl font-bold ${(totalIn-totalOut)>=0?'text-green-700':'text-red-600'}`}>
            ₹{Math.abs(totalIn-totalOut).toLocaleString('en-IN',{maximumFractionDigits:0})}
          </div>
          <div className="text-xs text-gray-500">Net</div>
        </div>
      </div>

      {modeBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">By Payment Mode</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {modeBreakdown.map(m=>(
              <div key={m.mode} className="bg-gray-50 rounded-xl p-2.5 text-xs">
                <div className="font-semibold text-gray-700 mb-1">{m.mode}</div>
                {m.in>0&&<div className="text-green-600">In: ₹{m.in.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>}
                {m.out>0&&<div className="text-red-500">Out: ₹{m.out.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by party or payment mode..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400"/>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {filtered.length===0 ? (
          <div className="text-center py-12 text-gray-400">
            <CreditCard size={48} className="mx-auto mb-3 opacity-30"/>
            <p>No payments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(t=>(
              <div key={t.id} className="px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                {/* Left: type badge + date */}
                <div className="flex-shrink-0 text-center w-14">
                  <div className={`text-xs px-1.5 py-0.5 rounded-full font-semibold mb-0.5
                    ${t.type==='payment_in'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                    {t.type==='payment_in'?'In':'Out'}
                  </div>
                  <div className="text-gray-400 text-xs">{t.date?.slice(5)}</div>
                </div>

                {/* Middle: party, mode, notes */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{parties[t.partyId]||'—'}</div>
                  <div className="text-gray-400 text-xs truncate">{t.paymentMode||'—'}{t.notes ? ` · ${t.notes}` : ''}</div>
                </div>

                {/* Right: amount + actions */}
                <div className="flex-shrink-0 text-right flex items-center gap-2">
                  <div className={`font-bold text-sm ${t.type==='payment_in'?'text-green-700':'text-red-600'}`}>
                    {t.type==='payment_in'?'+':'-'}₹{(t.amount||0).toLocaleString('en-IN')}
                  </div>
                  <button onClick={()=>setEditTxn({...t})}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 active:scale-90 transition-transform">
                    <Pencil size={14}/>
                  </button>
                  <button onClick={()=>deleteTxn(t.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 active:scale-90 transition-transform">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <PaymentForm onSave={save} onCancel={()=>setShowForm(false)}/>}
      {editTxn  && <PaymentForm initial={editTxn} onSave={update} onCancel={()=>setEditTxn(null)}/>}
    </div>
  );
}
