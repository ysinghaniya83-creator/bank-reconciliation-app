import { useState, useEffect } from 'react';
import { Transaction, TransactionFormData } from '../../types';
import { CATEGORIES, ENTITIES, dateToString } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { parseISO } from 'date-fns';

interface TransactionFormProps {
  transaction?: Transaction | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const emptyForm: TransactionFormData = {
  date: dateToString(new Date()),
  entityName: '',
  description: '',
  category: '',
  credit: '',
  debit: '',
};

export default function TransactionForm({
  transaction,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { appUser } = useAuth();
  const [form, setForm] = useState<TransactionFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setForm({
        date: dateToString(transaction.date.toDate()),
        entityName: transaction.entityName,
        description: transaction.description,
        category: transaction.category,
        credit: transaction.credit !== null ? String(transaction.credit) : '',
        debit: transaction.debit !== null ? String(transaction.debit) : '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [transaction]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validate = (): boolean => {
    if (!form.date) { setError('Date is required.'); return false; }
    if (!form.entityName) { setError('Entity is required.'); return false; }
    if (!form.description.trim()) { setError('Description is required.'); return false; }
    if (!form.category) { setError('Category is required.'); return false; }

    const credit = parseFloat(form.credit);
    const debit = parseFloat(form.debit);
    const hasCredit = form.credit !== '' && !isNaN(credit) && credit > 0;
    const hasDebit = form.debit !== '' && !isNaN(debit) && debit > 0;

    if (!hasCredit && !hasDebit) {
      setError('Either credit or debit amount is required.');
      return false;
    }
    if (hasCredit && hasDebit) {
      setError('Only one of credit or debit can be filled for a transaction.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!appUser) return;

    setLoading(true);
    setError('');

    try {
      const credit = form.credit !== '' ? parseFloat(form.credit) : null;
      const debit = form.debit !== '' ? parseFloat(form.debit) : null;
      const dateObj = parseISO(form.date);
      // Set time to noon to avoid timezone issues
      dateObj.setHours(12, 0, 0, 0);
      const dateTimestamp = Timestamp.fromDate(dateObj);

      if (transaction) {
        // Update
        await updateDoc(doc(db, 'transactions', transaction.id), {
          date: dateTimestamp,
          entityName: form.entityName,
          description: form.description.trim(),
          category: form.category,
          credit: credit,
          debit: debit,
          updatedBy: appUser.uid,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create
        const newTxn = {
          date: dateTimestamp,
          entityName: form.entityName,
          description: form.description.trim(),
          category: form.category,
          credit: credit,
          debit: debit,
          createdBy: appUser.uid,
          createdAt: Timestamp.now(),
          updatedBy: null,
          updatedAt: null,
        };
        const docRef = await addDoc(collection(db, 'transactions'), newTxn);
        await updateDoc(docRef, { id: docRef.id });
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Failed to save transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Entity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity <span className="text-red-500">*</span>
            </label>
            <select
              name="entityName"
              value={form.entityName}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select entity...</option>
              {ENTITIES.map(e => (
                <option key={e.name} value={e.name}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={2}
              placeholder="Enter transaction description..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select category...</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Credit / Debit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit (In) ₹
              </label>
              <input
                type="number"
                name="credit"
                value={form.credit}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Debit (Out) ₹
              </label>
              <input
                type="number"
                name="debit"
                value={form.debit}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">Fill only one: Credit OR Debit</p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : transaction ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
