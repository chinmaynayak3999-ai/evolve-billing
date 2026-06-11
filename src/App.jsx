import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import AnimatedBg from './components/AnimatedBg';
import { db } from './db';
import { useAuth, LoginScreen, SyncingOverlay } from './AuthGate';

import Dashboard    from './pages/Dashboard';
import Billing      from './pages/Billing';
import NewInvoice   from './pages/NewInvoice';
import Inventory    from './pages/Inventory';
import Parties      from './pages/Parties';
import PartyLedger  from './pages/PartyLedger';
import Payments     from './pages/Payments';
import Receivables  from './pages/Receivables';
import Reports      from './pages/Reports';
import Ledger       from './pages/Ledger';
import Expenses     from './pages/Expenses';
import SettingsPage from './pages/SettingsPage';

// Each nav item: emoji icon + pastel color scheme
const nav = [
  { to:'/',            emoji:'🏠', label:'Dashboard',   bg:'#ede9fe', color:'#7c3aed' },
  { to:'/billing',     emoji:'🧾', label:'Billing',     bg:'#dbeafe', color:'#1d4ed8' },
  { to:'/receivables', emoji:'💰', label:'Receivables', bg:'#fee2e2', color:'#dc2626' },
  { to:'/inventory',   emoji:'📦', label:'Inventory',   bg:'#d1fae5', color:'#065f46' },
  { to:'/parties',     emoji:'🤝', label:'Parties',     bg:'#fce7f3', color:'#9d174d' },
  { to:'/payments',    emoji:'💳', label:'Payments',    bg:'#cffafe', color:'#0e7490' },
  { to:'/expenses',    emoji:'📉', label:'Expenses',    bg:'#ffedd5', color:'#9a3412' },
  { to:'/reports',     emoji:'📊', label:'Reports',     bg:'#fef9c3', color:'#854d0e' },
  { to:'/ledger',      emoji:'📒', label:'Day Book',    bg:'#e0f2fe', color:'#075985' },
  { to:'/settings',    emoji:'⚙️', label:'Settings',    bg:'#f3f4f6', color:'#374151' },
];

function Sidebar({ open, onClose, user, onSignOut }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/25 z-20 lg:hidden" onClick={onClose}/>}
      <aside
        className={`fixed top-0 left-0 h-full w-52 z-30 flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '6px 0 30px rgba(99,102,241,0.10)',
        }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4" style={{borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow"
               style={{boxShadow:'0 2px 8px rgba(99,102,241,0.3)'}}>
            <img src="/logo.svg" alt="Evolve" className="w-full h-full object-contain bg-black"/>
          </div>
          <div>
            <div className="font-black text-xs tracking-[0.22em] text-gray-800">EVOLVE</div>
            <div className="text-xs text-gray-400" style={{fontSize:'10px'}}>Supplement Store</div>
          </div>
          <button className="ml-auto lg:hidden text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X size={16}/>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto px-2">
          {nav.map(({ to, emoji, label, bg, color }) => (
            <NavLink key={to} to={to} end={to === '/'}
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 transition-all duration-150 group"
              style={({ isActive }) => isActive ? {
                background: bg,
                boxShadow: `0 2px 12px ${color}22`,
              } : {}}>
              {({ isActive }) => (
                <>
                  {/* Icon badge */}
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-base leading-none transition-transform group-hover:scale-110"
                    style={{
                      background: isActive ? color : bg,
                      fontSize: '14px',
                    }}>
                    {emoji}
                  </div>
                  {/* Label */}
                  <span className="text-xs font-semibold leading-none"
                    style={{ color: isActive ? color : '#6b7280' }}>
                    {label}
                  </span>
                  {/* Active dot */}
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:color}}/>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3" style={{borderTop:'1px solid rgba(0,0,0,0.05)'}}>
          {onSignOut && user && (
            <div className="flex items-center gap-2">
              {user.photoURL && <img src={user.photoURL} className="w-7 h-7 rounded-full flex-shrink-0" alt=""/>}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-700 truncate">{user.displayName}</div>
                <div className="text-xs text-gray-400 truncate" style={{fontSize:'10px'}}>{user.email}</div>
              </div>
              <button onClick={onSignOut} title="Sign out"
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex-shrink-0">
                <LogOut size={14}/>
              </button>
            </div>
          )}
          {!user && <span className="text-xs text-gray-300" style={{fontSize:'10px'}}>v1.0 · Evolve Billing</span>}
        </div>
      </aside>
    </>
  );
}

/* ── Quick Payment Mini-Modal ────────────────────────────────────── */
const PAYMENT_MODES = ['Cash','GPay','PhonePe','Paytm','Bank Transfer','NEFT','Cheque'];

function QuickPayModal({ onClose }) {
  const [allParties, setAllParties] = useState([]);
  const [partyQ,    setPartyQ]     = useState('');
  const [results,   setResults]    = useState([]);
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
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-t-3xl shadow-2xl w-full max-w-md">
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
        <div className="pb-safe h-2"/>
      </div>
    </div>
  );
}

/* ── Bottom Action Bar (mobile — fixed) ─────────────────────────── */
function BottomBar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [showPay, setShowPay] = useState(false);
  const isNewInv  = location.pathname === '/billing/new';
  if (isNewInv) return null;
  return (
    <>
      {showPay && <QuickPayModal onClose={()=>setShowPay(false)}/>}
      <div className="lg:hidden no-print"
        style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:40,
          background:'rgba(255,255,255,0.97)',
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          borderTop:'1.5px solid rgba(0,0,0,0.09)',
          paddingBottom:'env(safe-area-inset-bottom,8px)',
        }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          {/* Received Payment — light green */}
          <button onClick={()=>setShowPay(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{background:'#dcfce7', color:'#15803d', border:'1.5px solid #bbf7d0'}}>
            💵 Rec. Payment
          </button>

          {/* Big + button */}
          <button onClick={()=>navigate('/billing/new')}
            className="w-14 h-14 flex items-center justify-center rounded-full font-black text-2xl transition-all active:scale-90 flex-shrink-0"
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', boxShadow:'0 4px 18px rgba(99,102,241,0.35)'}}>
            +
          </button>

          {/* New Invoice — light indigo */}
          <button onClick={()=>navigate('/billing/new')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{background:'#ede9fe', color:'#6d28d9', border:'1.5px solid #ddd6fe'}}>
            🧾 Bill / Invoice
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [sideOpen, setSideOpen] = useState(false);
  const { user, syncing, syncVersion, signIn, signOut, manualSync } = useAuth();

  if (user === undefined) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
    </div>
  );

  if (!user) return <LoginScreen onSignIn={signIn}/>;

  return (
    <BrowserRouter>
      {syncing && <SyncingOverlay/>}
      <AnimatedBg/>
      <div className="flex flex-col h-screen overflow-hidden relative" style={{zIndex:1}}>
        <div className="flex flex-1 min-h-0">
          <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} user={user} onSignOut={signOut}/>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile header */}
            <header className="lg:hidden flex items-center gap-3 px-4 py-3 no-print flex-shrink-0"
              style={{
                background:'rgba(255,255,255,0.90)',
                backdropFilter:'blur(16px)',
                WebkitBackdropFilter:'blur(16px)',
                borderBottom:'1px solid rgba(0,0,0,0.07)',
              }}>
              <button onClick={() => setSideOpen(true)} className="text-gray-500 hover:text-gray-700">
                <Menu size={20}/>
              </button>
              <img src="/logo.svg" className="w-7 h-7 rounded-lg bg-black shadow" alt=""/>
              <span className="font-black tracking-[0.2em] text-sm text-gray-800 flex-1">EVOLVE</span>
              {/* User avatar + sync */}
              <button onClick={manualSync} disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{background: syncing ? '#fef3c7' : '#ede9fe', color: syncing ? '#92400e' : '#6d28d9'}}>
                <span className="text-sm">{syncing ? '⏳' : '☁️'}</span>
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
              {user?.photoURL && (
                <img src={user.photoURL} className="w-8 h-8 rounded-full border-2 border-indigo-200 flex-shrink-0" alt=""/>
              )}
            </header>

            {/* key=syncVersion forces all pages to re-mount with fresh data after sync */}
            <main key={syncVersion} className="flex-1 overflow-y-auto p-3 pb-28 lg:pb-4 lg:p-4">
              {/* Glass panel */}
              <div className="min-h-full rounded-2xl p-4 lg:p-5"
                style={{
                  background: 'rgba(255,255,255,0.72)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 32px rgba(99,102,241,0.08), 0 1px 0 rgba(255,255,255,1) inset',
                  border: '1px solid rgba(255,255,255,0.95)',
                }}>
                <Routes>
                  <Route path="/"                   element={<Dashboard onSync={manualSync} syncing={syncing} user={user}/>}/>
                  <Route path="/billing"            element={<Billing/>}/>
                  <Route path="/billing/new"        element={<NewInvoice/>}/>
                  <Route path="/billing/:id"        element={<NewInvoice/>}/>
                  <Route path="/receivables"        element={<Receivables/>}/>
                  <Route path="/inventory"          element={<Inventory/>}/>
                  <Route path="/parties"            element={<Parties/>}/>
                  <Route path="/parties/:id/ledger" element={<PartyLedger/>}/>
                  <Route path="/payments"           element={<Payments/>}/>
                  <Route path="/expenses"           element={<Expenses/>}/>
                  <Route path="/reports"            element={<Reports/>}/>
                  <Route path="/ledger"             element={<Ledger/>}/>
                  <Route path="/settings"           element={<SettingsPage/>}/>
                  <Route path="*"                   element={<Navigate to="/"/>}/>
                </Routes>
              </div>
            </main>
          </div>
        </div>

        {/* Sticky bottom action bar — mobile only */}
        <BottomBar/>
      </div>
    </BrowserRouter>
  );
}
