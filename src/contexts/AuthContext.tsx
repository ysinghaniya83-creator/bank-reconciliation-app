import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

function buildFallbackUser(user: User): AppUser {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const role: UserRole = user.email === adminEmail ? 'admin' : 'pending';
  return {
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
}

async function syncUserWithFirestore(user: User): Promise<AppUser> {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      updateDoc(userRef, { lastLogin: Timestamp.now() }).catch(() => {});
      return { ...userSnap.data(), uid: user.uid } as AppUser;
    }
    // New user — create their profile
    const newUser = buildFallbackUser(user);
    await setDoc(userRef, newUser);
    return newUser;
  } catch (err) {
    console.warn('Firestore sync failed, using auth profile:', err);
    return buildFallbackUser(user);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!currentUser) return;
    const synced = await syncUserWithFirestore(currentUser);
    setAppUser(synced);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const appUserData = await syncUserWithFirestore(user);
        setCurrentUser(user);
        setAppUser(appUserData);
      } else {
        setCurrentUser(null);
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    // signInWithPopup triggers onAuthStateChanged on success — no extra handling needed
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setAppUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, appUser, loading, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
