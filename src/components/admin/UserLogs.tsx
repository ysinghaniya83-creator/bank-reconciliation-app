import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserLog } from '../../types';
import { formatDateTime } from '../../lib/utils';
import { subMonths } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 50;

export default function UserLogs() {
  const { orgId } = useAuth();
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');

  const sixMonthsAgo = Timestamp.fromDate(subMonths(new Date(), 6));

  const loadLogs = async (isLoadMore = false, lastDocParam: QueryDocumentSnapshot | null = null) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      let q = query(
        collection(db, 'userLogs'),
        where('orgId', '==', orgId),
        where('timestamp', '>=', sixMonthsAgo),
        orderBy('timestamp', 'desc'),
        limit(PAGE_SIZE)
      );

      if (isLoadMore && lastDocParam) {
        q = query(
          collection(db, 'userLogs'),
          where('orgId', '==', orgId),
          where('timestamp', '>=', sixMonthsAgo),
          orderBy('timestamp', 'desc'),
          startAfter(lastDocParam),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const newLogs: UserLog[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as UserLog[];

      if (isLoadMore) {
        setLogs(prev => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      const lastVisible = snap.docs[snap.docs.length - 1] || null;
      setLastDoc(lastVisible);
      setHasMore(snap.docs.length === PAGE_SIZE);

    } catch (err) {
      console.error('Error loading logs:', err);
      setError('Failed to load activity logs. Make sure Firestore indexes are set up.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadLogs(false, null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredLogs = logs
    .filter(l => l.action !== 'page_visit')
    .filter(l => searchEmail ? l.userEmail.toLowerCase().includes(searchEmail.toLowerCase()) : true);

  const getActionColor = (action: string) => {
    if (action.includes('delete')) return 'bg-red-100 text-red-700';
    if (action.includes('create') || action.includes('add')) return 'bg-green-100 text-green-700';
    if (action.includes('edit') || action.includes('update')) return 'bg-blue-100 text-blue-700';
    if (action.includes('login')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-600';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Activity Logs</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Last 6 months &bull; {logs.length} entries loaded</p>
        </div>
        <button
          onClick={() => loadLogs(false, null)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
          <p className="mt-1 text-xs">Note: You may need to create a composite index in Firestore for the userLogs collection (timestamp field, descending).</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filter by email..."
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
            className="flex-1 text-sm focus:outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          {searchEmail && (
            <button onClick={() => setSearchEmail('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Showing {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
          {searchEmail ? ` matching "${searchEmail}"` : ''}
        </p>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No activity logs found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Mobile view */}
          <div className="block sm:hidden">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActionColor(log.action)}`}>
                    {log.action.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatDateTime(log.timestamp)}</span>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{log.userEmail}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{log.page}</p>
                {log.details && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{log.details}</p>}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 dark:bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold">User Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Action</th>
                  <th className="text-left px-4 py-3 font-semibold">Page</th>
                  <th className="text-left px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-100 dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'} hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200 text-sm">{log.userEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm font-mono">{log.page}</td>
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 text-center">
              <button
                onClick={() => loadLogs(true, lastDoc)}
                disabled={loadingMore}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : `Load More (${PAGE_SIZE} per page)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
