import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, partyBalance } from '../db';
import { ArrowLeft, Share2, Printer } from 'lucide-react';

export default function PartyLedger() {
  const { id } = useParams();
  const [party, setParty] = useState(null);
  const [txns, setTxns] = useState([]);
  const [balance, setBalance] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    async function load() {
      const p = await db.parties.get(Number(id));
      setParty(p);
      const allTxns = await db.transactions.where('partyId').equals(Number(id)).toArray();
      const sorted = allTxns.sort((a,b)=>a.date.localeCompare(b.date));
      setTxns(sorted);
      setBalance(await partyBalance(Number(id)));
    }
    load();
  }, [id]);

  if (!party) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  const TYPE_LABELS = { sale:'Sale', purchase:'Purchase', payment_in:'Payment In', payment_out:'Payment Out', debit_note:'Debit Note', credit_note:'Credit Note' };

  const filtered = txns.filter(t => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    return true;
  });

  let running = party.openingBalance || 0;

  const shareWhatsApp = () => {
    const lines = [`*Ledger Statement — ${party.name}*\n`];
    lines.push(`Opening Balance: ₹${party.openingBalance||0}`);
    filtered.forEach(t => {
      const isDebit = t.type==='sale'||t.type==='debit_note';
      const sign = isDebit ? '+' : '-';
      lines.push(`${t.date} | ${TYPE_LABELS[t.type]||t.type} | ${sign}₹${t.amount}`);
    });
    lines.push(`\n*Net Balance: ₹${Math.abs(balance).toFixed(2)} ${balance>=0?'(to receive)':'(to pay)'}*`);
    window.open(`https://wa.me/${party.phone}?text=${encodeURIComponent(lines.join('\n'))}`);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 no-print">
        <Link to="/parties" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20}/></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{party.name}</h1>
          <p className="text-gray-500 text-sm capitalize">{party.type} · {party.phone}</p>
        </div>
        {party.phone && (
          <button onClick={shareWhatsApp} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-green-600">
            <Share2 size={15}/> WhatsApp
          </button>
        )}
        <button onClick={()=>window.print()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
          <Printer size={15}/> Print
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`rounded-xl p-4 text-center ${balance>=0?'bg-green-50 border-green-100':'bg-red-50 border-red-100'} border`}>
          <div className={`text-2xl font-bold ${balance>=0?'text-green-700':'text-red-600'}`}>₹{Math.abs(balance).toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500">{balance>=0?'To Receive':'To Pay'}</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-gray-700">{filtered.length}</div>
          <div className="text-xs text-gray-500">Transactions</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 no-print">
        <div className="flex gap-3 text-sm">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Date','Transaction','Invoice','Debit (Dr)','Credit (Cr)','Balance'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <tr className="bg-blue-50">
              <td className="px-4 py-2 text-gray-500 text-xs">—</td>
              <td className="px-4 py-2 font-medium text-gray-700">Opening Balance</td>
              <td colSpan={2} className="px-4 py-2"/>
              <td className="px-4 py-2"/>
              <td className="px-4 py-2 font-semibold text-blue-700">₹{(party.openingBalance||0).toFixed(2)}</td>
            </tr>
            {filtered.map((t,i) => {
              const isDebit = t.type==='sale'||t.type==='debit_note';
              if (isDebit) running += t.amount; else running -= t.amount;
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">{t.date}</td>
                  <td className="px-4 py-2 text-gray-700">{TYPE_LABELS[t.type]||t.type}</td>
                  <td className="px-4 py-2 text-blue-600 text-xs">{t.invoiceId?`#${t.invoiceId}`:t.notes||'—'}</td>
                  <td className="px-4 py-2 text-green-700 font-medium">{isDebit?`₹${t.amount.toFixed(2)}`:''}</td>
                  <td className="px-4 py-2 text-red-600 font-medium">{!isDebit?`₹${t.amount.toFixed(2)}`:''}</td>
                  <td className={`px-4 py-2 font-semibold ${running>=0?'text-green-700':'text-red-600'}`}>₹{Math.abs(running).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t font-semibold">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-gray-700">Net Balance</td>
              <td colSpan={2}/>
              <td className={`px-4 py-3 ${balance>=0?'text-green-700':'text-red-600'}`}>
                ₹{Math.abs(balance).toFixed(2)} {balance>=0?'Dr':'Cr'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
