import { format, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// Indian number formatting (lakhs/crores system)
export function formatIndianCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return formatIndianCurrency(amount);
}

export function formatDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '—';
  return format(timestamp.toDate(), 'dd MMM yyyy');
}

export function formatDateTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '—';
  return format(timestamp.toDate(), 'dd MMM yyyy, hh:mm a');
}

export function dateToString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function stringToDate(dateStr: string): Date {
  return parseISO(dateStr);
}

export function timestampToDateString(timestamp: Timestamp): string {
  return format(timestamp.toDate(), 'yyyy-MM-dd');
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getStatusLabel(netMovement: number, hasActivity: boolean): {
  label: string;
  icon: string;
  colorClass: string;
} {
  if (!hasActivity) {
    return { label: 'No Activity', icon: '—', colorClass: 'text-gray-500' };
  }
  if (netMovement > 0) {
    return { label: 'Surplus', icon: '▲', colorClass: 'text-green-600' };
  }
  if (netMovement < 0) {
    return { label: 'Deficit', icon: '▼', colorClass: 'text-red-600' };
  }
  return { label: 'Balanced', icon: '=', colorClass: 'text-blue-600' };
}

export const CATEGORIES = [
  'Sales Receipt',
  'Purchase Payment',
  'Salary',
  'Rent',
  'Utilities',
  'Tax Payment',
  'Loan Repayment',
  'Bank Charges',
  'Petty Cash',
  'Transfer',
  'Other',
  'Driver',
  'Diesel',
  'Stock Labour',
  'Fastag',
  'Gerej labour',
  'sales payment',
];

export const ENTITIES = [
  { name: 'Kishan Enterprise | ICICI', bank: 'ICICI', openingBalance: 2381563, order: 1 },
  { name: 'Yaksh Carting | HDFC', bank: 'HDFC', openingBalance: 4539, order: 2 },
  { name: 'Fremi Carting | Saraswat Bank', bank: 'Saraswat Bank', openingBalance: 4123, order: 3 },
  { name: 'Shree Developer | Saraswat Bank', bank: 'Saraswat Bank', openingBalance: 7927, order: 4 },
  { name: 'Shree Developer | HDFC', bank: 'HDFC', openingBalance: 12861, order: 5 },
  { name: 'Shree Developer | Varachha Bank', bank: 'Varachha Bank', openingBalance: 25747, order: 6 },
];

// Opening date: March 6, 2026
export const OPENING_DATE = new Date(2026, 2, 6); // Month is 0-indexed
