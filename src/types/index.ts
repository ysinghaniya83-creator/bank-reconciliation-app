import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'pending';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  pinHash: string | null;
  pinSet: boolean;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export interface Transaction {
  id: string;
  date: Timestamp;
  entityName: string;
  description: string;
  category: string;
  credit: number | null;
  debit: number | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string | null;
  updatedAt: Timestamp | null;
}

export interface Entity {
  id: string;
  name: string;
  bank: string;
  openingBalance: number;
  openingDate: Timestamp;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface UserLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  page: string;
  timestamp: Timestamp;
  details: string | null;
}

export interface EntityBalance {
  entityName: string;
  bank: string;
  openingBalance: number;
  totalCredit: number;
  totalDebit: number;
  netMovement: number;
  closingBalance: number;
}

export interface TransactionFormData {
  date: string;
  entityName: string;
  description: string;
  category: string;
  credit: string;
  debit: string;
}

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  entityName: string;
  category: string;
}
