import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, partyBalance } from '../db';
import { Plus, Search, Edit2, Trash2, Users, MessageCircle, BookOpen } from 'lucide-react';

function PartyForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name:'',phone:'',address:'',gstin:'',type:'customer',creditLimit:0,openingBalance:0,openingBalanceType:'debit' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{initial?.id?'Edit':'Add'} {form.type==='customer'?'Customer':'Supplier'}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Type</label>
            <div className="flex gap-2">
              {['customer','supplier'].map(t=>(
                <button key={t} onClick={()=>set('type',t)} className={`flex-1 py-2 rounded-lg border font-medium capitalize ${form.type===t?'bg-blue-600 text-white border-blue-600':'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{t}</button>
              ))}
            </div>
          </div>
          {[['name','Name *'],['phone','Phone'],['address','Address'],['gstin','GSTIN']].map(([k,l])=>(
            <div key={k} className={k==='address'||k==='name'?'col-span-2':''}>
              <label className="text-xs text-gray-500 block mb-1">{l}</label>
              <input value={form[k]||''} onChange={e=>set(k,e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Credit Limit ₹</label>
            <input type="number" value={form.creditLimit||0} onChange={e=>set('creditLimit',parseFloat(e.target.value)||0)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Opening Balance ₹</label>
            <input type="number" value={form.openingBalance||0} onChange={e=>set('openingBalance',parseFloat(e.target.value)||0)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={()=>onSave(form)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Save</button>
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [balances, setBalances] = useState({});
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const all = await db.parties.orderBy('name').toArray();
    setParties(all);
    const bals = {};
    await Promise.all(all.map(async p => { bals[p.id] = await partyBalance(p.id); }));
    setBalances(bals);
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    if (editing?.id) await db.parties.update(editing.id, form);
    else await db.parties.add(form);
    setShowForm(false); setEditing(null); load();
  };

  const del = async (id) => {
    if (!confirm('Delete party?')) return;
    await db.parties.delete(id);
    load();
  };

  const sendReminder = (p) => {
    const bal = balances[p.id] || 0;
    const text = `Dear ${p.name},\n\nThis is a payment reminder from *${document.title}*.\n\nYour outstanding balance: *₹${Math.abs(bal).toFixed(2)}*\n\nPlease clear the dues at the earliest. Thank you!`;
    window.open(`https://wa.me/${p.phone}?text=${encodeURIComponent(text)}`);
  };

  const filtered = parties.filter(p => {
    const mq = !q || p.name?.toLowerCase().includes(q.toLowerCase()) || p.phone?.includes(q);
    const mt = typeFilter==='all' || p.type===typeFilter;
    return mq && mt;
  });

  const totalReceivable = Object.entries(balances).filter(([id])=>filtered.find(p=>p.id===Number(id)&&p.type==='customer')).reduce((s,[,b])=>s+(b>0?b:0),0);
  const totalPayable = Object.entries(balances).filter(([id])=>filtered.find(p=>p.id===Number(id)&&p.type==='supplier')).reduce((s,[,b])=>s+(b>0?b:0),0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Parties</h1>
        <button onClick={()=>{setEditing(null);setShowForm(true);}} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700">
          <Plus size={16}/> Add Party
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg border border-green-100 p-3 text-center">
          <div className="text-xl font-bold text-green-700">₹{totalReceivable.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Total Receivable</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-100 p-3 text-center">
          <div className="text-xl font-bold text-red-600">₹{totalPayable.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Total Payable</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search parties..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-400"/>
          </div>
          <div className="flex gap-2">
            {['all','customer','supplier'].map(t=>(
              <button key={t} onClick={()=>setTypeFilter(t)} className={`px-3 py-2 rounded-lg text-sm capitalize ${typeFilter===t?'bg-blue-600 text-white':'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length===0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-30"/>
            <p>No parties found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Name','Phone','Type','GSTIN','Balance','Actions'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p=>{
                  const bal = balances[p.id]||0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.phone||'—'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.type==='customer'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{p.type}</span></td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.gstin||'—'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${bal>0?'text-green-700':bal<0?'text-red-600':'text-gray-600'}`}>
                          {bal>0?'↑ ':'↓ '}₹{Math.abs(bal).toLocaleString('en-IN',{maximumFractionDigits:0})}
                        </span>
                        {bal>0&&<div className="text-xs text-gray-400">to receive</div>}
                        {bal<0&&<div className="text-xs text-gray-400">to pay</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link to={`/parties/${p.id}/ledger`} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Ledger"><BookOpen size={14}/></Link>
                          {p.phone && <button onClick={()=>sendReminder(p)} className="p-1 hover:bg-green-50 rounded text-green-600" title="WhatsApp Reminder"><MessageCircle size={14}/></button>}
                          <button onClick={()=>{setEditing(p);setShowForm(true);}} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Edit2 size={14}/></button>
                          <button onClick={()=>del(p.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <PartyForm initial={editing} onSave={save} onCancel={()=>{setShowForm(false);setEditing(null);}}/>}
    </div>
  );
}
