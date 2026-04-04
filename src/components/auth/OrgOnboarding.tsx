import { useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

// Migrates all existing docs that have no orgId to the given org.
// Safe to call multiple times — only touches docs missing the field.
async function migrateOrphanedDocs(orgId: string) {
  const COLLECTIONS = ['transactions', 'entities', 'categories', 'userLogs', 'emiLoans'];
  for (const col of COLLECTIONS) {
    const snap = await getDocs(collection(db, col));
    const orphans = snap.docs.filter(d => !d.data().orgId);
    if (orphans.length === 0) continue;
    const batch = writeBatch(db);
    for (const d of orphans) batch.update(d.ref, { orgId });
    await batch.commit();
  }
}

export default function OrgOnboarding() {
  const { appUser, refreshUser, signOut } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [orgName, setOrgName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [migrating, setMigrating] = useState(false);

  const handleCreate = async () => {
    if (!orgName.trim()) { setError('Organization name is required.'); return; }
    if (!appUser) return;
    setLoading(true);
    setError('');
    try {
      const orgRef = await addDoc(collection(db, 'organizations'), {
        name: orgName.trim(),
        createdBy: appUser.uid,
        createdAt: Timestamp.now(),
      });

      await updateDoc(doc(db, 'users', appUser.uid), {
        orgId: orgRef.id,
        role: 'admin',
      });

      // Migrate any pre-existing data to this org
      setMigrating(true);
      await migrateOrphanedDocs(orgRef.id);
      setMigrating(false);

      await refreshUser();
    } catch (err) {
      console.error(err);
      setError('Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
      setMigrating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code) { setError('Organization code is required.'); return; }
    if (!appUser) return;
    setLoading(true);
    setError('');
    try {
      const orgSnap = await getDoc(doc(db, 'organizations', code));
      if (!orgSnap.exists()) {
        setError('Organization not found. Check the code and try again.');
        return;
      }
      await updateDoc(doc(db, 'users', appUser.uid), {
        orgId: code,
        role: 'pending',
      });
      await refreshUser();
    } catch (err) {
      console.error(err);
      setError('Failed to join organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Set Up Your Organization</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Hi {appUser?.displayName?.split(' ')[0]}! Create a new organization or join an existing one.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 mb-6">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              {t === 'create' ? '+ Create Organization' : 'Join with Code'}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {tab === 'create' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Kishan Enterprise"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You'll become the admin. Share your organization's code with your team so they can join.
            </p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {migrating ? 'Migrating existing data…' : loading ? 'Creating…' : 'Create Organization'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Paste the code shared by your admin"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your request will be pending until the org admin approves you.
            </p>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {loading ? 'Joining…' : 'Request to Join'}
            </button>
          </div>
        )}

        <button
          onClick={signOut}
          className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
