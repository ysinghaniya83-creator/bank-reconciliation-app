import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'pending';

export interface Organization {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  orgId: string | null;
  pinHash: string | null;
  pinSet: boolean;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export interface Transaction {
  id: string;
  orgId: string;
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
  orgId: string;
  name: string;
  bank: string;
  openingBalance: number;
  openingDate: Timestamp;
  order: number;
}

export interface Category {
  id: string;
  orgId: string;
  name: string;
  order: number;
}

export interface UserLog {
  id: string;
  orgId: string;
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

export interface EMILoan {
  id?: string;
  truckNo: string;
  make: string;
  model: string;
  year: number;
  owner: string;
  financier: string;
  loanAmount?: number;
  loanTenure: number;
  emiStartDate: string; // 'YYYY-MM-DD'
  emiDayOfMonth: number;
  emiAmount: number;
  emisPaid: number;
  remainingEmis: number;
  emiEndDate: string; // 'YYYY-MM-DD'
  debitedAccount: string; // matches entity name prefix used for balance lookup
  loanCategory?: string; // 'Vehicle' | 'Office Loan' | 'MSME' | 'House Loan' | 'Finance' | 'Other'
}
