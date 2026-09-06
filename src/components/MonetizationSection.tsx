import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { Coins, Plus, DollarSign, Building2, Sparkles, Play, Pause, Wallet } from 'lucide-react';

interface Props {
  user?: any;
  authToken?: string;
  onShowToast?: (m: string, t: 'success' | 'error') => void;
}

const SOMALI_BANKS = [
  'Salaam Somali Bank', 'Premier Bank', 'Dahabshiil Bank', 'Amal Bank',
  'IBS Bank', 'Agro Bank', 'MyBank', 'EVC Plus (Hormuud)', 'Zaad (Telesom)', 'eDahab'
];
const WORLD_BANKS = [
  'Chase', 'Bank of America', 'HSBC', 'Barclays', 'Deutsche Bank',
  'PayPal', 'Wise', 'Revolut', 'Other International'
];

export const MonetizationSection: React.FC<Props> = ({ user, authToken, onShowToast }) => {
  const { language } = useLanguage();
  const [wallet, setWallet] = useState<any>({ balance: 0, coins: 0, earningsThisMonth: 0, totalEarned: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [showAdForm, setShowAdForm] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTopup, setShowTopup] = useState(false);

  const [adTitle, setAdTitle] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [destUrl, setDestUrl] = useState('https://');
  const [budget, setBudget] = useState('10');
  const [country, setCountry] = useState('Somalia');

  const [wdAmount, setWdAmount] = useState('');
  const [bankName, setBankName] = useState(SOMALI_BANKS[0]);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [wdCountry, setWdCountry] = useState('Somalia');
  const [topupAmount, setTopupAmount] = useState('10');
  const [topupMethod, setTopupMethod] = useState('stripe');

  const load = async () => {
    if (!authToken) return;
    try {
      const [w, ads, wd] = await Promise.all([
        axios.get('/api/wallet', { headers: { Authorization: `Bearer ${authToken}` } }),
        axios.get('/api/ads/mine', { headers: { Authorization: `Bearer ${authToken}` } }),
        axios.get('/api/wallet/withdrawals', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      setWallet(w.data);
      setCampaigns(ads.data || []);
      setWithdrawals(wd.data || []);
    } catch {}
  };

  useEffect(() => { load(); }, [authToken]);

  const handleTopup = async () => {
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) return;
    // Map UI method to real gateway
    const method = (topupMethod === 'card' || topupMethod === 'stripe') ? 'stripe' : topupMethod;
    try {
      const res = await axios.post('/api/wallet/topup', { amount, method: method === 'evc' || method === 'zaad' || method === 'edahab' ? 'stripe' : method }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data.checkoutUrl) {
        // Real Stripe Checkout
        window.location.href = res.data.checkoutUrl;
        return;
      }
      if (res.data.wallet) setWallet(res.data.wallet);
      setShowTopup(false);
      onShowToast?.(language === 'so' ? `$${amount} waa lagu daray` : `$${amount} added`, 'success');
    } catch (e: any) {
      onShowToast?.(e?.response?.data?.error || 'Top-up failed — set STRIPE_SECRET_KEY for card payments', 'error');
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/ads', {
        title: adTitle,
        bannerUrl: bannerUrl || '/somluul_logo.png',
        destinationUrl: destUrl,
        budget: Number(budget),
        country,
        language: language === 'so' ? 'Somali' : 'English'
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      setShowAdForm(false);
      setAdTitle('');
      onShowToast?.(language === 'so' ? 'Xayaysiiska waa la daabacay (aan dhibin users)' : 'Ad published (non-intrusive)', 'success');
      load();
    } catch (e: any) {
      onShowToast?.(e?.response?.data?.error || 'Need wallet balance first', 'error');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/wallet/withdraw', {
        amount: Number(wdAmount),
        bankName,
        accountName,
        accountNumber,
        country: wdCountry
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      setWallet(res.data.wallet);
      setShowWithdraw(false);
      onShowToast?.(language === 'so' ? 'Codsiga withdraw waa la diray (pending)' : 'Withdraw request submitted (pending)', 'success');
      load();
    } catch (e: any) {
      onShowToast?.(e?.response?.data?.error || 'Withdraw failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet card */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1">
              <Wallet size={14} /> {language === 'so' ? 'Balance-kaaga' : 'Your Wallet'}
            </div>
            <div className="text-3xl font-black mt-1">${Number(wallet.balance || 0).toFixed(2)}</div>
            <div className="text-sm text-white/80 mt-1 flex gap-3">
              <span className="flex items-center gap-1"><Coins size={14} /> {wallet.coins || 0} coins</span>
              <span>{language === 'so' ? 'Bishaan' : 'This month'}: ${Number(wallet.earningsThisMonth || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setShowTopup(true)} className="px-3 py-1.5 bg-white text-emerald-700 text-xs font-bold rounded-lg">
              + {language === 'so' ? 'Ku dar lacag' : 'Top up'}
            </button>
            <button onClick={() => setShowWithdraw(true)} className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-lg border border-white/30">
              {language === 'so' ? 'Withdraw' : 'Withdraw'}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-white/60 mt-4">
          {language === 'so'
            ? 'Hadiyadaha live: 70% creator, 30% platform (owner). Xayaysiiska: budget-ka oo dhan wuxuu u socdaa platform-ka si otomatic ah.'
            : 'Live gifts: 70% creator / 30% platform (owner). Ad spend goes to platform automatically.'}
        </p>
      </div>

      {/* Ads */}
      <div className="bg-white dark:bg-[#141b2d] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            {language === 'so' ? 'Xayaysiisyadaada' : 'Your Ads'}
          </h3>
          <button onClick={() => setShowAdForm(true)} className="flex items-center gap-1 text-xs font-bold bg-[var(--somluul-primary)] text-white px-3 py-1.5 rounded-lg">
            <Plus size={14} /> {language === 'so' ? 'Samee Ad' : 'Create Ad'}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">
          {language === 'so'
            ? 'Xayaysiisyadu waxay ka muuqdaan feed-ka si aamusnaan ah (sida Facebook) — popup ma jiro, user-ka ma dhibaan.'
            : 'Ads appear quietly in the feed (Facebook-style) — no popups, no spam.'}
        </p>
        {campaigns.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">No campaigns yet</div>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1f293d] border border-gray-100 dark:border-gray-800">
                <img src={c.bannerUrl} alt="" className="w-14 h-10 rounded object-cover" />
                <div className="grow min-w-0">
                  <div className="font-bold text-xs text-gray-800 dark:text-white truncate">{c.title}</div>
                  <div className="text-[10px] text-gray-500">
                    ${c.budget} · {c.impressions} imp · {c.clicks} clicks · {c.status}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {c.status === 'active' ? <Play size={10} className="inline" /> : <Pause size={10} className="inline" />} {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawals history */}
      <div className="bg-white dark:bg-[#141b2d] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Building2 size={18} /> {language === 'so' ? 'Withdraw-yada' : 'Withdrawals'}
        </h3>
        {withdrawals.length === 0 ? (
          <p className="text-xs text-gray-400">No withdrawals yet</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.slice(0, 10).map((w: any) => (
              <div key={w.id} className="flex justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-[#1f293d]">
                <span>${w.amount} → {w.bankName} ({w.accountNumber})</span>
                <span className={w.status === 'paid' ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top up modal */}
      {showTopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141b2d] rounded-2xl p-6 w-full max-w-sm space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">{language === 'so' ? 'Ku dar lacag' : 'Top up wallet'}</h3>
            <input type="number" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" placeholder="Amount USD" />
            <div className="flex flex-wrap gap-2">
              {['stripe', 'card'].map(m => (
                <button key={m} type="button" onClick={() => setTopupMethod(m)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${topupMethod === m ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>{m.toUpperCase()}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowTopup(false)} className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800">Cancel</button>
              <button onClick={handleTopup} className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleWithdraw} className="bg-white dark:bg-[#141b2d] rounded-2xl p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 dark:text-white">{language === 'so' ? 'Withdraw bank' : 'Withdraw to bank'}</h3>
            <input required type="number" value={wdAmount} onChange={e => setWdAmount(e.target.value)} placeholder="Amount USD" className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" />
            <select value={wdCountry} onChange={e => setWdCountry(e.target.value)} className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white">
              <option value="Somalia">Somalia</option>
              <option value="Kenya">Kenya</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="UAE">UAE</option>
              <option value="Other">Other</option>
            </select>
            <select value={bankName} onChange={e => setBankName(e.target.value)} className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white">
              <optgroup label="Somalia">
                {SOMALI_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </optgroup>
              <optgroup label="International">
                {WORLD_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </optgroup>
            </select>
            <input required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account name" className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" />
            <input required value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account / phone number" className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowWithdraw(false)} className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800">Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white">Submit</button>
            </div>
          </form>
        </div>
      )}

      {/* Ad form */}
      {showAdForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateAd} className="bg-white dark:bg-[#141b2d] rounded-2xl p-6 w-full max-w-md space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">{language === 'so' ? 'Samee xayaysiin' : 'Create ad campaign'}</h3>
            <input required value={adTitle} onChange={e => setAdTitle(e.target.value)} placeholder="Ad title" className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" />
            <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="Banner image URL" className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" />
            <input value={destUrl} onChange={e => setDestUrl(e.target.value)} placeholder="Destination URL" className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" />
            <input required type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Budget USD (from wallet)" className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" />
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Target country" className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f293d] text-gray-900 dark:text-white" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdForm(false)} className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800">Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white">Publish</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
