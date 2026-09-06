import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { Search, MapPin, Tag, User, MessageSquare, Star, Plus, ShieldCheck, ShoppingBag, X, CreditCard, Phone } from 'lucide-react';
import { MarketplaceItem } from '../types';

interface MarketplaceSectionProps {
  user?: any;
  authToken?: string;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

export const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({ user, authToken, onShowToast }) => {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<'electronics' | 'property' | 'vehicles' | 'fashion' | 'others'>('electronics');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [imageLink, setImageLink] = useState('');

  // Checkout
  const [showCheckout, setShowCheckout] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'evc' | 'zaad' | 'edahab'>('cod');
  const [orderNote, setOrderNote] = useState('');
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadItems = async () => {
    try {
      const res = await axios.get('/api/marketplace/items');
      setItems(res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (user) {
      setBuyerName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
      setBuyerPhone(user.phone || '');
    }
  }, [user]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !location) return;
    if (!authToken) {
      onShowToast?.(language === 'so' ? 'Fadlan soo gal si aad u iibiso' : 'Please login to sell', 'error');
      return;
    }
    try {
      const res = await axios.post('/api/marketplace/items', {
        title,
        price,
        category,
        location,
        description: desc,
        imageUrl: imageLink || '/somluul_logo.png'
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      setItems(prev => [res.data, ...prev]);
      setShowForm(false);
      setTitle(''); setPrice(''); setDesc(''); setLocation(''); setImageLink('');
      onShowToast?.(language === 'so' ? 'Alaabta waa la soo geliyay!' : 'Listing published!', 'success');
    } catch {
      onShowToast?.(language === 'so' ? 'Khalad ayaa dhacay' : 'Failed to create listing', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedItem || !buyerName || !buyerPhone) return;
    if (!authToken) {
      onShowToast?.(language === 'so' ? 'Fadlan soo gal' : 'Please login', 'error');
      return;
    }
    setOrderPlacing(true);
    try {
      const res = await axios.post('/api/marketplace/orders', {
        itemId: selectedItem.id,
        buyerName,
        buyerPhone,
        buyerAddress,
        paymentMethod,
        note: orderNote
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      setOrderSuccess(res.data.order);
      setShowCheckout(false);
      onShowToast?.(
        language === 'so'
          ? `Dalabka waa la xaqiijiyay! (${paymentMethod.toUpperCase()})`
          : `Order confirmed! (${paymentMethod.toUpperCase()})`,
        'success'
      );
    } catch {
      onShowToast?.(language === 'so' ? 'Dalabka wuu fashilmay' : 'Order failed', 'error');
    } finally {
      setOrderPlacing(false);
    }
  };

  const loadMyOrders = async () => {
    if (!authToken) return;
    setOrdersLoading(true);
    try {
      const res = await axios.get('/api/marketplace/orders', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setMyOrders(Array.isArray(res.data) ? res.data : []);
      setShowOrders(true);
    } catch {
      setMyOrders([]);
      setShowOrders(true);
    } finally {
      setOrdersLoading(false);
    }
  };

  const filtered = items.filter(item => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchQ = !q || item.title.toLowerCase().includes(q) || (item.location || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const cats = [
    { id: 'all', label: language === 'so' ? 'Dhammaan' : 'All' },
    { id: 'electronics', label: language === 'so' ? 'Elektaroonig' : 'Electronics' },
    { id: 'property', label: language === 'so' ? 'Guryo' : 'Property' },
    { id: 'vehicles', label: language === 'so' ? 'Gawaarida' : 'Vehicles' },
    { id: 'fashion', label: language === 'so' ? 'Dharka' : 'Fashion' },
    { id: 'others', label: language === 'so' ? 'Kale' : 'Others' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/60 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={22} className="text-indigo-600" />
            {language === 'so' ? 'Suuqa SomLuul' : 'SomLuul Marketplace'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'so' ? 'Iibso ama iibi – dalab dhab ah (COD / EVC / Zaad)' : 'Buy or sell – real orders (COD / EVC / Zaad)'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadMyOrders}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--sl-bg-muted)] text-[var(--sl-text)] border border-[var(--sl-border)] rounded-xl text-sm font-bold hover:bg-[var(--sl-bg-hover)]"
          >
            {ordersLoading ? '...' : (language === 'so' ? 'Dalabadayda' : 'My Orders')}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-xl text-sm font-bold shadow-sm"
          >
            <Plus size={16} /> {language === 'so' ? 'Iibi Alaab' : 'Sell Item'}
          </button>
        </div>
      </div>

      {showOrders && (
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/60 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {language === 'so' ? 'Dalabadayda' : 'My Orders'} ({myOrders.length})
            </h3>
            <button type="button" onClick={() => setShowOrders(false)} className="text-xs font-semibold text-gray-500 hover:underline">
              {language === 'so' ? 'Xir' : 'Close'}
            </button>
          </div>
          {myOrders.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">
              {language === 'so' ? 'Weli dalab ma jiro' : 'No orders yet'}
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {myOrders.map((o: any) => (
                <div key={o.id} className="p-3 rounded-xl bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-100 dark:border-gray-800 text-xs space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-gray-900 dark:text-white truncate">{o.itemTitle || o.title}</span>
                    <span className="font-bold text-indigo-600 shrink-0">{o.itemPrice || o.price}</span>
                  </div>
                  <p className="text-gray-500">
                    {language === 'so' ? 'Xaalad' : 'Status'}: <strong>{o.status || 'confirmed'}</strong>
                    {' · '}
                    {(o.paymentMethod || 'cod').toUpperCase()}
                  </p>
                  <p className="text-gray-400">
                    {o.buyerName ? `${language === 'so' ? 'Iibsadaha' : 'Buyer'}: ${o.buyerName}` : ''}
                    {o.sellerName ? ` · ${language === 'so' ? 'Iibiyaha' : 'Seller'}: ${o.sellerName}` : ''}
                  </p>
                  {o.created_at && (
                    <p className="text-gray-400">{new Date(o.created_at).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {cats.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === c.id
                ? 'bg-[var(--somluul-primary)] text-white shadow-sm'
                : 'bg-white dark:bg-[var(--sl-bg-card)] text-gray-500 border border-gray-100 dark:border-gray-800'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder={language === 'so' ? 'Raadi alaab...' : 'Search items...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-100 p-12 rounded-2xl text-center">
          <ShoppingBag className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-sm text-gray-500 font-medium">
            {language === 'so' ? 'Weli ma jiraan alaabo. Noqo kan ugu horreeya ee iibiya!' : 'No items yet. Be the first to sell!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => { setSelectedItem(item); setOrderSuccess(null); }}
              className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-100 dark:border-gray-850 rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all flex flex-col"
            >
              <div className="h-40 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                <img src={item.imageUrl || '/somluul_logo.png'} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex flex-col grow">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2">{item.title}</h3>
                <p className="text-indigo-600 font-extrabold text-base mt-1">{item.price}</p>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-2">
                  <MapPin size={11} /> {item.location}
                </div>
                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-50 dark:border-gray-800/40">
                  <div className="w-6 h-6 rounded-full bg-[var(--somluul-primary)] text-white text-[9px] font-bold flex items-center justify-center">
                    {(item.sellerName || 'S')[0]}
                  </div>
                  <span className="text-[11px] text-gray-500 truncate">{item.sellerName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item detail + buy */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="h-48 bg-gray-100 overflow-hidden relative">
              <img src={selectedItem.imageUrl || '/somluul_logo.png'} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setSelectedItem(null)} className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-1.5"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">{selectedItem.title}</h3>
              <p className="text-2xl font-black text-indigo-600">{selectedItem.price}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {selectedItem.location}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{selectedItem.description}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User size={14} /> {selectedItem.sellerName}
              </div>

              {orderSuccess ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4 text-center space-y-1">
                  <ShieldCheck className="mx-auto text-green-600" size={28} />
                  <p className="font-bold text-green-700 dark:text-green-400 text-sm">
                    {language === 'so' ? 'Dalabka waa la xaqiijiyay!' : 'Order confirmed!'}
                  </p>
                  <p className="text-[11px] text-gray-500">ID: {orderSuccess.id}</p>
                  <p className="text-[11px] text-gray-500">
                    {orderSuccess.paymentMethod === 'cod'
                      ? (language === 'so' ? 'Lacag marka la keenayo (COD)' : 'Cash on delivery')
                      : `${String(orderSuccess.paymentMethod).toUpperCase()} – ${language === 'so' ? 'dir lacagta number-ka iibiyaha' : 'send money to seller phone'}`}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-3 bg-[var(--somluul-primary)] hover:brightness-110 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  <CreditCard size={16} />
                  {language === 'so' ? 'Dalbo / Iibso Hadda' : 'Order / Buy Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && selectedItem && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-gray-900 dark:text-white">{language === 'so' ? 'Xaqiiji Dalabka' : 'Confirm Order'}</h3>
              <button onClick={() => setShowCheckout(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-500">{selectedItem.title} — <strong className="text-indigo-600">{selectedItem.price}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Magaca</label>
                <input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full mt-1 text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Phone size={10} /> Telefoon</label>
                <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="61XXXXXXX" className="w-full mt-1 text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Cinwaanka / Address</label>
                <input value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} className="w-full mt-1 text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Habka lacag bixinta</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['cod', 'COD (Keen)'],
                    ['evc', 'EVC Plus'],
                    ['zaad', 'Zaad'],
                    ['edahab', 'eDahab'],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        paymentMethod === id
                          ? 'bg-[var(--somluul-primary)] text-white border-[var(--somluul-primary)]'
                          : 'bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Faahfaahin (ikhtiyaari)</label>
                <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)} rows={2} className="w-full mt-1 text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white resize-none" />
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={orderPlacing || !buyerName || !buyerPhone}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
            >
              {orderPlacing
                ? '...'
                : (language === 'so' ? 'Xaqiiji oo Dir Dalabka' : 'Confirm & Place Order')}
            </button>
          </div>
        </div>
      )}

      {/* Create listing form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-850 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base">{language === 'so' ? 'Iibi Alaab' : 'Sell Item'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={handleCreateListing} className="space-y-3">
              <input required placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white" />
              <input required placeholder="Price e.g. 50" value={price} onChange={e => setPrice(e.target.value)} className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white" />
              <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white">
                <option value="electronics">Electronics</option>
                <option value="property">Property</option>
                <option value="vehicles">Vehicles</option>
                <option value="fashion">Fashion</option>
                <option value="others">Others</option>
              </select>
              <input required placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white" />
              <input placeholder="Image URL (optional)" value={imageLink} onChange={e => setImageLink(e.target.value)} className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white" />
              <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-white resize-none" />
              <button type="submit" className="w-full py-2.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white font-bold rounded-xl text-sm">
                {language === 'so' ? 'Soo geli Suuqa' : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
