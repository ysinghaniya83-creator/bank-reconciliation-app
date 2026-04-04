import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import OrgOnboarding from './components/auth/OrgOnboarding';
import PendingApproval from './components/auth/PendingApproval';
import PinSetup from './components/pin/PinSetup';
import Layout from './components/layout/Layout';
import ExecutiveDashboard from './components/dashboard/ExecutiveDashboard';
import DateFilterDashboard from './components/dashboard/DateFilterDashboard';
import DailyLedger from './components/ledger/DailyLedger';
import UserManagement from './components/admin/UserManagement';
import UserLogs from './components/admin/UserLogs';
import ReportsDashboard from './components/reports/ReportsDashboard';
import Settings from './components/admin/Settings';
import EMITracker from './components/emi/EMITracker';
import StatementUpload from './components/ledger/StatementUpload';

function ProtectedRoute({ children, requireRole }: { children: React.ReactNode; requireRole?: string[] }) {
  const { appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && !requireRole.includes(appUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading application...</p>
        </div>
      </div>
    );
  }

  // Show org onboarding if user has no organization yet
  if (appUser && !appUser.orgId) {
    return <OrgOnboarding />;
  }

  // Show pending approval screen if user's access is not yet approved
  if (appUser && appUser.role === 'pending') {
    return <PendingApproval />;
  }

  // Show PIN setup if user is logged in but hasn't set PIN
  if (appUser && !appUser.pinSet) {
    return <PinSetup />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={appUser ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<ExecutiveDashboard />} />
        <Route path="date-filter" element={<DateFilterDashboard />} />
        <Route path="ledger" element={<DailyLedger />} />
        <Route path="reports" element={<ReportsDashboard />} />
        <Route path="emi" element={<EMITracker />} />
        <Route path="upload" element={<StatementUpload />} />
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute requireRole={['admin']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute requireRole={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/logs"
          element={
            <ProtectedRoute requireRole={['admin']}>
              <UserLogs />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
