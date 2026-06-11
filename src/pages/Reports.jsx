import { useEffect, useState } from 'react';
import { db } from '../db';
import { BarChart2, TrendingUp, TrendingDown, Users, Package, Printer } from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState({ invoices:[], txns:[], products:[], parties:[], expenses:[] });
  const [range, setRange] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    async function load() {
      const [invoices, txns, products, parties, expenses] = await Promise.all([
        db.invoices.toArray(), db.transactions.toArray(), db.products.toArray(), db.parties.toArray(), db.expenses.toArray()
      ]);
      setData({ invoices, txns, products, parties, expenses });
    }
    load();
  }, []);

  const getRange = () => {
    const now = new Date();
    if (range==='today') { const d=now.toISOString().slice(0,10); return [d,d]; }
    if (range==='week') { const s=new Date(now-6*864e5).toISOString().slice(0,10); return [s,now.toISOString().slice(0,10)]; }
    if (range==='month') { const s=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10); return [s,now.toISOString().slice(0,10)]; }
    if (range==='year') { const s=`${now.getFullYear()}-01-01`; return [s,now.toISOString().slice(0,10)]; }
    return [from||'2000-01-01', to||'2099-12-31'];
  };

  const [startDate, endDate] = getRange();
  const inRange = (d) => d >= startDate && d <= endDate;

  const sales = data.invoices.filter(i=>i.type==='sale'&&inRange(i.date));
  const purchases = data.invoices.filter(i=>i.type==='purchase'&&inRange(i.date));
  const expenses = data.expenses.filter(e=>inRange(e.date));

  const totalSales = sales.reduce((s,i)=>s+i.total,0);
  const totalPurchases = purchases.reduce((s,i)=>s+i.total,0);
  const totalExpenses = expenses.reduce((s,e)=>s+(e.amount||0),0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;

  const outstanding = data.invoices.filter(i=>i.type==='sale'&&(i.status==='unpaid'||i.status==='partial'));
  const totalOutstanding = outstanding.reduce((s,i)=>s+(i.balance||i.total),0);

  // Top products by sales count
  const productSales = {};
  sales.forEach(inv => {
    inv.items?.forEach(item => {
      if (!item.name) return;
      productSales[item.name] = (productSales[item.name]||0) + (parseFloat(item.amount)||0);
    });
  });
  const topProducts = Object.entries(productSales).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Top customers
  const custSales = {};
  sales.forEach(inv => { if (inv.partyName) custSales[inv.partyName] = (custSales[inv.partyName]||0) + inv.total; });
  const topCustomers = Object.entries(custSales).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Monthly breakdown
  const monthlySales = {};
  data.invoices.filter(i=>i.type==='sale').forEach(i=>{
    const m = i.date?.slice(0,7);
    monthlySales[m] = (monthlySales[m]||0) + i.total;
  });
  const months = Object.entries(monthlySales).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);
  const maxMonth = Math.max(...months.map(m=>m[1]), 1);

  // Payment mode breakdown
  const paymentModes = {};
  data.txns.filter(t=>t.type==='payment_in'&&inRange(t.date)).forEach(t=>{
    paymentModes[t.paymentMode||'Unknown'] = (paymentModes[t.paymentMode||'Unknown']||0) + t.amount;
  });

  const fmt = v => `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;

  const Card = ({title,value,icon:Icon,color='blue',sub}) => {
    const colors = {blue:'text-blue-600 bg-blue-50',green:'text-green-600 bg-green-50',red:'text-red-600 bg-red-50',orange:'text-orange-600 bg-orange-50'};
    return (
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon size={18}/></div>
          <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{title}</span>
        </div>
        <div className={`text-2xl font-bold ${colors[color].split(' ')[0]}`}>{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <button onClick={()=>window.print()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 no-print">
          <Printer size={15}/> Print
        </button>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 no-print">
        <div className="flex flex-wrap gap-2 items-center">
          {['today','week','month','year','custom'].map(r=>(
            <button key={r} onClick={()=>setRange(r)} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${range===r?'bg-blue-600 text-white':'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{r}</button>
          ))}
          {range==='custom' && (
            <>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm"/>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm"/>
            </>
          )}
        </div>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card title="Sales"        value={fmt(totalSales)}     icon={TrendingUp}    color="green" sub={`${sales.length} invoices`}/>
        <Card title="Purchases"    value={fmt(totalPurchases)} icon={TrendingDown}  color="orange" sub={`${purchases.length} entries`}/>
        <Card title="Expenses"     value={fmt(totalExpenses)}  icon={TrendingDown}  color="red" sub={`${expenses.length} entries`}/>
        <Card title={netProfit>=0?'Net Profit':'Net Loss'} value={fmt(Math.abs(netProfit))} icon={BarChart2} color={netProfit>=0?'green':'red'}/>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-4 col-span-2 lg:col-span-1">
          <div className="text-sm font-semibold text-gray-700 mb-1">Profit & Loss</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b"><span className="text-gray-600">Gross Sales</span><span className="font-medium text-green-700">{fmt(totalSales)}</span></div>
            <div className="flex justify-between py-1 border-b"><span className="text-gray-600">Cost of Goods (Purchases)</span><span className="font-medium text-red-600">-{fmt(totalPurchases)}</span></div>
            <div className="flex justify-between py-1 border-b font-semibold"><span>Gross Profit</span><span className={grossProfit>=0?'text-green-700':'text-red-600'}>{fmt(Math.abs(grossProfit))}</span></div>
            <div className="flex justify-between py-1 border-b"><span className="text-gray-600">Operating Expenses</span><span className="font-medium text-red-600">-{fmt(totalExpenses)}</span></div>
            <div className="flex justify-between py-1 font-bold text-base"><span>Net {netProfit>=0?'Profit':'Loss'}</span><span className={netProfit>=0?'text-green-700':'text-red-600'}>{fmt(Math.abs(netProfit))}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">Outstanding</div>
          <div className="text-2xl font-bold text-red-600 mb-1">{fmt(totalOutstanding)}</div>
          <div className="text-xs text-gray-400">{outstanding.length} unpaid invoices</div>
          <div className="mt-3 space-y-1">
            {outstanding.slice(0,4).map(inv=>(
              <div key={inv.id} className="flex justify-between text-xs">
                <span className="text-gray-600">{inv.partyName} – {inv.number}</span>
                <span className="text-red-600 font-medium">{fmt(inv.balance||inv.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Sales Chart */}
      {months.length > 0 && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-4">Monthly Sales Trend</div>
          <div className="flex items-end gap-2 h-32">
            {months.map(([m,v])=>(
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-gray-500 font-medium">{fmt(v)}</div>
                <div className="w-full bg-blue-500 rounded-t" style={{height:`${(v/maxMonth)*100}%`, minHeight:'4px'}}/>
                <div className="text-xs text-gray-400">{m.slice(5)}/{m.slice(2,4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Package size={16}/> Top Products (by revenue)</div>
          {topProducts.length===0 ? <p className="text-xs text-gray-400">No sales data</p> :
            topProducts.map(([name,amt],i)=>(
              <div key={name} className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">{i+1}</div>
                <div className="flex-1 text-sm text-gray-700">{name}</div>
                <div className="text-sm font-semibold text-green-700">{fmt(amt)}</div>
              </div>
            ))
          }
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users size={16}/> Top Customers</div>
          {topCustomers.length===0 ? <p className="text-xs text-gray-400">No customer data</p> :
            topCustomers.map(([name,amt],i)=>(
              <div key={name} className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">{i+1}</div>
                <div className="flex-1 text-sm text-gray-700">{name}</div>
                <div className="text-sm font-semibold text-green-700">{fmt(amt)}</div>
              </div>
            ))
          }
        </div>

        {/* Payment Mode */}
        {Object.keys(paymentModes).length > 0 && (
          <div className="bg-white rounded-xl border p-4 lg:col-span-2">
            <div className="text-sm font-semibold text-gray-700 mb-3">Payment Mode Report (Received)</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(paymentModes).map(([mode,amt])=>(
                <div key={mode} className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-sm font-bold text-blue-700">{fmt(amt)}</div>
                  <div className="text-xs text-gray-500">{mode}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
