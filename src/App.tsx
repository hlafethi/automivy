import { useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { Header } from './components/Header';
import { AdminDashboard } from './components/AdminDashboard';
import { UserAutomations } from './components/UserAutomations';

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

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin ? <AdminDashboard /> : <UserAutomations />}
      </main>
    </div>
  );
}

export default App;
