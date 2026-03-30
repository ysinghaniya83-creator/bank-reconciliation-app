import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Entity, Transaction } from '../../types';
import { EMI_LOANS, ACCOUNT_TO_ENTITY, getUpcomingEMIs } from '../../lib/emiData';
import { formatCurrency } from '../../lib/utils';
import { format, startOfDay } from 'date-fns';

const FINANCIER_COLORS: Record<string, string> = {
  'AXIS BANK': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'TATA MOTORS FIN': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'HDFC BANK LTD': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  'ICICI BANK': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'YESBANK': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'HINDUJA': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
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
  const [loading, setLoading] = useState(true);
  const [filterFinancier, setFilterFinancier] = useState('All');
  const [search, setSearch] = useState('');

  const today = new Date();

  useEffect(() => {
    let entitiesLoaded = false;
    let txnsLoaded = false;
    const checkDone = () => { if (entitiesLoaded && txnsLoaded) setLoading(false); };

    getDocs(collection(db, 'entities')).then(snap => {
      setEntities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entity)));
      entitiesLoaded = true;
      checkDone();
    });
    getDocs(collection(db, 'transactions')).then(snap => {
      setAllTxns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      txnsLoaded = true;
      checkDone();
    });
  }, []);

  // Compute current balances for each mapped entity
  const balanceMap: Record<string, number> = {};
  for (const [account, entityName] of Object.entries(ACCOUNT_TO_ENTITY)) {
    const entity = entities.find(e => e.name === entityName);
    if (entity) {
      balanceMap[account] = computeCurrentBalance(entity, allTxns);
    }
  }

  const upcoming7 = getUpcomingEMIs(EMI_LOANS, today, 7);
  const upcoming3 = getUpcomingEMIs(EMI_LOANS, today, 2); // 0,1,2 = today + next 2 days = 3 days window

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

  const totalMonthlyEMI = EMI_LOANS.reduce((sum, l) => sum + l.emiAmount, 0);
  const financiers = ['All', ...Array.from(new Set(EMI_LOANS.map(l => l.financier))).sort()];

  const filteredLoans = EMI_LOANS.filter(l => {
    const matchFinancier = filterFinancier === 'All' || l.financier === filterFinancier;
    const matchSearch = !search || l.truckNo.toLowerCase().includes(search.toLowerCase()) || l.financier.toLowerCase().includes(search.toLowerCase());
    return matchFinancier && matchSearch;
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">EMI Tracker</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Fleet loan EMIs — {format(today, 'dd MMMM yyyy')}</p>
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
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{EMI_LOANS.length}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">fleet vehicles</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly EMI Total</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalMonthlyEMI)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">all loans combined</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Balance</p>
          {Object.entries(balanceMap).map(([acc, bal]) => (
            <p key={acc} className={`text-xl font-bold ${bal < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatCurrency(bal)}
            </p>
          ))}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Kishan Enterprise ICICI</p>
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
          EMI_LOANS.reduce((acc, l) => {
            acc[l.financier] = (acc[l.financier] || 0) + l.emiAmount;
            return acc;
          }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]).map(([fin, amt]) => (
          <div key={fin} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2 ${FINANCIER_COLORS[fin] || 'bg-gray-100 text-gray-700'}`}>{fin}</span>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(amt)}<span className="text-xs font-normal text-gray-400">/mo</span></p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{EMI_LOANS.filter(l => l.financier === fin).length} loans</p>
          </div>
        ))}
      </div>

      {/* Loan Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2 items-center justify-between">
          <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{filteredLoans.length} Active Loans</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search truck / financier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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
                <th className="text-left px-3 py-2.5 font-semibold">Truck No</th>
                <th className="text-left px-3 py-2.5 font-semibold">Make / Model</th>
                <th className="text-left px-3 py-2.5 font-semibold">Financier</th>
                <th className="text-right px-3 py-2.5 font-semibold">EMI Amount</th>
                <th className="text-center px-3 py-2.5 font-semibold">Next EMI</th>
                <th className="text-center px-3 py-2.5 font-semibold">Remaining</th>
                <th className="text-center px-3 py-2.5 font-semibold">End Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan, i) => {
                const nextDate = nextEMIDate(loan);
                const days = daysUntil(nextDate);
                const isUrgent = days <= 2;
                const isSoon = days <= 7;
                return (
                  <tr key={loan.truckNo} className={`border-b border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">{loan.truckNo}</span>
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
              <div key={loan.truckNo} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{loan.truckNo}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${FINANCIER_COLORS[loan.financier] || 'bg-gray-100 text-gray-700'}`}>{loan.financier}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{loan.make} {loan.model} ({loan.year})</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(loan.emiAmount)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{loan.remainingEmis} EMIs left &bull; ends {format(new Date(loan.emiEndDate), 'MMM yyyy')}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${isUrgent ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : isSoon ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${format(nextDate, 'dd MMM')}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
