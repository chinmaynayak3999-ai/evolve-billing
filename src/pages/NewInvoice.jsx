import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, nextInvoiceNumber, adjustStock, getSettings } from '../db';
import { Plus, Trash2, Printer, Share2, Save, ArrowLeft, UserPlus, PackagePlus, X, Edit2 } from 'lucide-react';

const PAYMENT_MODES = ['Cash','GPay','PhonePe','Paytm','Bank Transfer','NEFT','Cheque','Credit (Udhaar)'];
const INV_TYPES = [
  { value:'sale',     label:'Sales Invoice' },
  { value:'proforma', label:'Proforma Invoice' },
  { value:'purchase', label:'Purchase Entry' },
  { value:'receipt',  label:'Payment Receipt' },
  { value:'order',    label:'Purchase Order' },
];
const UNITS = ['Piece','Kg','g','Box','Pack','Scoop','Bottle','Bag','Jar','L','ml'];

const emptyItem = () => ({ productId:'', name:'', qty:'', unit:'Piece', price:'', amount:0 });

/* ─── Inline Add Party ───────────────────────────────────────────── */
function AddPartyModal({ initialName, onSave, onCancel }) {
  const [name, setName]   = useState(initialName||'');
  const [phone, setPhone] = useState('');
  const [type, setType]   = useState('customer');
  const save = async () => {
    if (!name.trim()) return;
    const id = await db.parties.add({ name, phone, type, openingBalance:0, creditLimit:0 });
    onSave({ id, name, phone, type });
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
          <div className="flex items-center gap-2 text-indigo-700 font-bold"><UserPlus size={16}/> Add New Client</div>
          <button onClick={onCancel}><X size={16} className="text-gray-400"/></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            {['customer','supplier'].map(t=>(
              <button key={t} onClick={()=>setType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors
                ${type===t?'bg-indigo-600 text-white':'border border-gray-200 text-gray-500 hover:border-indigo-300'}`}>{t}</button>
            ))}
          </div>
          <input value={name} onChange={e=>setName(e.target.value)} autoFocus placeholder="Full name *"
            className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
          <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="Phone number"
            className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
          <button onClick={save} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700">
            Save & Use
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Inline Add Product ─────────────────────────────────────────── */
function AddProductModal({ initialName, onSave, onCancel }) {
  const [form, setForm] = useState({ name:initialName||'', brand:'', unit:'Piece', price:'', costPrice:'', stock:'', minStock:'5' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const save = async () => {
    if (!form.name.trim()) return;
    const data = { ...form, price:parseFloat(form.price)||0, costPrice:parseFloat(form.costPrice)||0, stock:parseFloat(form.stock)||0, minStock:parseFloat(form.minStock)||5, category:'Other', gstRate:0 };
    const id = await db.products.add(data);
    onSave({ ...data, id });
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
          <div className="flex items-center gap-2 text-green-700 font-bold"><PackagePlus size={16}/> Add New Product</div>
          <button onClick={onCancel}><X size={16} className="text-gray-400"/></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={form.name} onChange={e=>set('name',e.target.value)} autoFocus placeholder="Product name *"
            className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-green-400"/>
          <input value={form.brand} onChange={e=>set('brand',e.target.value)} placeholder="Brand (optional)"
            className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-green-400"/>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Selling Price ₹</label>
              <input type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="e.g. 1500"
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-green-400"/>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Unit</label>
              <select value={form.unit} onChange={e=>set('unit',e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none">
                {UNITS.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Current Stock</label>
              <input type="number" value={form.stock} onChange={e=>set('stock',e.target.value)} placeholder="0"
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-green-400"/>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Cost Price ₹</label>
              <input type="number" value={form.costPrice} onChange={e=>set('costPrice',e.target.value)} placeholder="0"
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-green-400"/>
            </div>
          </div>
          <button onClick={save} className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700">
            Save & Add to Bill
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Invoice Component ─────────────────────────────────────── */
export default function NewInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [settings,     setSettings]     = useState({});
  const [type,         setType]         = useState('sale');
  const [date,         setDate]         = useState(new Date().toISOString().slice(0,10));
  const [number,       setNumber]       = useState('');
  const [partyId,      setPartyId]      = useState('');
  const [partyName,    setPartyName]    = useState('');
  const [partyPhone,   setPartyPhone]   = useState('');
  const [partySearch,  setPartySearch]  = useState('');
  const [partyResults, setPartyResults] = useState([]);
  const [allParties,   setAllParties]   = useState([]);
  const [showAddParty, setShowAddParty] = useState(false);
  const [items,        setItems]        = useState([emptyItem()]);
  const [prodSugg,     setProdSugg]     = useState([]);
  const [activeProdIdx,setActiveProdIdx]= useState(null);
  const [showAddProd,  setShowAddProd]  = useState(false);
  const [newProdName,  setNewProdName]  = useState('');
  const [notes,        setNotes]        = useState('');
  const [paymentMode,  setPaymentMode]  = useState('Cash');
  const [amountPaid,   setAmountPaid]   = useState('');
  const [saving,       setSaving]       = useState(false);
  const [viewMode,     setViewMode]     = useState(false);

  useEffect(() => {
    async function init() {
      const [s, parties] = await Promise.all([getSettings(), db.parties.orderBy('name').toArray()]);
      setSettings(s); setAllParties(parties);
      if (!isEdit) {
        setNumber(await nextInvoiceNumber(s.invoicePrefix||'EVOLVE'));
      } else {
        const inv = await db.invoices.get(Number(id));
        if (inv) {
          setType(inv.type); setDate(inv.date); setNumber(inv.number);
          setPartyId(inv.partyId||''); setPartyName(inv.partyName||'');
          setPartySearch(inv.partyName||''); setPartyPhone(inv.partyPhone||'');
          setItems(inv.items?.length ? inv.items : [emptyItem()]);
          setNotes(inv.notes||''); setPaymentMode(inv.paymentMode||'Cash');
          setAmountPaid(inv.amountPaid ? String(inv.amountPaid) : '');
          setViewMode(true);
        }
      }
    }
    init();
  }, [id]);

  // Party autocomplete
  useEffect(() => {
    if (!partySearch || partyId) { setPartyResults([]); return; }
    const q = partySearch.toLowerCase();
    setPartyResults(allParties.filter(p=>p.name.toLowerCase().includes(q)||(p.phone||'').includes(q)).slice(0,6));
  }, [partySearch, allParties, partyId]);

  const selectParty = (p) => {
    setPartyId(p.id); setPartyName(p.name); setPartyPhone(p.phone||'');
    setPartySearch(p.name); setPartyResults([]);
  };

  // Product autocomplete
  const searchProds = useCallback(async (q, idx) => {
    if (!q) { setProdSugg([]); setActiveProdIdx(null); return; }
    const r = await db.products.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())).toArray();
    setProdSugg(r.slice(0,6)); setActiveProdIdx(idx);
  }, []);

  const selectProd = (prod, idx) => {
    const arr = [...items];
    const qty = parseFloat(arr[idx].qty) || 1;
    arr[idx] = { ...arr[idx], productId:prod.id, name:prod.name, unit:prod.unit||'Piece',
      price: prod.price ? String(prod.price) : '', amount: qty * (prod.price||0) };
    setItems(arr); setProdSugg([]); setActiveProdIdx(null);
  };

  const updateItem = (idx, field, val) => {
    const arr = [...items];
    arr[idx] = { ...arr[idx], [field]: val };
    const qty   = parseFloat(field==='qty'   ? val : arr[idx].qty)   || 0;
    const price = parseFloat(field==='price' ? val : arr[idx].price) || 0;
    arr[idx].amount = qty * price;
    setItems(arr);
  };

  const removeItem = (idx) => setItems(items.filter((_,i)=>i!==idx));

  // Totals — NO GST
  const total   = items.reduce((s,i)=>s+(parseFloat(i.amount)||0), 0);
  const paidAmt = parseFloat(amountPaid) || 0;
  const balance = total - paidAmt;
  const status  = balance <= 0 ? 'paid' : amountPaid ? 'partial' : 'unpaid';

  const save = async () => {
    if (!number) return;
    setSaving(true);
    try {
      const data = { type, date, number, partyId, partyName, partyPhone, items, notes,
        paymentMode, amountPaid:paidAmt, subtotal:total, taxAmt:0, total, balance, status };
      let invId;
      if (isEdit) {
        await db.invoices.update(Number(id), data); invId = Number(id);
      } else {
        invId = await db.invoices.add(data);
        const stockItems = items.filter(i=>i.productId);
        if (type==='sale')     await adjustStock(stockItems, -1);
        if (type==='purchase') await adjustStock(stockItems, 1);
        if (partyId) {
          await db.transactions.add({ date, type:type==='sale'?'sale':'purchase', partyId, invoiceId:invId, amount:total, paymentMode, notes });
          if (paidAmt > 0)
            await db.transactions.add({ date, type:type==='sale'?'payment_in':'payment_out', partyId, invoiceId:invId, amount:paidAmt, paymentMode, notes:'Against '+number });
        }
      }
      setViewMode(true);
      if (!isEdit) navigate(`/billing/${invId}`, {replace:true});
    } finally { setSaving(false); }
  };

  const shareWA = () => {
    const lines = items.filter(i=>i.name).map(i=>`• ${i.name} × ${i.qty||1} = ₹${(parseFloat(i.amount)||0).toFixed(0)}`).join('\n');
    const text = `*${settings.storeName||'Evolve'}*\n\nInvoice: ${number}\nDate: ${date}\nTo: ${partyName}\n\n${lines}\n\n*Total: ₹${total.toFixed(2)}*\nPayment: ${paymentMode}\nStatus: ${status.toUpperCase()}`;
    window.open(`https://wa.me/${partyPhone||''}?text=${encodeURIComponent(text)}`);
  };

  const deleteInvoice = async () => {
    if (!confirm(`Delete invoice ${number}? This cannot be undone.`)) return;
    await db.invoices.delete(parseInt(id));
    navigate('/billing');
  };

  const fmt = v => `₹${Number(v||0).toLocaleString('en-IN', {minimumFractionDigits:2})}`;

  /* ── VIEW MODE ─────────────────────────────────────────────────── */
  if (viewMode) return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap no-print">
        <button onClick={()=>navigate('/billing')} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600"><ArrowLeft size={18}/></button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">{number}</h1>
        <button onClick={deleteInvoice}
          className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-1 hover:bg-red-100 active:scale-95 transition-all">
          <Trash2 size={14}/> Delete
        </button>
        <button onClick={()=>setViewMode(false)}
          className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm flex items-center gap-1 hover:bg-indigo-100 active:scale-95 transition-all">
          <Edit2 size={14}/> Edit
        </button>
        <button onClick={shareWA} className="px-3 py-2 bg-green-500 text-white rounded-xl text-sm flex items-center gap-1 hover:bg-green-600"><Share2 size={14}/> WhatsApp</button>
        <button onClick={()=>window.print()} className="px-3 py-2 bg-gray-700 text-white rounded-xl text-sm flex items-center gap-1 hover:bg-gray-800"><Printer size={14}/> Print</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" className="w-10 h-10 rounded-lg bg-black" alt=""/>
            <div>
              <div className="font-bold text-gray-900 text-lg">{settings.storeName||'EVOLVE'}</div>
              {settings.address && <div className="text-xs text-gray-500">{settings.address}</div>}
              {settings.phone   && <div className="text-xs text-gray-500">{settings.phone}</div>}
              {settings.gstin   && <div className="text-xs text-gray-400">GSTIN: {settings.gstin}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-600 text-sm uppercase">{INV_TYPES.find(t=>t.value===type)?.label}</div>
            <div className="text-gray-500 text-sm mt-0.5">#{number}</div>
            <div className="text-gray-400 text-xs">{date}</div>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold
              ${status==='paid'?'bg-green-100 text-green-700':status==='partial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        {partyName && (
          <div className="mb-4 bg-gray-50 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-400 mb-0.5">{type==='purchase'?'Supplier':'Bill To'}</div>
            <div className="font-semibold text-gray-800">{partyName}</div>
            {partyPhone && <div className="text-sm text-gray-500">{partyPhone}</div>}
          </div>
        )}

        <table className="w-full text-sm mb-4">
          <thead><tr className="bg-gray-50">
            {['#','Item','Qty','Unit','Price','Amount'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y">
            {items.filter(i=>i.name).map((item,i)=>(
              <tr key={i}>
                <td className="px-3 py-2.5 text-gray-400 text-xs">{i+1}</td>
                <td className="px-3 py-2.5 font-medium text-gray-800">{item.name}</td>
                <td className="px-3 py-2.5 text-gray-600">{item.qty||1}</td>
                <td className="px-3 py-2.5 text-gray-400 text-xs">{item.unit}</td>
                <td className="px-3 py-2.5 text-gray-600">{fmt(item.price)}</td>
                <td className="px-3 py-2.5 font-semibold text-gray-800">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-52 space-y-2 text-sm">
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>Total</span><span className="text-indigo-700">{fmt(total)}</span>
            </div>
            {paidAmt>0 && <div className="flex justify-between text-green-700"><span>Paid ({paymentMode})</span><span>{fmt(paidAmt)}</span></div>}
            {balance>0 && <div className="flex justify-between text-red-600 font-semibold"><span>Balance Due</span><span>{fmt(balance)}</span></div>}
          </div>
        </div>

        {settings.bankDetails && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-xl text-xs">
            <div className="font-semibold text-indigo-700 mb-1">Bank / UPI Details</div>
            <div className="text-gray-700 whitespace-pre-line">{settings.bankDetails}</div>
          </div>
        )}
        {notes && <div className="mt-3 text-xs text-gray-500">Notes: {notes}</div>}
        <div className="mt-5 text-center text-xs text-gray-400">Thank you for your business! 🙏</div>
      </div>
    </div>
  );

  /* ── CREATE / EDIT FORM ────────────────────────────────────────── */
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={()=>navigate('/billing')} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600"><ArrowLeft size={18}/></button>
        <h1 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-5 max-w-2xl mx-auto space-y-4">
        {/* Type / Number / Date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-gray-400 block mb-1">Invoice Type</label>
            <select value={type} onChange={e=>setType(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400">
              {INV_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Invoice #</label>
            <input value={number} onChange={e=>setNumber(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
          </div>
        </div>

        {/* Party */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">{type==='purchase'?'Supplier':'Customer / Client'}</label>
          <div className="relative">
            <input value={partySearch}
              onChange={e=>{ setPartySearch(e.target.value); setPartyId(''); setPartyName(''); setPartyPhone(''); }}
              placeholder={`Type name or phone to search...`}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
            {/* Dropdown */}
            {(partyResults.length > 0 || (partySearch && !partyId)) && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-20 mt-1 overflow-hidden">
                {partyResults.map(p=>(
                  <button key={p.id} onClick={()=>selectParty(p)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 flex justify-between border-b border-gray-50 last:border-0">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="text-gray-400 text-xs">{p.phone}</span>
                  </button>
                ))}
                {partySearch && !partyId && (
                  <button onClick={()=>setShowAddParty(true)}
                    className="w-full text-left px-3 py-2.5 text-sm bg-indigo-50 hover:bg-indigo-100 flex items-center gap-2 text-indigo-700 font-medium">
                    <UserPlus size={13}/> Add "{partySearch}" as new client
                  </button>
                )}
              </div>
            )}
          </div>
          {partyId && (
            <div className="mt-2 flex items-center gap-2 bg-green-50 px-3 py-2 rounded-xl text-xs text-green-700">
              <span className="font-semibold">✓ {partyName}</span>
              <input value={partyPhone} onChange={e=>setPartyPhone(e.target.value)} placeholder="Phone (optional)"
                className="ml-auto px-2 py-1 bg-white border rounded-lg text-gray-700 text-xs w-32 focus:outline-none"/>
            </div>
          )}
        </div>

        {/* Items */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Items / Products</label>
          <div className="space-y-2">
            {items.map((item, idx)=>(
              <div key={idx} className="border border-gray-100 rounded-xl p-3 bg-gray-50 relative">
                {/* Product name row */}
                <div className="relative mb-2">
                  <input value={item.name}
                    onChange={e=>{ updateItem(idx,'name',e.target.value); searchProds(e.target.value,idx); }}
                    onBlur={()=>setTimeout(()=>{ setProdSugg([]); setActiveProdIdx(null); },160)}
                    placeholder="Product / item name"
                    className="w-full px-3 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
                  {activeProdIdx===idx && (prodSugg.length > 0 || item.name) && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-20 mt-1 overflow-hidden">
                      {prodSugg.map(p=>(
                        <button key={p.id} onMouseDown={()=>selectProd(p,idx)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex justify-between border-b border-gray-50 last:border-0">
                          <span className="font-medium text-gray-800">{p.name} <span className="text-gray-400 font-normal text-xs">{p.brand}</span></span>
                          <span className="text-green-700 font-semibold text-xs">₹{p.price} · {p.stock} {p.unit}</span>
                        </button>
                      ))}
                      {item.name && (
                        <button onMouseDown={()=>{ setNewProdName(item.name); setShowAddProd(true); setProdSugg([]); }}
                          className="w-full text-left px-3 py-2 text-sm bg-green-50 hover:bg-green-100 flex items-center gap-2 text-green-700 font-medium">
                          <PackagePlus size={13}/> Add "{item.name}" as new product
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Qty / Unit / Price row */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Qty</label>
                    <input type="number" min="0" value={item.qty} onChange={e=>updateItem(idx,'qty',e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Unit</label>
                    <select value={item.unit} onChange={e=>updateItem(idx,'unit',e.target.value)}
                      className="w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none">
                      {UNITS.map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Price ₹</label>
                    <input type="number" min="0" value={item.price} onChange={e=>updateItem(idx,'price',e.target.value)}
                      placeholder="Enter price"
                      className="w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
                  </div>
                </div>
                {/* Amount */}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">Amount</span>
                  <span className="font-bold text-gray-800 text-sm">₹{(parseFloat(item.amount)||0).toFixed(0)}</span>
                </div>
                {/* Delete item button */}
                <button onClick={()=>removeItem(idx)}
                  className="absolute top-2.5 right-2.5 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
          <button onClick={()=>setItems([...items, emptyItem()])}
            className="mt-3 flex items-center gap-2 text-indigo-600 text-sm font-medium hover:underline">
            <Plus size={15}/> Add Item
          </button>
        </div>

        {/* Total */}
        <div className="bg-indigo-50 rounded-xl p-4 flex justify-end">
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">Total Amount</div>
            <div className="text-2xl font-black text-indigo-700">₹{total.toFixed(2)}</div>
          </div>
        </div>

        {/* Payment mode */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Payment Mode</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_MODES.map(m=>(
              <button key={m} onClick={()=>setPaymentMode(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-colors
                ${paymentMode===m?'bg-indigo-600 text-white border-indigo-600':'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Amount paid */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Amount Paid <span className="text-gray-300">(blank = full payment / credit = leave blank)</span>
          </label>
          <input type="number" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)}
            placeholder={`Full amount: ₹${total.toFixed(0)}`}
            className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
          {amountPaid && balance > 0 && (
            <div className="mt-2 text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl">
              Balance Due: ₹{balance.toFixed(2)} · Status: {status}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Any notes..."
            className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none"/>
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
            <Save size={16}/>{saving ? 'Saving...' : 'Save Invoice'}
          </button>
          <button onClick={()=>navigate('/billing')} className="px-4 py-3 border rounded-xl text-gray-500 hover:bg-gray-50 text-sm">
            Cancel
          </button>
        </div>
      </div>

      {showAddParty && (
        <AddPartyModal initialName={partySearch}
          onSave={p=>{ setAllParties(prev=>[...prev,p]); selectParty(p); setShowAddParty(false); }}
          onCancel={()=>setShowAddParty(false)}/>
      )}
      {showAddProd && (
        <AddProductModal initialName={newProdName}
          onSave={prod=>{ if(activeProdIdx!==null) selectProd(prod,activeProdIdx); setShowAddProd(false); }}
          onCancel={()=>setShowAddProd(false)}/>
      )}
    </div>
  );
}
