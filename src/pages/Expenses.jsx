import { useEffect, useState } from 'react';
import { db } from '../db';
import { Plus, Search, Trash2, ShoppingBag } from 'lucide-react';

const CATEGORIES = ['Rent','Electricity','Staff Salary','Transport','Marketing','Equipment','Maintenance','Office Supplies','Taxes','Miscellaneous'];
const PAYMENT_MODES = ['Cash','GPay','PhonePe','Paytm','Bank Transfer','Cheque'];

function ExpenseForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ date:new Date().toISOString().slice(0,10), category:'Rent', amount:0, paymentMode:'Cash', notes:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Add Expense</h2>
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Date</label>
            <input type="date" value={form.date} onChange={e=>set('date',e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <select value={form.category} onChange={e=>set('category',e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400">
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Amount ₹</label>
            <input type="number" value={form.amount} onChange={e=>set('amount',parseFloat(e.target.value)||0)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Payment Mode</label>
            <select value={form.paymentMode} onChange={e=>set('paymentMode',e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400">
              {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <input value={form.notes} onChange={e=>set('notes',e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
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

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => db.expenses.orderBy('id').reverse().toArray().then(setExpenses);
  useEffect(() => { load(); }, []);

  const save = async (form) => { await db.expenses.add(form); setShowForm(false); load(); };
  const del = async (id) => { if (!confirm('Delete?')) return; await db.expenses.delete(id); load(); };

  const filtered = expenses.filter(e => {
    if (q && !e.category?.toLowerCase().includes(q.toLowerCase()) && !e.notes?.toLowerCase().includes(q.toLowerCase())) return false;
    if (catFilter !== 'all' && e.category !== catFilter) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });

  const total = filtered.reduce((s,e)=>s+(e.amount||0),0);
  const byCategory = CATEGORIES.map(c=>({ cat:c, amount:filtered.filter(e=>e.category===c).reduce((s,e)=>s+(e.amount||0),0) })).filter(c=>c.amount>0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
        <button onClick={()=>setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700">
          <Plus size={16}/> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">₹{total.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Total Expenses (filtered)</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-gray-700">{filtered.length}</div>
          <div className="text-xs text-gray-500">Entries</div>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">By Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {byCategory.map(c=>(
              <div key={c.cat} className="bg-gray-50 rounded-lg p-2 text-xs">
                <div className="font-medium text-gray-700">{c.cat}</div>
                <div className="text-red-600 font-semibold">₹{c.amount.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:outline-none">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:outline-none"/>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:outline-none"/>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {filtered.length===0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag size={48} className="mx-auto mb-3 opacity-30"/>
            <p>No expenses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date','Category','Mode','Notes','Amount',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(e=>(
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{e.date}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{e.category}</span></td>
                    <td className="px-4 py-3 text-gray-500">{e.paymentMode}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{e.notes||'—'}</td>
                    <td className="px-4 py-3 font-bold text-red-600">₹{(e.amount||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <button onClick={()=>del(e.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && <ExpenseForm onSave={save} onCancel={()=>setShowForm(false)}/>}
    </div>
  );
}
