import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Transaction, FilterState } from '../../types';
import { formatCurrency, formatDate, CATEGORIES, ENTITIES } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import TransactionForm from './TransactionForm';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

const emptyFilter: FilterState = {
  dateFrom: '',
  dateTo: '',
  entityName: '',
  category: '',
};

export default function DailyLedger() {
  const { appUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterState>(emptyFilter);
  const [showForm, setShowForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [csvError, setCsvError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = appUser?.role === 'admin' || appUser?.role === 'editor';

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const txns: Transaction[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Transaction[];
      setTransactions(txns);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setDeleteConfirm(null);
      loadTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Failed to delete transaction.');
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => setFilters(emptyFilter);

  // Apply filters
  const filteredTxns = transactions.filter(txn => {
    const txnDate = txn.date.toDate();

    if (filters.dateFrom) {
      const from = startOfDay(parseISO(filters.dateFrom));
      if (txnDate < from) return false;
    }
    if (filters.dateTo) {
      const to = endOfDay(parseISO(filters.dateTo));
      if (txnDate > to) return false;
    }
    if (filters.entityName && txn.entityName !== filters.entityName) return false;
    if (filters.category && txn.category !== filters.category) return false;

    return true;
  });

  // Sort by date desc
  const sortedTxns = [...filteredTxns].sort(
    (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
  );

  // Totals
  const totalCredit = filteredTxns.reduce((sum, t) => sum + (t.credit || 0), 0);
  const totalDebit = filteredTxns.reduce((sum, t) => sum + (t.debit || 0), 0);

  // CSV Import Handler
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appUser) return;
    setCsvError('');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setCsvError('CSV file is empty or has no data rows.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const entityIdx = headers.findIndex(h => h.includes('entity'));
      const descIdx = headers.findIndex(h => h.includes('description') || h.includes('desc'));
      const catIdx = headers.findIndex(h => h.includes('category') || h.includes('cat'));
      const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('in'));
      const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('out'));

      if (dateIdx === -1 || entityIdx === -1) {
        setCsvError('CSV must have Date and Entity Name columns.');
        return;
      }

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 2) continue;

        const dateStr = dateIdx !== -1 ? cols[dateIdx] : '';
        const entityName = entityIdx !== -1 ? cols[entityIdx] : '';

        if (!dateStr || !entityName) continue;

        let dateObj: Date;
        try {
          dateObj = new Date(dateStr);
          if (isNaN(dateObj.getTime())) continue;
          dateObj.setHours(12, 0, 0, 0);
        } catch {
          continue;
        }

        const creditVal = creditIdx !== -1 && cols[creditIdx] ? parseFloat(cols[creditIdx]) : NaN;
        const debitVal = debitIdx !== -1 && cols[debitIdx] ? parseFloat(cols[debitIdx]) : NaN;
        const credit: number | null = !isNaN(creditVal) && creditVal > 0 ? creditVal : null;
        const debit: number | null = !isNaN(debitVal) && debitVal > 0 ? debitVal : null;

        const txnRef = await addDoc(collection(db, 'transactions'), {
          date: Timestamp.fromDate(dateObj),
          entityName,
          description: descIdx !== -1 ? cols[descIdx] : '',
          category: catIdx !== -1 ? cols[catIdx] : 'Other',
          credit,
          debit,
          createdBy: appUser.uid,
          createdAt: Timestamp.now(),
          updatedBy: null,
          updatedAt: null,
        });
        await updateDoc(txnRef, { id: txnRef.id });
        imported++;
      }

      if (imported > 0) {
        loadTransactions();
      } else {
        setCsvError('No valid rows found in CSV.');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      setCsvError('Failed to import CSV. Please check the format.');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Daily Ledger</h3>
          <p className="text-gray-500 text-sm">All transactions across entities</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import CSV
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvImport}
              />
            </label>
            <button
              onClick={() => { setEditingTxn(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Transaction
            </button>
          </div>
        )}
      </div>

      {/* CSV error */}
      {csvError && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm flex items-center justify-between">
          <span>{csvError}</span>
          <button onClick={() => setCsvError('')} className="ml-2 text-orange-500 hover:text-orange-700">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">From Date</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">To Date</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Entity</label>
            <select
              name="entityName"
              value={filters.entityName}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              {ENTITIES.map(e => (
                <option key={e.name} value={e.name}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
          <span>{sortedTxns.length} transactions</span>
          <span className="text-green-600 font-medium">Credit: {formatCurrency(totalCredit)}</span>
          <span className="text-red-600 font-medium">Debit: {formatCurrency(totalDebit)}</span>
          <span className={`font-medium ${totalCredit - totalDebit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            Net: {formatCurrency(totalCredit - totalDebit)}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        </div>
      ) : sortedTxns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 font-medium">No transactions found</p>
          <p className="text-gray-400 text-sm mt-1">
            {canEdit ? 'Add a transaction to get started.' : 'No data to display.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Entity</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-green-300">Credit ₹</th>
                  <th className="text-right px-4 py-3 font-semibold text-red-300">Debit ₹</th>
                  {canEdit && <th className="text-center px-4 py-3 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedTxns.map((txn, index) => (
                  <tr
                    key={txn.id}
                    className={`border-b border-gray-100 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(txn.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-xs leading-tight">
                          {txn.entityName.split(' | ')[0]}
                        </p>
                        <p className="text-xs text-gray-400">{txn.entityName.split(' | ')[1]}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">
                      <p className="truncate">{txn.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                        {txn.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {txn.credit ? (
                        <span className="text-green-600 font-semibold">{formatCurrency(txn.credit)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {txn.debit ? (
                        <span className="text-red-600 font-semibold">{formatCurrency(txn.debit)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setEditingTxn(txn); setShowForm(true); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(txn.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold text-gray-700 border-t-2 border-gray-300">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm">TOTALS ({sortedTxns.length} rows)</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totalCredit)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totalDebit)}</td>
                  {canEdit && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          transaction={editingTxn}
          onSuccess={() => {
            setShowForm(false);
            setEditingTxn(null);
            loadTransactions();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingTxn(null);
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Transaction</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
