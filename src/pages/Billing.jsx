import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { Plus, Search, Eye, Printer, FileText, Trash2 } from 'lucide-react';

const STATUS_COLORS = { paid:'bg-green-100 text-green-700', unpaid:'bg-red-100 text-red-700', partial:'bg-yellow-100 text-yellow-700' };
const TYPE_LABELS = { sale:'Invoice', purchase:'Purchase', proforma:'Proforma', receipt:'Receipt', order:'Purchase Order' };

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    const all = await db.invoices.orderBy('id').reverse().toArray();
    setInvoices(all);
  };
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    await db.invoices.delete(id);
    load();
  };

  const filtered = invoices.filter(i => {
    const matchQ = !q || i.number?.toLowerCase().includes(q.toLowerCase()) || i.partyName?.toLowerCase().includes(q.toLowerCase());
    const matchT = typeFilter === 'all' || i.type === typeFilter;
    return matchQ && matchT;
  });

  const fmt = v => `₹${Number(v||0).toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Billing</h1>
        <Link to="/billing/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700">
          <Plus size={16}/> New Invoice
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search invoice # or party..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="all">All Types</option>
            <option value="sale">Sales Invoice</option>
            <option value="purchase">Purchase</option>
            <option value="proforma">Proforma</option>
            <option value="receipt">Receipt</option>
            <option value="order">Purchase Order</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText size={48} className="mx-auto mb-3 opacity-30"/>
            <p>No invoices found</p>
            <Link to="/billing/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">Create your first invoice</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['#','Date','Type','Party','Items','Total','Status',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{inv.number}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.date}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{TYPE_LABELS[inv.type]||inv.type}</span></td>
                    <td className="px-4 py-3 text-gray-800">{inv.partyName||'—'}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.items?.length||0} items</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmt(inv.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status]||'bg-gray-100 text-gray-600'}`}>{inv.status||'—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/billing/${inv.id}`} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Eye size={15}/></Link>
                        <button onClick={()=>del(inv.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
