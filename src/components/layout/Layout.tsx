import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { usePin } from '../../contexts/PinContext';
import { useInactivity } from '../../hooks/useInactivity';
import PinLock from '../pin/PinLock';

const pageTitles: Record<string, string> = {
  '/dashboard': "Today's View",
  '/date-filter': 'Date Filter Dashboard',
  '/ledger': 'Daily Ledger',
  '/reports': 'Reports',
  '/admin/settings': 'Settings',
  '/admin/users': 'User Management',
  '/admin/logs': 'Activity Logs',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { appUser } = useAuth();
  const { isLocked, lock } = usePin();
  const location = useLocation();
  const isPinEnabled = appUser?.pinSet === true;

  // Inactivity hook - auto-locks after 15 minutes
  useInactivity(lock, isPinEnabled && !isLocked);

  const title = pageTitles[location.pathname] || 'Bank Reconciliation';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* PIN Lock Overlay */}
      {isLocked && <PinLock />}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
