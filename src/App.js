import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import LoginPage from './pages/LoginPage';
import NutriDashboard from './pages/NutriDashboard';
import PacienteDashboard from './pages/PacienteDashboard';
import './styles.css';

function AppContent() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-n">N</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (role === 'nutriologa') return <NutriDashboard />;
  return <PacienteDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <AppContent />
      </BrandingProvider>
    </AuthProvider>
  );
}
