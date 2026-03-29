import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppUser, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../lib/utils';

const ROLES: UserRole[] = ['admin', 'editor', 'viewer'];

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700',
  editor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
  viewer: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
};

export default function UserManagement() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pinResetConfirm, setPinResetConfirm] = useState<string | null>(null);
  const [resettingPinId, setResettingPinId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(collection(db, 'users'));
      const userList: AppUser[] = snap.docs.map(d => d.data() as AppUser);
      // Sort by createdAt
      userList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return aTime - bTime;
      });
      setUsers(userList);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (user: AppUser, newRole: UserRole) => {
    // Prevent removing own admin role
    if (user.uid === appUser?.uid && newRole !== 'admin') {
      alert("You cannot remove your own admin role.");
      return;
    }

    setSavingId(user.uid);
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update user role.');
    } finally {
      setSavingId(null);
    }
  };

  const handleResetPin = async (userId: string) => {
    setResettingPinId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { pinSet: false, pinHash: null });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, pinSet: false } : u));
      setPinResetConfirm(null);
      setSuccess('PIN reset successfully. User will be prompted to set a new PIN on next login.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Error resetting PIN:', err);
      setError('Failed to reset PIN.');
    } finally {
      setResettingPinId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">User Management</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Role Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Role Permissions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 mb-1">Admin</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">Full access: manage users, view logs, all CRUD operations</p>
          </div>
          <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 mb-1">Editor</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">Add/edit/delete transactions, view all dashboards</p>
          </div>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 mb-1">Viewer</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">Read-only: dashboards and ledger (no edits)</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Mobile Cards */}
        <div className="block sm:hidden">
          {users.map(user => (
            <div key={user.uid} className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="flex items-center gap-3 mb-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">{user.displayName?.[0] || 'U'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                {user.uid === appUser?.uid && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">You</span>
                )}
              </div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Role</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${roleColors[user.role]}`}>
                      {user.role}
                    </span>
                    {savingId === user.uid && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(user, role)}
                      disabled={savingId === user.uid || user.role === role || (user.uid === appUser?.uid && role !== 'admin')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        user.role === role
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              {pinResetConfirm === user.uid ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-2 mt-2">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">Reset {user.displayName}'s PIN?</p>
                  <div className="flex gap-1">
                    <button onClick={() => handleResetPin(user.uid)} disabled={resettingPinId === user.uid} className="flex-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs disabled:opacity-50">
                      {resettingPinId === user.uid ? '...' : 'Confirm'}
                    </button>
                    <button onClick={() => setPinResetConfirm(null)} className="flex-1 px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setPinResetConfirm(user.uid)} className="mt-1 text-xs text-amber-600 dark:text-amber-400 hover:underline">Reset PIN</button>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Last login: {formatDateTime(user.lastLogin)}
              </p>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 dark:bg-gray-900 text-white">
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-center px-4 py-3 font-semibold">Current Role</th>
                <th className="text-center px-4 py-3 font-semibold">Change Role</th>
                <th className="text-center px-4 py-3 font-semibold">PIN</th>
                <th className="text-left px-4 py-3 font-semibold">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr
                  key={user.uid}
                  className={`border-b border-gray-100 dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-semibold text-xs">{user.displayName?.[0] || 'U'}</span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{user.displayName}</span>
                      {user.uid === appUser?.uid && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColors[user.role]}`}>
                        {user.role}
                      </span>
                      {savingId === user.uid && (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {ROLES.map(role => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(user, role)}
                          disabled={savingId === user.uid || user.role === role || (user.uid === appUser?.uid && role !== 'admin')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            user.role === role
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {pinResetConfirm === user.uid ? (
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <span className="text-xs text-amber-600 dark:text-amber-400">Reset PIN?</span>
                        <button onClick={() => handleResetPin(user.uid)} disabled={resettingPinId === user.uid} className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs disabled:opacity-50">
                          {resettingPinId === user.uid ? '...' : 'Yes'}
                        </button>
                        <button onClick={() => setPinResetConfirm(null)} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setPinResetConfirm(user.uid)} className="px-2.5 py-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 font-medium">
                        Reset PIN
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                    {formatDateTime(user.lastLogin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
