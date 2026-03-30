import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Entity, Transaction, EMILoan } from '../../types';
import { EMI_LOANS, getUpcomingEMIs } from '../../lib/emiData';
import { formatCurrency } from '../../lib/utils';
import { format, startOfDay } from 'date-fns';

const FINANCIER_COLORS: Record<string, string> = {
  'AXIS BANK': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'TATA MOTORS FIN': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'HDFC BANK LTD': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  'ICICI BANK': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'YESBANK': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'HINDUJA': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  'IDFC BANK': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  'MASS FIN': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  'HDB FINANCE': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
};

const FINANCIER_LIST = ['AXIS BANK', 'TATA MOTORS FIN', 'HDFC BANK LTD', 'ICICI BANK', 'YESBANK', 'HINDUJA', 'IDFC BANK', 'MASS FIN', 'HDB FINANCE'];
const LOAN_CATEGORIES = ['Vehicle', 'Office Loan', 'MSME', 'House Loan', 'Finance', 'Other'];
const CATEGORY_COLORS: Record<string, string> = {
  'Vehicle': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  'Office Loan': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  'MSME': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  'House Loan': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  'Finance': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  'Other': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
};

type LoanFormData = Omit<EMILoan, 'id'>;

const EMPTY_FORM: LoanFormData = {
  truckNo: '',
  make: 'Eicher',
  model: '6048',
  year: new Date().getFullYear(),
  owner: 'Kishan Enterprise',
  financier: 'ICICI BANK',
  loanAmount: 0,
  loanTenure: 48,
  emiStartDate: '',
  emiDayOfMonth: 15,
  emiAmount: 0,
  emisPaid: 0,
  remainingEmis: 0,
  emiEndDate: '',
  debitedAccount: '',
  loanCategory: 'Vehicle',
};

function computeCurrentBalance(entity: Entity, allTxns: Transaction[]): number {
  const txns = allTxns.filter(t => t.entityName === entity.name);
  const totalCredit = txns.reduce((sum, t) => sum + (t.credit || 0), 0);
  const totalDebit = txns.reduce((sum, t) => sum + (t.debit || 0), 0);
  return entity.openingBalance + totalCredit - totalDebit;
}

export default function EMITracker() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<EMILoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFinancier, setFilterFinancier] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<EMILoan | null>(null);
  const [form, setForm] = useState<LoanFormData>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { appUser } = useAuth();
  const canEdit = appUser?.role === 'admin' || appUser?.role === 'editor';

  const today = new Date();

  useEffect(() => {
    let count = 0;
    const checkDone = () => { if (++count === 3) setLoading(false); };

    getDocs(collection(db, 'entities')).then(snap => {
      setEntities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entity)));
    }).catch(() => {}).finally(checkDone);

    getDocs(collection(db, 'transactions')).then(snap => {
      setAllTxns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }).catch(() => {}).finally(checkDone);

    (async () => {
      try {
        const snap = await getDocs(collection(db, 'emiLoans'));
        if (snap.empty) {
          const batch = writeBatch(db);
          for (const loan of EMI_LOANS) {
            const ref = doc(collection(db, 'emiLoans'));
            batch.set(ref, loan);
          }
          await batch.commit();
          const newSnap = await getDocs(collection(db, 'emiLoans'));
          setLoans(newSnap.docs.map(d => ({ id: d.id, ...d.data() } as EMILoan)));
        } else {
          setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() } as EMILoan)));
        }
      } catch {
        // Firestore unavailable or permission denied — fall back to static data
        setLoans(EMI_LOANS);
      } finally {
        checkDone();
      }
    })();
  }, []);

  // Compute current balances keyed by entity name
  const balanceMap: Record<string, number> = {};
  for (const entity of entities) {
    balanceMap[entity.name] = computeCurrentBalance(entity, allTxns);
  }

  const upcoming7 = getUpcomingEMIs(loans, today, 7);
  const upcoming3 = getUpcomingEMIs(loans, today, 2); // 0,1,2 = today + next 2 days = 3 days window

  // Compute warnings: group upcoming 3-day EMIs by account and check balance
  const warnings: { account: string; dueDate: Date; daysFromNow: number; dueAmount: number; balance: number; shortfall: number }[] = [];
  for (const slot of upcoming3) {
    const grouped: Record<string, number> = {};
    for (const loan of slot.loans) {
      grouped[loan.debitedAccount] = (grouped[loan.debitedAccount] || 0) + loan.emiAmount;
    }
    for (const [account, dueAmount] of Object.entries(grouped)) {
      const balance = balanceMap[account] ?? 0;
      if (balance < dueAmount) {
        warnings.push({ account, dueDate: slot.date, daysFromNow: slot.daysFromNow, dueAmount, balance, shortfall: dueAmount - balance });
      }
    }
  }

  const totalMonthlyEMI = loans.reduce((sum, l) => sum + l.emiAmount, 0);
  const financiers = ['All', ...Array.from(new Set(loans.map(l => l.financier))).sort()];

  const filteredLoans = loans.filter(l => {
    const matchFinancier = filterFinancier === 'All' || l.financier === filterFinancier;
    const matchCategory = filterCategory === 'All' || (l.loanCategory ?? 'Vehicle') === filterCategory;
    const matchSearch = !search || l.truckNo.toLowerCase().includes(search.toLowerCase()) || l.financier.toLowerCase().includes(search.toLowerCase());
    return matchFinancier && matchCategory && matchSearch;
  });

  // Next EMI date for each loan
  function nextEMIDate(loan: { emiDayOfMonth: number }): Date {
    const d = new Date(today);
    d.setDate(loan.emiDayOfMonth);
    if (d < startOfDay(today)) d.setMonth(d.getMonth() + 1);
    return d;
  }

  function daysUntil(date: Date): number {
    const diff = startOfDay(date).getTime() - startOfDay(today).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  function openAdd() {
    setEditingLoan(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(loan: EMILoan) {
    setEditingLoan(loan);
    setForm({
      truckNo: loan.truckNo,
      make: loan.make,
      model: loan.model,
      year: loan.year,
      owner: loan.owner,
      financier: loan.financier,
      loanAmount: loan.loanAmount ?? 0,
      loanTenure: loan.loanTenure,
      emiStartDate: loan.emiStartDate,
      emiDayOfMonth: loan.emiDayOfMonth,
      emiAmount: loan.emiAmount,
      emisPaid: loan.emisPaid,
      remainingEmis: loan.remainingEmis,
      emiEndDate: loan.emiEndDate,
      debitedAccount: loan.debitedAccount,
      loanCategory: loan.loanCategory ?? 'Vehicle',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = { ...form };
      if (editingLoan?.id) {
        await setDoc(doc(db, 'emiLoans', editingLoan.id), data);
        setLoans(prev => prev.map(l => l.id === editingLoan.id ? { id: editingLoan.id, ...data } : l));
      } else {
        const ref = await addDoc(collection(db, 'emiLoans'), data);
        setLoans(prev => [...prev, { id: ref.id, ...data }]);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'emiLoans', deleteId));
      setLoans(prev => prev.filter(l => l.id !== deleteId));
      setDeleteId(null);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">EMI Tracker</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Fleet loan EMIs — {format(today, 'dd MMMM yyyy')}</p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Loan
          </button>
        )}
      </div>

      {/* Low Balance Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
                  ⚠ Low Balance Alert — EMI due {w.daysFromNow === 0 ? 'today' : w.daysFromNow === 1 ? 'tomorrow' : `in ${w.daysFromNow} days`} ({format(w.dueDate, 'dd MMM yyyy')})
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  <span className="font-medium">{w.account}</span>: EMI due = <span className="font-bold">{formatCurrency(w.dueAmount)}</span> &nbsp;|&nbsp; Current balance = <span className="font-bold">{formatCurrency(w.balance)}</span> &nbsp;|&nbsp; Shortfall = <span className="font-bold text-red-700 dark:text-red-300">{formatCurrency(w.shortfall)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Loans</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{loans.length}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">fleet vehicles</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly EMI Total</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalMonthlyEMI)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">all loans combined</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Balances</p>
          {entities.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(entity => {
            const bal = balanceMap[entity.name] ?? 0;
            return (
              <p key={entity.name} className={`text-sm font-bold ${bal < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(bal)}
              </p>
            );
          })}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">all accounts</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next 7 Days EMIs</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(upcoming7.reduce((s, u) => s + u.totalAmount, 0))}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{upcoming7.reduce((s, u) => s + u.loans.length, 0)} loans due</p>
        </div>
      </div>

      {/* Upcoming EMI Schedule */}
      {upcoming7.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Upcoming EMIs — Next 7 Days</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {upcoming7.map((slot, i) => {
              const isCritical = slot.daysFromNow <= 2;
              const accountAmounts: Record<string, number> = {};
              slot.loans.forEach(l => { accountAmounts[l.debitedAccount] = (accountAmounts[l.debitedAccount] || 0) + l.emiAmount; });
              return (
                <div key={i} className={`px-4 py-3 flex items-center justify-between gap-4 ${isCritical ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isCritical ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      <span className="text-xs font-bold leading-none">{format(slot.date, 'dd')}</span>
                      <span className="text-xs leading-none opacity-75">{format(slot.date, 'MMM')}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {slot.daysFromNow === 0 ? 'Today' : slot.daysFromNow === 1 ? 'Tomorrow' : `In ${slot.daysFromNow} days`}
                        {isCritical && <span className="ml-2 text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded font-semibold">URGENT</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{slot.loans.length} loans &bull; {Object.keys(accountAmounts).join(', ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(slot.totalAmount)}</p>
                    {Object.entries(accountAmounts).map(([acc, amt]) => {
                      const bal = balanceMap[acc] ?? 0;
                      const isLow = bal < amt;
                      return (
                        <p key={acc} className={`text-xs mt-0.5 ${isLow ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-green-600 dark:text-green-400'}`}>
                          {isLow ? '⚠ Low balance' : '✓ Sufficient balance'}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financier Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(
          loans.reduce((acc, l) => {
            acc[l.financier] = (acc[l.financier] || 0) + l.emiAmount;
            return acc;
          }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]).map(([fin, amt]) => (
          <div key={fin} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2 ${FINANCIER_COLORS[fin] || 'bg-gray-100 text-gray-700'}`}>{fin}</span>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(amt)}<span className="text-xs font-normal text-gray-400">/mo</span></p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{loans.filter(l => l.financier === fin).length} loans</p>
          </div>
        ))}
      </div>

      {/* Loan Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2 items-center justify-between">
          <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{filteredLoans.length} Loans</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search ID / financier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              {LOAN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterFinancier}
              onChange={e => setFilterFinancier(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {financiers.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 dark:bg-gray-900 text-white text-xs">
                <th className="text-left px-3 py-2.5 font-semibold">Loan ID / Truck No</th>
                <th className="text-left px-3 py-2.5 font-semibold">Make / Model</th>
                <th className="text-left px-3 py-2.5 font-semibold">Financier</th>
                <th className="text-right px-3 py-2.5 font-semibold">EMI Amount</th>
                <th className="text-center px-3 py-2.5 font-semibold">Next EMI</th>
                <th className="text-center px-3 py-2.5 font-semibold">Remaining</th>
                <th className="text-center px-3 py-2.5 font-semibold">End Date</th>
                <th className="text-left px-3 py-2.5 font-semibold">Debited Acct</th>
                <th className="text-center px-3 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan, i) => {
                const nextDate = nextEMIDate(loan);
                const days = daysUntil(nextDate);
                const isUrgent = days <= 2;
                const isSoon = days <= 7;
                return (
                  <tr key={loan.id || loan.truckNo} className={`border-b border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">{loan.truckNo}</span>
                      {loan.loanCategory && loan.loanCategory !== 'Vehicle' && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[loan.loanCategory] || CATEGORY_COLORS['Other']}`}>{loan.loanCategory}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 text-xs">{loan.make} {loan.model} <span className="text-gray-400">({loan.year})</span></td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${FINANCIER_COLORS[loan.financier] || 'bg-gray-100 text-gray-700'}`}>{loan.financier}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(loan.emiAmount)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${isUrgent ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : isSoon ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : format(nextDate, 'dd MMM')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">{loan.remainingEmis} EMIs</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">{format(new Date(loan.emiEndDate), 'MMM yyyy')}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{loan.debitedAccount}</td>
                    <td className="px-3 py-2.5 text-center">
                      {canEdit && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(loan)}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(loan.id!)}
                            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="block sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {filteredLoans.map(loan => {
            const nextDate = nextEMIDate(loan);
            const days = daysUntil(nextDate);
            const isUrgent = days <= 2;
            const isSoon = days <= 7;
            return (
              <div key={loan.id || loan.truckNo} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{loan.truckNo}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${FINANCIER_COLORS[loan.financier] || 'bg-gray-100 text-gray-700'}`}>{loan.financier}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{loan.make} {loan.model} ({loan.year}) &bull; {loan.debitedAccount}</p>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(loan.emiAmount)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{loan.remainingEmis} EMIs left &bull; ends {format(new Date(loan.emiEndDate), 'MMM yyyy')}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${isUrgent ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : isSoon ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${format(nextDate, 'dd MMM')}`}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(loan)}
                      className="flex-1 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(loan.id!)}
                      className="flex-1 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editingLoan ? 'Edit Loan' : 'Add New Loan'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Loan ID / Truck No *</label>
                  <input
                    type="text"
                    value={form.truckNo}
                    onChange={e => setForm(f => ({ ...f, truckNo: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="GJ05XX0000 or FLAT-LOAN-IDFC"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Loan Category</label>
                  <select
                    value={form.loanCategory ?? 'Vehicle'}
                    onChange={e => setForm(f => ({ ...f, loanCategory: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LOAN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Owner</label>
                  <input
                    type="text"
                    value={form.owner}
                    onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Make</label>
                  <input
                    type="text"
                    value={form.make}
                    onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Financier</label>
                  <select
                    value={form.financier}
                    onChange={e => setForm(f => ({ ...f, financier: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FINANCIER_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Loan Tenure (months)</label>
                  <input
                    type="number"
                    value={form.loanTenure}
                    onChange={e => setForm(f => ({ ...f, loanTenure: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Loan Amount (₹)</label>
                  <input
                    type="number"
                    value={form.loanAmount}
                    onChange={e => setForm(f => ({ ...f, loanAmount: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">EMI Day of Month</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.emiDayOfMonth}
                    onChange={e => setForm(f => ({ ...f, emiDayOfMonth: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">EMI Start Date</label>
                  <input
                    type="date"
                    value={form.emiStartDate}
                    onChange={e => setForm(f => ({ ...f, emiStartDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">EMI End Date</label>
                  <input
                    type="date"
                    value={form.emiEndDate}
                    onChange={e => setForm(f => ({ ...f, emiEndDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">EMI Amount (₹)</label>
                  <input
                    type="number"
                    value={form.emiAmount}
                    onChange={e => setForm(f => ({ ...f, emiAmount: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">EMIs Paid</label>
                  <input
                    type="number"
                    value={form.emisPaid}
                    onChange={e => setForm(f => ({ ...f, emisPaid: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Remaining EMIs</label>
                  <input
                    type="number"
                    value={form.remainingEmis}
                    onChange={e => setForm(f => ({ ...f, remainingEmis: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Debited Account *</label>
                  <select
                    value={form.debitedAccount}
                    onChange={e => setForm(f => ({ ...f, debitedAccount: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Select account —</option>
                    {entities.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(e => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.truckNo || !form.debitedAccount}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editingLoan ? 'Update Loan' : 'Add Loan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Loan</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this loan? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
