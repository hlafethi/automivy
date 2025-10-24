import { LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                AUTOMIVY
              </h1>
              <p className="text-xs text-slate-500">
                {isAdmin ? 'Admin Dashboard' : 'User Dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              {isAdmin ? (
                <Shield className="w-4 h-4 text-green-600" />
              ) : (
                <User className="w-4 h-4 text-slate-600" />
              )}
              <span className="text-sm font-medium text-slate-900">
                {user?.email}
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
