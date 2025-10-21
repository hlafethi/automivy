import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { Header } from './components/Header';
import { AdminDashboard } from './components/AdminDashboard';
import { UserAutomations } from './components/UserAutomations';
import { LandingPage } from './pages/LandingPage';
import { LandingAdmin } from './components/LandingAdmin';
import { SupportPage } from './pages/SupportPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

function App() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        
        {/* Routes d'authentification */}
        <Route 
          path="/login" 
          element={!user ? <AuthForm /> : <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} 
        />
        
        {/* Routes protégées */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <div className="min-h-screen bg-slate-50">
                <Header />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <UserAutomations />
                </main>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/admin"
          element={
            user && isAdmin ? (
              <div className="min-h-screen bg-slate-50">
                <Header />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <AdminDashboard />
                </main>
              </div>
            ) : user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/admin/landing"
          element={
            user && isAdmin ? (
              <LandingAdmin onBack={() => window.history.back()} />
            ) : user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
