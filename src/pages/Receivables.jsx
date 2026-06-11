import { useEffect, useState } from 'react';
import { db } from '../db';
import { Search, MessageCircle, IndianRupee, Clock, ChevronDown, ChevronUp, Phone } from 'lucide-react';

export default function Receivables() {
  const [groups,    setGroups]    = useState([]);
  const [q,         setQ]         = useState('');
  const [expanded,  setExpanded]  = useState({});
  const [settings,  setSettings]  = useState({});
  const [totalDue,  setTotalDue]  = useState(0);

  useEffect(() => {
    async function load() {
      const [invoices, s] = await Promise.all([
        db.invoices.toArray(),
        db.settings.toArray(),
      ]);
      const cfg = Object.fromEntries(s.map(r=>[r.key, r.value]));
      setSettings(cfg);

      // Only sales invoices that have balance due
      const unpaid = invoices.filter(i =>
        i.type === 'sale' && (i.status === 'unpaid' || i.status === 'partial') && (i.balance||i.total) > 0
      );

      // Group by party
      const map = {};
      unpaid.forEach(inv => {
        const key  = inv.partyId || inv.partyName || 'Unknown';
        const name = inv.partyName || 'Unknown Customer';
        const phone= inv.partyPhone || '';
        if (!map[key]) map[key] = { name, phone, bills: [] };
        map[key].bills.push({
          id:      inv.id,
          number:  inv.number,
          date:    inv.date,
          total:   inv.total,
          paid:    inv.amountPaid || 0,
          balance: inv.balance ?? inv.total,
          items:   inv.items || [],
          status:  inv.status,
          paymentMode: inv.paymentMode,
        });
      });

      const list = Object.values(map).map(g => ({
        ...g,
        totalDue: g.bills.reduce((s,b)=>s+b.balance, 0),
      })).sort((a,b) => b.totalDue - a.totalDue);

      setGroups(list);
      setTotalDue(list.reduce((s,g)=>s+g.totalDue, 0));

      // Auto-expand first group
      if (list.length > 0) setExpanded({ [list[0].name]: true });
    }
    load();
  }, []);

  const filtered = groups.filter(g =>
    !q || g.name.toLowerCase().includes(q.toLowerCase()) || g.phone.includes(q)
  );

  const toggle = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }));

  const sendWA = (g, bill = null) => {
    const store = settings.storeName || 'Evolve';
    let text;
    if (bill) {
      // Single bill reminder
      text =
`*${store}* — Payment Reminder 🙏

Dear *${g.name}*,

📋 Invoice: *${bill.number}*
📅 Date: ${bill.date}
💰 Bill Amount: ₹${bill.total.toFixed(2)}${bill.paid > 0 ? `\n✅ Paid: ₹${bill.paid.toFixed(2)}` : ''}
🔴 *Balance Due: ₹${bill.balance.toFixed(2)}*

Kindly clear the above amount at the earliest.
Thank you! 🙏`;
    } else {
      // Full summary for the party
      const lines = g.bills.map(b =>
        `• ${b.number} (${b.date}) — ₹${b.balance.toFixed(2)}`
      ).join('\n');
      text =
`*${store}* — Payment Reminder 🙏

Dear *${g.name}*,

You have the following outstanding dues:

${lines}

💳 *Total Due: ₹${g.totalDue.toFixed(2)}*

Please clear the dues at the earliest.
Thank you! 🙏`;
    }
    const num = (g.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${num ? '91'+num.slice(-10) : ''}?text=${encodeURIComponent(text)}`);
  };

  const fmt = v => `₹${Number(v||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const daysDue = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    return diff;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Receivables</h1>
          <p className="text-gray-400 text-xs mt-0.5">Pending payments from customers</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-right">
          <div className="text-xl font-black text-red-600">{fmt(totalDue)}</div>
          <div className="text-xs text-gray-400">Total Outstanding</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
          <div className="text-xl font-bold text-indigo-600">{groups.length}</div>
          <div className="text-xs text-gray-400">Customers</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
          <div className="text-xl font-bold text-orange-500">{groups.reduce((s,g)=>s+g.bills.length,0)}</div>
          <div className="text-xs text-gray-400">Unpaid Bills</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
          <div className="text-xl font-bold text-red-500">{groups.filter(g=>g.bills.some(b=>daysDue(b.date)>30)).length}</div>
          <div className="text-xs text-gray-400">Overdue 30d+</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Search customer name or phone..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:border-indigo-400 shadow-sm"/>
      </div>

      {/* Customer groups */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center shadow-sm">
          <IndianRupee size={48} className="mx-auto mb-3 text-gray-200"/>
          <p className="text-gray-400 font-medium">No outstanding receivables</p>
          <p className="text-gray-300 text-sm mt-1">All bills are paid! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => (
            <div key={g.name} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {/* Customer header row */}
              <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600 text-sm">{g.name.charAt(0).toUpperCase()}</span>
                </div>

                {/* Name + phone */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 truncate">{g.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {g.phone && <><Phone size={10}/>{g.phone}</>}
                    <span className="ml-1">{g.bills.length} bill{g.bills.length>1?'s':''}</span>
                  </div>
                </div>

                {/* Total due badge */}
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-black text-red-600">{fmt(g.totalDue)}</div>
                  <div className="text-xs text-gray-400">due</div>
                </div>

                {/* WhatsApp all button */}
                <button onClick={()=>sendWA(g)}
                  className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-green-600 active:scale-95 transition-all flex-shrink-0">
                  <MessageCircle size={13}/> Remind
                </button>

                {/* Expand toggle */}
                <button onClick={()=>toggle(g.name)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  {expanded[g.name] ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                </button>
              </div>

              {/* Bills detail — expandable */}
              {expanded[g.name] && (
                <div className="border-t border-gray-50">
                  {g.bills.map(bill => {
                    const days = daysDue(bill.date);
                    const isOverdue = days > 30;
                    return (
                      <div key={bill.id}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0
                          ${isOverdue ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>

                        {/* Bill icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold
                          ${bill.status==='partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {bill.status==='partial' ? '½' : '!'}
                        </div>

                        {/* Bill details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800 text-sm">{bill.number}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                              ${bill.status==='partial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>
                              {bill.status}
                            </span>
                            {isOverdue && (
                              <span className="text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <Clock size={9}/> {days}d overdue
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            📅 {bill.date}
                            {bill.items.length > 0 && (
                              <span className="ml-2">
                                🛍️ {bill.items.filter(i=>i.name).map(i=>i.name).slice(0,2).join(', ')}
                                {bill.items.filter(i=>i.name).length > 2 && ` +${bill.items.filter(i=>i.name).length-2} more`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amounts */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-400">Bill: {fmt(bill.total)}</div>
                          {bill.paid > 0 && <div className="text-xs text-green-600">Paid: {fmt(bill.paid)}</div>}
                          <div className="text-sm font-bold text-red-600">Due: {fmt(bill.balance)}</div>
                        </div>

                        {/* Single bill WA */}
                        <button onClick={()=>sendWA(g, bill)}
                          className="w-8 h-8 rounded-xl bg-green-50 hover:bg-green-500 text-green-600 hover:text-white flex items-center justify-center flex-shrink-0 transition-colors">
                          <MessageCircle size={14}/>
                        </button>
                      </div>
                    );
                  })}

                  {/* Footer total for this customer */}
                  <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/60">
                    <span className="text-xs text-gray-500 font-medium">Total Outstanding — {g.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-red-600">{fmt(g.totalDue)}</span>
                      <button onClick={()=>sendWA(g)}
                        className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-green-600">
                        <MessageCircle size={12}/> Send All Dues
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
