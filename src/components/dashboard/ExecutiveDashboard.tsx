import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Entity, Transaction, EntityBalance } from '../../types';
import { formatCurrency, getStatusLabel, OPENING_DATE } from '../../lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

function computeBalances(entityList: Entity[], allTxns: Transaction[], today: Date): EntityBalance[] {
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  return entityList.map(entity => {
    const entityTxns = allTxns.filter(t => t.entityName === entity.name);

    const prevTxns = entityTxns.filter(t => {
      const d = t.date.toDate();
      return d < todayStart;
    });

    const prevCredit = prevTxns.reduce((sum, t) => sum + (t.credit || 0), 0);
    const prevDebit = prevTxns.reduce((sum, t) => sum + (t.debit || 0), 0);
    const openingBalance = entity.openingBalance + prevCredit - prevDebit;

    const todayTxns = entityTxns.filter(t => {
      const d = t.date.toDate();
      return d >= todayStart && d <= todayEnd;
    });

    const totalCredit = todayTxns.reduce((sum, t) => sum + (t.credit || 0), 0);
    const totalDebit = todayTxns.reduce((sum, t) => sum + (t.debit || 0), 0);
    const netMovement = totalCredit - totalDebit;
    const closingBalance = openingBalance + netMovement;

    return {
      entityName: entity.name,
      bank: entity.bank,
      openingBalance,
      totalCredit,
      totalDebit,
      netMovement,
      closingBalance,
    };
  });
}

export default function ExecutiveDashboard() {
  const { orgId } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date();
  const todayStr = format(today, 'dd MMMM yyyy');

  useEffect(() => {
    let entitiesLoaded = false;
    let txnsLoaded = false;

    const checkDone = () => {
      if (entitiesLoaded && txnsLoaded) setLoading(false);
    };

    const unsubEntities = onSnapshot(
      query(collection(db, 'entities'), where('orgId', '==', orgId), orderBy('order', 'asc')),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Entity);
        setEntities(list);
        entitiesLoaded = true;
        checkDone();
      },
      err => {
        console.error('Entities snapshot error:', err);
        setError('Failed to load entity data.');
        setLoading(false);
      }
    );

    const unsubTxns = onSnapshot(
      query(collection(db, 'transactions'), where('orgId', '==', orgId)),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Transaction);
        setAllTxns(list);
        txnsLoaded = true;
        checkDone();
      },
      err => {
        console.error('Transactions snapshot error:', err);
        setError('Failed to load transaction data.');
        setLoading(false);
      }
    );

    return () => {
      unsubEntities();
      unsubTxns();
    };
  }, []);

  const balances = computeBalances(entities, allTxns, today);

  const grandTotals = balances.reduce(
    (acc, b) => ({
      openingBalance: acc.openingBalance + b.openingBalance,
      totalCredit: acc.totalCredit + b.totalCredit,
      totalDebit: acc.totalDebit + b.totalDebit,
      netMovement: acc.netMovement + b.netMovement,
      closingBalance: acc.closingBalance + b.closingBalance,
    }),
    { openingBalance: 0, totalCredit: 0, totalDebit: 0, netMovement: 0, closingBalance: 0 }
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-14 border-b border-gray-100 dark:border-gray-700 px-4 flex items-center">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-red-600 dark:text-red-400 underline text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Executive Dashboard</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">As of {todayStr}</p>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
          Base date: {format(OPENING_DATE, 'dd MMM yyyy')}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total Opening</p>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-1">{formatCurrency(grandTotals.openingBalance)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">Today's Credit</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{formatCurrency(grandTotals.totalCredit)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">Today's Debit</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{formatCurrency(grandTotals.totalDebit)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Total Closing</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{formatCurrency(grandTotals.closingBalance)}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 dark:bg-gray-900 text-white">
                <th className="text-left px-4 py-3 font-semibold">Entity / Bank</th>
                <th className="text-right px-4 py-3 font-semibold">Opening Balance</th>
                <th className="text-right px-4 py-3 font-semibold text-green-300">Credit (In)</th>
                <th className="text-right px-4 py-3 font-semibold text-red-300">Debit (Out)</th>
                <th className="text-right px-4 py-3 font-semibold">Net Movement</th>
                <th className="text-right px-4 py-3 font-semibold text-blue-300">Closing Balance</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance, index) => {
                const hasActivity = balance.totalCredit > 0 || balance.totalDebit > 0;
                const status = getStatusLabel(balance.netMovement, hasActivity);
                return (
                  <tr
                    key={balance.entityName}
                    className={`border-b border-gray-100 dark:border-gray-700 ${
                      index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
                    } hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight">
                          {balance.entityName.split(' | ')[0]}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{balance.bank}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                      {formatCurrency(balance.openingBalance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {balance.totalCredit > 0 ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(balance.totalCredit)}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {balance.totalDebit > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(balance.totalDebit)}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        balance.netMovement > 0
                          ? 'text-green-600 dark:text-green-400'
                          : balance.netMovement < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-400'
                      }`}>
                        {balance.netMovement !== 0
                          ? (balance.netMovement > 0 ? '+' : '') + formatCurrency(balance.netMovement)
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(balance.closingBalance)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold ${status.colorClass}`}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-900 text-white font-bold">
                <td className="px-4 py-3 text-sm">GRAND TOTAL</td>
                <td className="px-4 py-3 text-right">{formatCurrency(grandTotals.openingBalance)}</td>
                <td className="px-4 py-3 text-right text-green-300">{formatCurrency(grandTotals.totalCredit)}</td>
                <td className="px-4 py-3 text-right text-red-300">{formatCurrency(grandTotals.totalDebit)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={grandTotals.netMovement >= 0 ? 'text-green-300' : 'text-red-300'}>
                    {grandTotals.netMovement >= 0 ? '+' : ''}{formatCurrency(grandTotals.netMovement)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-blue-300">{formatCurrency(grandTotals.closingBalance)}</td>
                <td className="px-4 py-3 text-center text-gray-400 text-xs">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
        Formula: Closing = Opening + Credit − Debit | Opening = Base (Mar 6) + All prior transactions
      </p>
    </div>
  );
}
