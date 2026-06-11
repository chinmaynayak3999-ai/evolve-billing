import { useEffect, useState } from 'react';
import { db } from '../db';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';

const UNITS = ['Kg','g','mg','L','ml','Box','Pack','Piece','Scoop','Bottle','Bag','Jar'];
const CATEGORIES = ['Protein','Pre-workout','BCAA','Creatine','Fat Burner','Vitamins','Mass Gainer','Amino Acids','Energy','Other'];

function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name:'',brand:'',category:'Protein',unit:'Kg',price:0,costPrice:0,gstRate:18,stock:0,minStock:5 });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{initial?.id ? 'Edit Product' : 'Add Product'}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['name','Product Name','text',2],['brand','Brand','text',2],
            ['category','Category','select',1],['unit','Unit','select',1],
            ['price','Selling Price ₹','number',1],['costPrice','Cost Price ₹','number',1],
            ['gstRate','GST %','number',1],['stock','Current Stock','number',1],
            ['minStock','Min Stock Level','number',1],
          ].map(([key,label,type,span])=>(
            <div key={key} className={span===2?'col-span-2':''}>
              <label className="text-xs text-gray-500 block mb-1">{label}</label>
              {type==='select'?
                <select value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400">
                  {(key==='category'?CATEGORIES:UNITS).map(o=><option key={o}>{o}</option>)}
                </select>:
                <input type={type} value={form[key]} onChange={e=>set(key,type==='number'?parseFloat(e.target.value)||0:e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-400"/>
              }
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={()=>onSave(form)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Save</button>
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => db.products.orderBy('name').toArray().then(setProducts);
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    if (editing?.id) await db.products.update(editing.id, form);
    else await db.products.add(form);
    setShowForm(false); setEditing(null); load();
  };

  const del = async (id) => {
    if (!confirm('Delete product?')) return;
    await db.products.delete(id);
    load();
  };

  const filtered = products.filter(p => {
    const mq = !q || p.name?.toLowerCase().includes(q.toLowerCase()) || p.brand?.toLowerCase().includes(q.toLowerCase());
    const mc = catFilter==='all' || p.category===catFilter;
    return mq && mc;
  });

  const totalValue = filtered.reduce((s,p)=>(s+(p.stock||0)*(p.costPrice||0)),0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
        <button onClick={()=>{setEditing(null);setShowForm(true);}} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700">
          <Plus size={16}/> Add Product
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{products.length}</div>
          <div className="text-xs text-gray-500">Total Products</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-green-600">₹{totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          <div className="text-xs text-gray-500">Stock Value</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-orange-500">{products.filter(p=>(p.stock||0)<=(p.minStock||0)&&p.minStock>0).length}</div>
          <div className="text-xs text-gray-500">Low Stock</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-gray-700">{products.filter(p=>(p.stock||0)===0).length}</div>
          <div className="text-xs text-gray-500">Out of Stock</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:outline-none">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length===0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package size={48} className="mx-auto mb-3 opacity-30"/>
            <p>No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Product','Brand','Category','Unit','Cost','Price','GST%','Stock','Status',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p=>(
                  <tr key={p.id} className={`hover:bg-gray-50 ${(p.stock||0)<=(p.minStock||0)&&p.minStock>0?'bg-red-50/30':''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.brand||'—'}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.category}</span></td>
                    <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                    <td className="px-4 py-3 text-gray-600">₹{p.costPrice||0}</td>
                    <td className="px-4 py-3 font-semibold">₹{p.price||0}</td>
                    <td className="px-4 py-3 text-gray-500">{p.gstRate||18}%</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${(p.stock||0)===0?'text-red-600':(p.stock||0)<=(p.minStock||0)?'text-orange-500':'text-green-600'}`}>
                        {p.stock||0}
                      </span> {p.unit}
                    </td>
                    <td className="px-4 py-3">
                      {(p.stock||0)===0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Out</span>
                       : (p.stock||0)<=(p.minStock||0) ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10}/> Low</span>
                       : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>{setEditing(p);setShowForm(true);}} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Edit2 size={14}/></button>
                        <button onClick={()=>del(p.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <ProductForm initial={editing} onSave={save} onCancel={()=>{setShowForm(false);setEditing(null);}}/>}
    </div>
  );
}
