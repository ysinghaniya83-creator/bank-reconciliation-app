import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEntities } from '../../contexts/EntitiesContext';
import { useAuth } from '../../contexts/AuthContext';

interface Category {
  id: string;
  name: string;
  order: number;
}

export default function Settings() {
  const { orgId } = useAuth();
  const { entities, loading: loadingEntities } = useEntities();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Entity form
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [entityForm, setEntityForm] = useState({ name: '', bank: '', openingBalance: '' });
  const [savingEntity, setSavingEntity] = useState(false);
  const [deleteEntityConfirm, setDeleteEntityConfirm] = useState<string | null>(null);
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editEntityForm, setEditEntityForm] = useState({ name: '', bank: '', openingBalance: '' });

  // Category form
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const q = query(collection(db, 'categories'), where('orgId', '==', orgId));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category);
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(list);
      setLoadingCategories(false);
    });
    return unsub;
  }, [orgId]);

  const handleAddEntity = async () => {
    if (!entityForm.name.trim() || !entityForm.bank.trim()) {
      setError('Entity name and bank are required.');
      return;
    }
    setSavingEntity(true);
    try {
      await addDoc(collection(db, 'entities'), {
        orgId,
        name: entityForm.name.trim(),
        bank: entityForm.bank.trim(),
        openingBalance: entityForm.openingBalance ? parseFloat(entityForm.openingBalance) : 0,
        openingDate: Timestamp.fromDate(new Date(2026, 2, 6)),
        order: entities.length + 1,
      });
      setEntityForm({ name: '', bank: '', openingBalance: '' });
      setShowAddEntity(false);
      setSuccess('Entity added successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to add entity.');
    }
    setSavingEntity(false);
  };

  const handleUpdateEntity = async () => {
    if (!editEntityId) return;
    if (!editEntityForm.name.trim() || !editEntityForm.bank.trim()) {
      setError('Entity name and bank are required.');
      return;
    }
    setSavingEntity(true);
    try {
      await updateDoc(doc(db, 'entities', editEntityId), {
        name: editEntityForm.name.trim(),
        bank: editEntityForm.bank.trim(),
        openingBalance: editEntityForm.openingBalance ? parseFloat(editEntityForm.openingBalance) : 0,
      });
      setEditEntityId(null);
      setSuccess('Entity updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to update entity.');
    }
    setSavingEntity(false);
  };

  const handleDeleteEntity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'entities', id));
      setDeleteEntityConfirm(null);
      setSuccess('Entity deleted.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to delete entity.');
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      setError('Category name is required.');
      return;
    }
    setSavingCategory(true);
    try {
      await addDoc(collection(db, 'categories'), {
        orgId,
        name: categoryName.trim(),
        order: categories.length + 1,
      });
      setCategoryName('');
      setShowAddCategory(false);
      setSuccess('Category added.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to add category.');
    }
    setSavingCategory(false);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    // Check if in use within this org only
    const snap = await getDocs(query(collection(db, 'transactions'), where('orgId', '==', orgId), where('category', '==', name)));
    if (!snap.empty) {
      setError(`Cannot delete "${name}" — it's used by ${snap.size} transaction(s).`);
      setDeleteCategoryConfirm(null);
      return;
    }
    try {
      await deleteDoc(doc(db, 'categories', id));
      setDeleteCategoryConfirm(null);
      setSuccess('Category deleted.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to delete category.');
    }
  };

  const inputCls = "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage bank accounts and categories</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Bank Accounts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Bank Accounts</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{entities.length} accounts</p>
          </div>
          {!showAddEntity && (
            <button
              onClick={() => setShowAddEntity(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Account
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddEntity && (
          <div className="px-5 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">New Bank Account</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Entity Name</label>
                <input
                  type="text"
                  placeholder="e.g. Company | Bank"
                  value={entityForm.name}
                  onChange={e => setEntityForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. ICICI"
                  value={entityForm.bank}
                  onChange={e => setEntityForm(f => ({ ...f, bank: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={entityForm.openingBalance}
                  onChange={e => setEntityForm(f => ({ ...f, openingBalance: e.target.value }))}
                  className={inputCls}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddEntity} disabled={savingEntity} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {savingEntity ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setShowAddEntity(false); setEntityForm({ name: '', bank: '', openingBalance: '' }); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loadingEntities ? (
          <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {entities.map(entity => (
              <div key={entity.id}>
                {editEntityId === entity.id ? (
                  <div className="px-5 py-4 bg-yellow-50 dark:bg-yellow-900/10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" value={editEntityForm.name} onChange={e => setEditEntityForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Entity Name" />
                      <input type="text" value={editEntityForm.bank} onChange={e => setEditEntityForm(f => ({ ...f, bank: e.target.value }))} className={inputCls} placeholder="Bank" />
                      <input type="number" value={editEntityForm.openingBalance} onChange={e => setEditEntityForm(f => ({ ...f, openingBalance: e.target.value }))} className={inputCls} placeholder="Opening Balance" min="0" step="0.01" />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleUpdateEntity} disabled={savingEntity} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">{savingEntity ? '...' : 'Update'}</button>
                      <button onClick={() => setEditEntityId(null)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                ) : deleteEntityConfirm === entity.id ? (
                  <div className="px-5 py-4 bg-red-50 dark:bg-red-900/10 flex items-center justify-between">
                    <p className="text-sm text-red-700 dark:text-red-300">Delete <strong>{entity.name}</strong>? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteEntity(entity.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Delete</button>
                      <button onClick={() => setDeleteEntityConfirm(null)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{entity.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{entity.bank} · Opening: ₹{entity.openingBalance?.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setEditEntityId(entity.id); setEditEntityForm({ name: entity.name, bank: entity.bank, openingBalance: String(entity.openingBalance || 0) }); }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => setDeleteEntityConfirm(entity.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {entities.length === 0 && (
              <p className="px-5 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No accounts found. Add one above.</p>
            )}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Transaction Categories</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{categories.length} categories</p>
          </div>
          {!showAddCategory && (
            <button
              onClick={() => setShowAddCategory(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Category
            </button>
          )}
        </div>

        {showAddCategory && (
          <div className="px-5 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Category name"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                className={inputCls}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') { setShowAddCategory(false); setCategoryName(''); } }}
              />
              <button onClick={handleAddCategory} disabled={savingCategory} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                {savingCategory ? '...' : 'Add'}
              </button>
              <button onClick={() => { setShowAddCategory(false); setCategoryName(''); }} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {loadingCategories ? (
          <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {categories.map(cat => (
              deleteCategoryConfirm === cat.id ? (
                <div key={cat.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-2">
                  <p className="text-xs text-red-700 dark:text-red-300 mb-2">Delete "{cat.name}"?</p>
                  <div className="flex gap-1">
                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="flex-1 px-2 py-1 bg-red-600 text-white rounded text-xs">Yes</button>
                    <button onClick={() => setDeleteCategoryConfirm(null)} className="flex-1 px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">No</button>
                  </div>
                </div>
              ) : (
                <div key={cat.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 group">
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{cat.name}</span>
                  <button
                    onClick={() => setDeleteCategoryConfirm(cat.id)}
                    className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )
            ))}
            {categories.length === 0 && (
              <p className="col-span-full text-center text-gray-500 dark:text-gray-400 text-sm py-4">No categories. Add one above.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
