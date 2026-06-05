import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/app/contexts/ThemeContext';
import Dashboard from '@/entities/dashboard/page/Dashboard';
import Profile from '@/entities/profile/page/Profile';
import UserProfilePage from '@/entities/profile/page/UserProfilePage';
import Login from '@/pages/Login';
import AdminPage from '@/pages/AdminPage';
import { MarketingLanding } from '@/pages/MarketingLanding';
import Register from '@/pages/Register';
import ApartmentPage from '@/pages/ApartmentPage';
import ForgotPassword from '@/pages/ForgotPassword';
import { GlobalThemeToggle } from '@/components/GlobalThemeToggle';

function LoadingScreen() {
  return (
    <div className="page-shell flex items-center justify-center">
      <div className="text-2xl text-slate-700 dark:text-white">Загрузка...</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) {
    return <Navigate to={user?.is_admin ? '/admin' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style:
          theme === 'dark'
            ? {
                background: 'rgba(15,23,42,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(148,163,184,0.3)',
                color: 'white',
              }
            : {
                background: 'rgba(255,255,255,0.98)',
                border: '1px solid rgba(203,213,225,0.8)',
                color: '#0f172a',
              },
      }}
    />
  );
}

function AppContent() {
  return (
    <>
      <GlobalThemeToggle />
      <Routes>
        <Route path="/" element={<MarketingLanding />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apartments/:id"
          element={
            <ProtectedRoute>
              <ApartmentPage />
            </ProtectedRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ThemedToaster />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
