import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { AppUser, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

async function getOrCreateUser(user: User): Promise<AppUser> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, { lastLogin: Timestamp.now() });
    return { ...userSnap.data(), uid: user.uid } as AppUser;
  }

  // New user — role determined solely by admin email env var
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const role: UserRole = user.email === adminEmail ? 'admin' : 'viewer';

  const newUser: AppUser = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    role,
    pinHash: null,
    pinSet: false,
    createdAt: Timestamp.now(),
    lastLogin: Timestamp.now(),
  };

  await setDoc(userRef, newUser);
  return newUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setAppUser({ ...userSnap.data(), uid: currentUser.uid } as AppUser);
    }
  };

  useEffect(() => {
    // Handle redirect result first (after Google redirects back)
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        try {
          const appUserData = await getOrCreateUser(result.user);
          setAppUser(appUserData);
        } catch (error) {
          console.error('Error creating user after redirect:', error);
        }
      }
    }).catch((error) => {
      console.error('Redirect result error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const appUserData = await getOrCreateUser(user);
          setAppUser(appUserData);
        } catch (error) {
          console.error('Error getting/creating user:', error);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    // Use redirect instead of popup — avoids iframe/gapi blocking issues
    await signInWithRedirect(auth, googleProvider);
    // Page will redirect to Google; execution stops here
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setAppUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    appUser,
    loading,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
