import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Transaction } from '../../types';
import { formatCurrency, formatDate, CATEGORIES, ENTITIES } from '../../lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type QuickFilter = 'week' | 'month' | 'year' | 'custom';

export default function ReportsDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]);
      setLoading(false);
    });
    return unsub;
  }, []);

  const today = new Date();

  const getDateRange = () => {
    switch (quickFilter) {
      case 'week': return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'month': return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'year': return { from: startOfYear(today), to: endOfYear(today) };
      case 'custom': return {
        from: customFrom ? startOfDay(parseISO(customFrom)) : null,
        to: customTo ? endOfDay(parseISO(customTo)) : null,
      };
    }
  };

  const { from, to } = getDateRange();

  const filtered = transactions.filter(t => {
    const d = t.date.toDate();
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (entityFilter && t.entityName !== entityFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    return true;
  });

  const totalCredit = filtered.reduce((s, t) => s + (t.credit || 0), 0);
  const totalDebit = filtered.reduce((s, t) => s + (t.debit || 0), 0);
  const netMovement = totalCredit - totalDebit;

  const exportExcel = () => {
    const rows = filtered.map(t => ({
      Date: format(t.date.toDate(), 'dd/MM/yyyy'),
      Entity: t.entityName,
      Description: t.description,
      Category: t.category,
      'Credit (₹)': t.credit || '',
      'Debit (₹)': t.debit || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `bank-report-${format(today, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Bank Reconciliation Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(today, 'dd MMM yyyy')}`, 14, 30);
    if (from && to) doc.text(`Period: ${format(from, 'dd MMM yyyy')} - ${format(to, 'dd MMM yyyy')}`, 14, 36);
    doc.text(`Total Credit: ${formatCurrency(totalCredit)}   Total Debit: ${formatCurrency(totalDebit)}   Net: ${formatCurrency(netMovement)}`, 14, 44);

    autoTable(doc, {
      startY: 52,
      head: [['Date', 'Entity', 'Description', 'Category', 'Credit Rs', 'Debit Rs']],
      body: filtered.map(t => [
        format(t.date.toDate(), 'dd/MM/yy'),
        t.entityName.split(' | ')[0],
        t.description,
        t.category,
        t.credit ? formatCurrency(t.credit) : '-',
        t.debit ? formatCurrency(t.debit) : '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [31, 41, 55] },
    });
    doc.save(`bank-report-${format(today, 'yyyy-MM-dd')}.pdf`);
  };

  const quickBtnCls = (f: QuickFilter) => `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
    quickFilter === f
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
  }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reports</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{filtered.length} transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setQuickFilter('week')} className={quickBtnCls('week')}>This Week</button>
          <button onClick={() => setQuickFilter('month')} className={quickBtnCls('month')}>This Month</button>
          <button onClick={() => setQuickFilter('year')} className={quickBtnCls('year')}>This Year</button>
          <button onClick={() => setQuickFilter('custom')} className={quickBtnCls('custom')}>Custom Range</button>
        </div>
        {quickFilter === 'custom' && (
          <div className="flex flex-wrap gap-3">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-gray-500 dark:text-gray-400 self-center">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option value="">All Accounts</option>
            {ENTITIES.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => { setEntityFilter(''); setCategoryFilter(''); if (quickFilter === 'custom') { setCustomFrom(''); setCustomTo(''); } setQuickFilter('month'); }}
            className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Clear All
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Transactions</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">Total Credit</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">{formatCurrency(totalCredit)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">Total Debit</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-1">{formatCurrency(totalDebit)}</p>
        </div>
        <div className={`rounded-xl p-4 border ${netMovement >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${netMovement >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Net Movement</p>
          <p className={`text-lg font-bold mt-1 ${netMovement >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>{netMovement >= 0 ? '+' : ''}{formatCurrency(netMovement)}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No transactions found for selected filters</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 dark:bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Entity</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-green-300">Credit ₹</th>
                  <th className="text-right px-4 py-3 font-semibold text-red-300">Debit ₹</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((txn, idx) => (
                  <tr key={txn.id} className={`border-b border-gray-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'} hover:bg-blue-50 dark:hover:bg-blue-900/10`}>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">{formatDate(txn.date)}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{txn.entityName.split(' | ')[0]}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{txn.entityName.split(' | ')[1]}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate">{txn.description}</td>
                    <td className="px-4 py-2.5"><span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{txn.category}</span></td>
                    <td className="px-4 py-2.5 text-right text-xs">{txn.credit ? <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(txn.credit)}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{txn.debit ? <span className="text-red-600 dark:text-red-400 font-semibold">{formatCurrency(txn.debit)}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-800 dark:bg-gray-900 text-white font-bold">
                  <td colSpan={4} className="px-4 py-3 text-sm">TOTAL ({filtered.length} rows)</td>
                  <td className="px-4 py-3 text-right text-green-300">{formatCurrency(totalCredit)}</td>
                  <td className="px-4 py-3 text-right text-red-300">{formatCurrency(totalDebit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
