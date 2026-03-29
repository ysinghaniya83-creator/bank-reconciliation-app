import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Entity, Transaction, EntityBalance } from '../../types';
import { formatCurrency, getStatusLabel, OPENING_DATE } from '../../lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';

export default function ExecutiveDashboard() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [balances, setBalances] = useState<EntityBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date();
  const todayStr = format(today, 'dd MMMM yyyy');

  const computeBalances = useCallback(async (entityList: Entity[]) => {
    try {
      const txnSnap = await getDocs(collection(db, 'transactions'));
      const allTxns: Transaction[] = txnSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Transaction[];

      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const result: EntityBalance[] = entityList.map(entity => {
        const entityTxns = allTxns.filter(t => t.entityName === entity.name);

        // Opening = base opening + all transactions BEFORE today
        const prevTxns = entityTxns.filter(t => {
          const d = t.date.toDate();
          return d < todayStart;
        });

        const prevCredit = prevTxns.reduce((sum, t) => sum + (t.credit || 0), 0);
        const prevDebit = prevTxns.reduce((sum, t) => sum + (t.debit || 0), 0);
        const openingBalance = entity.openingBalance + prevCredit - prevDebit;

        // Today's transactions
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

      setBalances(result);
    } catch (err) {
      console.error('Error computing balances:', err);
      setError('Failed to load balance data.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const entitiesSnap = await getDocs(collection(db, 'entities'));
        const entityList: Entity[] = entitiesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Entity)
          .sort((a, b) => a.order - b.order);
        setEntities(entityList);
        await computeBalances(entityList);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please check your Firebase configuration.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [computeBalances]);

  // Grand totals
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

  // Suppress unused variable - entities is kept in state for potential future use
  void entities;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-red-600 underline text-sm"
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
          <h3 className="text-xl font-bold text-gray-900">Executive Dashboard</h3>
          <p className="text-gray-500 text-sm">As of {todayStr}</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
          Base date: {format(OPENING_DATE, 'dd MMM yyyy')}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Opening</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{formatCurrency(grandTotals.openingBalance)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Today's Credit</p>
          <p className="text-lg font-bold text-green-700 mt-1">{formatCurrency(grandTotals.totalCredit)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wider">Today's Debit</p>
          <p className="text-lg font-bold text-red-700 mt-1">{formatCurrency(grandTotals.totalDebit)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Total Closing</p>
          <p className="text-lg font-bold text-blue-700 mt-1">{formatCurrency(grandTotals.closingBalance)}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
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
                    className={`border-b border-gray-100 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-sm leading-tight">
                          {balance.entityName.split(' | ')[0]}
                        </p>
                        <p className="text-xs text-gray-500">{balance.bank}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                      {formatCurrency(balance.openingBalance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {balance.totalCredit > 0 ? (
                        <span className="text-green-600 font-medium">{formatCurrency(balance.totalCredit)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {balance.totalDebit > 0 ? (
                        <span className="text-red-600 font-medium">{formatCurrency(balance.totalDebit)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        balance.netMovement > 0
                          ? 'text-green-600'
                          : balance.netMovement < 0
                          ? 'text-red-600'
                          : 'text-gray-400'
                      }`}>
                        {balance.netMovement !== 0
                          ? (balance.netMovement > 0 ? '+' : '') + formatCurrency(balance.netMovement)
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-blue-700">{formatCurrency(balance.closingBalance)}</span>
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
            {/* Grand Total Row */}
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

      {/* Formula note */}
      <p className="text-xs text-gray-400 text-right">
        Formula: Closing = Opening + Credit − Debit | Opening = Base (Mar 6) + All prior transactions
      </p>
    </div>
  );
}
