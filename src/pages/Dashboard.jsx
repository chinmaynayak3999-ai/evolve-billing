import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { ChevronRight, Send, X, Calendar, ShieldAlert, Trash2 } from 'lucide-react';

const PAYMENT_MODES = ['Cash','GPay','PhonePe','Paytm','Bank Transfer','NEFT','Cheque'];

/* ── Receive Payment Modal ──────────────────────────────────────── */
function QuickPaymentModal({ onClose, onSave }) {
  const [allParties, setAllParties] = useState([]);
  const [partyQ, setPartyQ]         = useState('');
  const [results, setResults]       = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    type:'payment_in', partyId:'', amount:'', paymentMode:'Cash', notes:''
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  useEffect(()=>{ db.parties.orderBy('name').toArray().then(setAllParties); },[]);
  useEffect(()=>{
    if(!partyQ||form.partyId){ setResults([]); return; }
    const q=partyQ.toLowerCase();
    setResults(allParties.filter(p=>p.name.toLowerCase().includes(q)||(p.phone||'').includes(q)).slice(0,5));
  },[partyQ,allParties,form.partyId]);
  const pick=(p)=>{ set('partyId',p.id); setPartyQ(p.name); setResults([]); };
  const save=async()=>{
    if(!form.amount||!form.partyId){ alert('Select party and enter amount'); return; }
    await db.transactions.add({...form, amount:parseFloat(form.amount)});
    onSave(); onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
          <span className="font-bold text-gray-800 text-lg">Receive Payment</span>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            {[['payment_in','Received 💵'],['payment_out','Paid Out 💸']].map(([v,l])=>(
              <button key={v} onClick={()=>set('type',v)}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 transition-colors
                ${form.type===v?(v==='payment_in'?'bg-green-500 text-white border-green-500':'bg-red-500 text-white border-red-500'):'border-gray-200 text-gray-500'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative">
            <input value={partyQ} onChange={e=>{setPartyQ(e.target.value);set('partyId','');}}
              placeholder="Search customer / party..." className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
            {results.length>0&&(
              <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-lg z-10 mt-1 overflow-hidden">
                {results.map(p=>(
                  <button key={p.id} onClick={()=>pick(p)} className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm flex justify-between">
                    <span className="font-semibold">{p.name}</span><span className="text-gray-400 text-xs">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {form.partyId&&<div className="mt-1 text-xs text-green-600 font-medium">✓ {partyQ}</div>}
          </div>
          <input type="number" value={form.amount} onChange={e=>set('amount',e.target.value)}
            placeholder="₹ Amount" className="w-full px-4 py-3 border rounded-xl text-xl font-bold focus:outline-none focus:border-indigo-400"/>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_MODES.map(m=>(
              <button key={m} onClick={()=>set('paymentMode',m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-colors
                ${form.paymentMode===m?'bg-indigo-600 text-white border-indigo-600':'border-gray-200 text-gray-600'}`}>{m}</button>
            ))}
          </div>
          <button onClick={save}
            className={`w-full py-3.5 rounded-xl font-bold text-white text-base transition-colors
            ${form.type==='payment_in'?'bg-green-500 hover:bg-green-600':'bg-red-500 hover:bg-red-600'}`}>
            Save Payment
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────── */
export default function Dashboard({ onSync, syncing, user }) {
  const navigate = useNavigate();
  const [toCollect,    setToCollect]    = useState(0);
  const [toPay,        setToPay]        = useState(0);
  const [stockValue,   setStockValue]   = useState(0);
  const [weekSales,    setWeekSales]    = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showPayment,  setShowPayment]  = useState(false);
  const [refresh,      setRefresh]      = useState(0);
  const [txFilter,     setTxFilter]     = useState('365');
  const [storeName,    setStoreName]    = useState('EVOLVE');

  useEffect(()=>{
    async function load(){
      const [invoices, products, txns, parties, settings] = await Promise.all([
        db.invoices.toArray(),
        db.products.toArray(),
        db.transactions.orderBy('id').reverse().toArray(),
        db.parties.toArray(),
        db.settings.toArray(),
      ]);
      const cfg = Object.fromEntries(settings.map(s=>[s.key,s.value]));
      setStoreName(cfg.storeName || 'EVOLVE');

      const partyMap = Object.fromEntries(parties.map(p=>[p.id,p]));

      // To Collect = unpaid/partial sale invoices
      const collect = invoices
        .filter(i=>i.type==='sale'&&(i.status==='unpaid'||i.status==='partial'))
        .reduce((s,i)=>s+(i.balance||i.total),0);
      setToCollect(collect);

      // To Pay = unpaid purchase invoices
      const pay = invoices
        .filter(i=>i.type==='purchase'&&(i.status==='unpaid'||i.status==='partial'))
        .reduce((s,i)=>s+(i.balance||i.total),0);
      setToPay(pay);

      // Stock value
      setStockValue(products.reduce((s,p)=>s+(p.stock||0)*(p.costPrice||p.price||0),0));

      // This week's sales
      const weekAgo = new Date(Date.now()-7*864e5).toISOString().slice(0,10);
      const today   = new Date().toISOString().slice(0,10);
      setWeekSales(invoices.filter(i=>i.type==='sale'&&i.date>=weekAgo&&i.date<=today).reduce((s,i)=>s+i.total,0));

      // Build unified transaction list
      const cutoff = new Date(Date.now() - parseInt(txFilter)*864e5).toISOString().slice(0,10);

      // Invoices as transactions
      const invRows = invoices.filter(i=>i.date>=cutoff).map(inv=>({
        _key: `inv-${inv.id}`,
        _date: inv.date,
        _id: inv.id,
        isInvoice: true,
        party: inv.partyName || '—',
        phone: inv.partyPhone || '',
        typeLabel: inv.type==='sale'?'Sale Invoice':inv.type==='purchase'?'Purchase':inv.type==='proforma'?'Proforma':inv.type==='receipt'?'Receipt':'Order',
        number: inv.number,
        amount: inv.total,
        mode: inv.paymentMode,
        status: inv.status,
        date: inv.date,
        link: `/billing/${inv.id}`,
        color: inv.type==='sale'?'#059669':inv.type==='purchase'?'#2563eb':'#7c3aed',
        bgColor: inv.type==='sale'?'#d1fae5':inv.type==='purchase'?'#dbeafe':'#ede9fe',
        sign: inv.type==='sale'?'+': inv.type==='purchase'?'-':'',
      }));

      // Payment transactions
      const txnRows = txns.filter(t=>t.date>=cutoff).map(t=>({
        _key: `txn-${t.id}`,
        _date: t.date,
        _id: t.id + 1000000,
        isInvoice: false,
        party: partyMap[t.partyId]?.name || '—',
        phone: partyMap[t.partyId]?.phone || '',
        typeLabel: t.type==='payment_in'?'Received Payment':t.type==='payment_out'?'Payment Made':t.type==='expense'?'Expense':'Transaction',
        number: t.invoiceId ? `#${t.invoiceId}` : '',
        amount: t.amount,
        mode: t.paymentMode,
        status: null,
        date: t.date,
        link: t.invoiceId ? `/billing/${t.invoiceId}` : null,
        color: t.type==='payment_in'?'#059669':'#dc2626',
        bgColor: t.type==='payment_in'?'#dcfce7':'#fee2e2',
        sign: t.type==='payment_in'?'+':'-',
      }));

      const all = [...invRows, ...txnRows].sort((a,b)=>{
        if(b._date!==a._date) return b._date.localeCompare(a._date);
        return b._id - a._id;
      });
      setTransactions(all);
    }
    load();
  },[refresh, txFilter]);

  const fmt = v => `₹ ${Number(v||0).toLocaleString('en-IN')}`;
  const fmtDate = d => {
    if(!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN',{day:'2-digit', month:'short'});
  };

  const sendReceipt = (tx) => {
    const text = `*${storeName}*\n\n${tx.typeLabel} ${tx.number}\nDate: ${tx.date}\n\n*Amount: ${fmt(tx.amount)}*\nMode: ${tx.mode||'—'}\n\nThank you! 🙏`;
    const num = (tx.phone||'').replace(/\D/g,'');
    window.open(`https://wa.me/${num?'91'+num.slice(-10):''}?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="flex flex-col" style={{height:'100%', minHeight:0}}>
      {showPayment && (
        <QuickPaymentModal
          onClose={()=>setShowPayment(false)}
          onSave={()=>setRefresh(r=>r+1)}
        />
      )}

      {/* ── Backup reminder (shows if no backup in 2+ days) ── */}
      {(() => {
        const last = localStorage.getItem('evolve_last_backup');
        const days = last ? Math.floor((Date.now()-new Date(last))/86400000) : 99;
        if (days < 2) return null;
        return (
          <button onClick={()=>navigate('/settings')}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl mb-2 w-full text-left active:scale-95 transition-transform"
            style={{background:'#fff7ed', border:'1px solid #fed7aa'}}>
            <ShieldAlert size={15} className="text-orange-500 flex-shrink-0"/>
            <span className="text-xs font-semibold text-orange-700 flex-1">
              {last ? `Backup ${days}d ago — tap to download` : 'No backup yet — tap to backup your data'}
            </span>
            <ChevronRight size={13} className="text-orange-400"/>
          </button>
        );
      })()}

      {/* ── Stat Cards (single row of 4) ──────────────────── */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-2 mb-3">
        <button onClick={()=>navigate('/receivables')}
          className="rounded-xl p-2 text-center active:scale-95 transition-transform"
          style={{background:'#f0fdf4', border:'1px solid #bbf7d0'}}>
          <div className="text-sm font-black leading-tight" style={{color:'#15803d'}}>{fmt(toCollect)}</div>
          <div className="text-xs font-semibold mt-0.5" style={{color:'#16a34a',fontSize:'10px'}}>To Collect ↓</div>
        </button>

        <button onClick={()=>navigate('/parties')}
          className="rounded-xl p-2 text-center active:scale-95 transition-transform"
          style={{background:'#fff1f2', border:'1px solid #fecdd3'}}>
          <div className="text-sm font-black leading-tight" style={{color:'#be123c'}}>{fmt(toPay)}</div>
          <div className="text-xs font-semibold mt-0.5" style={{color:'#e11d48',fontSize:'10px'}}>To Pay ↑</div>
        </button>

        <button onClick={()=>navigate('/inventory')}
          className="rounded-xl p-2 text-center active:scale-95 transition-transform"
          style={{background:'#f8fafc', border:'1px solid #e2e8f0'}}>
          <div className="text-sm font-black leading-tight text-gray-800">{fmt(stockValue)}</div>
          <div className="text-gray-400 mt-0.5" style={{fontSize:'10px'}}>Stock Val.</div>
        </button>

        <button onClick={()=>navigate('/reports')}
          className="rounded-xl p-2 text-center active:scale-95 transition-transform"
          style={{background:'#f8fafc', border:'1px solid #e2e8f0'}}>
          <div className="text-sm font-black leading-tight text-gray-800">{fmt(weekSales)}</div>
          <div className="text-gray-400 mt-0.5" style={{fontSize:'10px'}}>Wk Sales</div>
        </button>
      </div>

      {/* ── Cloud Sync strip ─────────────────────────────── */}
      {onSync && (
        <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-3"
          style={{background:'#f0f9ff', border:'1px solid #bae6fd'}}>
          {user?.photoURL
            ? <img src={user.photoURL} className="w-7 h-7 rounded-full flex-shrink-0" alt=""/>
            : <span className="text-lg">☁️</span>
          }
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-sky-700 truncate">
              {user?.displayName || 'Signed in'} · Cloud Sync ON
            </div>
            <div className="text-xs text-sky-500">All bills save to Google cloud automatically</div>
          </div>
          <button onClick={onSync} disabled={syncing}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{background:'#0ea5e9', color:'#fff'}}>
            {syncing ? '⏳ Syncing…' : '☁️ Sync Now'}
          </button>
        </div>
      )}

      {/* ── Transactions header ────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3">
        <span className="font-bold text-gray-800 text-base">Transactions</span>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-indigo-600"/>
          {[
            {v:'7',   l:'7 Days'},
            {v:'30',  l:'30 Days'},
            {v:'365', l:'All'},
          ].map(f=>(
            <button key={f.v} onClick={()=>setTxFilter(f.v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors
              ${txFilter===f.v?'bg-indigo-600 text-white':'text-indigo-600 hover:bg-indigo-50'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable transaction cards ──────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-2" style={{minHeight:0}}>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🧾</div>
            <p className="text-gray-400 font-medium">No transactions yet</p>
            <p className="text-gray-300 text-sm mt-1">Create your first invoice below</p>
          </div>
        ) : transactions.map(tx => (
          <div key={tx._key} className="bg-white rounded-2xl overflow-hidden"
            style={{border:'1px solid #f1f5f9', boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
            {/* Main row */}
            <div className="px-4 pt-3.5 pb-2">
              {/* Party name */}
              <div className="font-bold text-gray-900 text-base mb-1">{tx.party}</div>

              {/* Type + number | Amount */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{color: tx.color}}>
                    {tx.typeLabel}{tx.number ? ` ${tx.number}` : ''}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gray-400 text-xs">{fmtDate(tx.date)}</span>
                    {tx.status && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                        style={{
                          background: tx.status==='paid'?'#dcfce7':tx.status==='partial'?'#fef9c3':'#fee2e2',
                          color: tx.status==='paid'?'#15803d':tx.status==='partial'?'#854d0e':'#dc2626',
                          fontSize:'10px'
                        }}>
                        {tx.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-base" style={{color: tx.sign==='+'?'#059669':'#dc2626'}}>
                    {tx.sign}{fmt(tx.amount)}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">{tx.mode}</div>
                </div>
              </div>
            </div>

            {/* Footer: actions */}
            <div className="border-t border-gray-50 px-4 py-2 flex items-center justify-between gap-3">
              <button
                onClick={async()=>{
                  if(!confirm('Delete this entry? Cannot be undone.')) return;
                  if(tx.isInvoice) await db.invoices.delete(tx._id);
                  else await db.transactions.delete(tx._id - 1000000);
                  setRefresh(r=>r+1);
                }}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium active:scale-90 transition-transform">
                <Trash2 size={12}/> Delete
              </button>
              <div className="flex items-center gap-3">
                {tx.link && (
                  <Link to={tx.link} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                    {tx.isInvoice ? 'View / Edit →' : 'View →'}
                  </Link>
                )}
                <button onClick={()=>sendReceipt(tx)}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{color:'#6366f1'}}>
                  <Send size={12}/> Send Receipt
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
