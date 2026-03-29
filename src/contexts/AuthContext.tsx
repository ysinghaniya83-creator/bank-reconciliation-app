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
  collection,
  getDocs,
  query,
  limit,
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

async function isFirstUser(): Promise<boolean> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, limit(1));
  const snapshot = await getDocs(q);
  return snapshot.empty;
}

async function getOrCreateUser(user: User): Promise<AppUser> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Update last login
    await updateDoc(userRef, { lastLogin: Timestamp.now() });
    return { ...userSnap.data(), uid: user.uid } as AppUser;
  }

  // Determine role
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  let role: UserRole = 'viewer';

  if (user.email === adminEmail) {
    role = 'admin';
  } else {
    const firstUser = await isFirstUser();
    if (firstUser) {
      role = 'admin';
    }
  }

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
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
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
