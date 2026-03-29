import { useCallback } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useActivityLog() {
  const { appUser } = useAuth();

  const logActivity = useCallback(
    async (action: string, page: string, details?: string) => {
      if (!appUser) return;

      try {
        await addDoc(collection(db, 'userLogs'), {
          userId: appUser.uid,
          userEmail: appUser.email,
          action,
          page,
          timestamp: Timestamp.now(),
          details: details || null,
        });
      } catch (error) {
        // Silently fail - logging should not break the app
        console.warn('Failed to log activity:', error);
      }
    },
    [appUser]
  );

  return { logActivity };
}
