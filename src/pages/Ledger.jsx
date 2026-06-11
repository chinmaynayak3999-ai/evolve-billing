import { useEffect, useState } from 'react';
import { db } from '../db';
import { BookOpen, Printer } from 'lucide-react';

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [parties, setParties] = useState({});
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [mode, setMode] = useState('day'); // day | cash | bank

  useEffect(() => {
    async function load() {
      const [txns, invoices, expenses, ps] = await Promise.all([
        db.transactions.toArray(),
        db.invoices.toArray(),
        db.expenses.toArray(),
        db.parties.toArray(),
      ]);
      setParties(Object.fromEntries(ps.map(p=>[p.id,p.name])));
      const all = [
        ...txns.map(t=>({ date:t.date, type:t.type, desc:`${t.type==='payment_in'?'Payment Received':'Payment Paid'} - ${ps.find(p=>p.id===t.partyId)?.name||''}`, amount:t.amount, paymentMode:t.paymentMode, source:'txn' })),
        ...invoices.map(i=>({ date:i.date, type:i.type, desc:`${i.type==='sale'?'Sales Invoice':'Purchase'} - ${i.partyName||''} (${i.number})`, amount:i.total, paymentMode:i.paymentMode, source:'invoice' })),
        ...expenses.map(e=>({ date:e.date, type:'expense', desc:`Expense - ${e.category}: ${e.notes||''}`, amount:e.amount, paymentMode:e.paymentMode, source:'expense' })),
      ].sort((a,b)=>b.date.localeCompare(a.date)||0);
      setEntries(all);
    }
    load();
  }, []);

  const CASH_MODES = ['Cash'];
  const BANK_MODES = ['GPay','PhonePe','Paytm','Bank Transfer','NEFT','Cheque'];

  const filtered = entries.filter(e => {
    if (mode==='day' && e.date!==date) return false;
    if (mode==='cash' && !CASH_MODES.includes(e.paymentMode)) return false;
    if (mode==='bank' && !BANK_MODES.includes(e.paymentMode)) return false;
    return true;
  });

  const inTypes = ['sale','payment_in'];
  const outTypes = ['purchase','payment_out','expense'];
  const totalIn = filtered.filter(e=>inTypes.includes(e.type)).reduce((s,e)=>s+(e.amount||0),0);
  const totalOut = filtered.filter(e=>outTypes.includes(e.type)).reduce((s,e)=>s+(e.amount||0),0);

  const TYPE_STYLE = {
    sale:'bg-green-100 text-green-700', purchase:'bg-orange-100 text-orange-700',
    payment_in:'bg-blue-100 text-blue-700', payment_out:'bg-red-100 text-red-700',
    expense:'bg-red-100 text-red-700'
  };
  const TYPE_LABELS = { sale:'Sale', purchase:'Purchase', payment_in:'Payment In', payment_out:'Payment Out', expense:'Expense' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Day Book</h1>
        <button onClick={()=>window.print()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 no-print">
          <Printer size={15}/> Print
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 no-print">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            {[['day','Day Book'],['cash','Cash Book'],['bank','Bank Book']].map(([v,l])=>(
              <button key={v} onClick={()=>setMode(v)} className={`px-3 py-2 rounded-lg text-sm ${mode===v?'bg-blue-600 text-white':'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
          {mode==='day' && (
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-400"/>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
          <div className="text-xl font-bold text-green-700">₹{totalIn.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Total In</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-3 text-center">
          <div className="text-xl font-bold text-red-600">₹{totalOut.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Total Out</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-center">
          <div className={`text-xl font-bold ${(totalIn-totalOut)>=0?'text-green-700':'text-red-600'}`}>₹{Math.abs(totalIn-totalOut).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Net</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {filtered.length===0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30"/>
            <p>No entries {mode==='day'?`on ${date}`:''}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Date','Type','Description','Mode','In','Out'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((e,i)=>{
                const isIn = inTypes.includes(e.type);
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{e.date}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLE[e.type]||'bg-gray-100 text-gray-600'}`}>{TYPE_LABELS[e.type]||e.type}</span></td>
                    <td className="px-4 py-3 text-gray-700">{e.desc}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{e.paymentMode||'—'}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{isIn?`₹${(e.amount||0).toLocaleString('en-IN')}`:''}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{!isIn?`₹${(e.amount||0).toLocaleString('en-IN')}`:''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t font-semibold text-sm">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-gray-700">Total</td>
                <td className="px-4 py-3 text-green-700">₹{totalIn.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                <td className="px-4 py-3 text-red-600">₹{totalOut.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
