import { useState, useEffect } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LandingService } from '../services/landingService';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [landingContent, setLandingContent] = useState<any>({});
  const [contentTimestamp, setContentTimestamp] = useState(Date.now());
  const { login, signup } = useAuth();

  useEffect(() => {
    const loadLandingContent = async () => {
      try {
        const content = await LandingService.getContent();
        setLandingContent(content);
        setContentTimestamp(Date.now());
      } catch (error) {
        console.error('Erreur lors du chargement du contenu landing:', error);
      }
    };
    loadLandingContent();
    
    // Recharger toutes les 30 secondes
    const interval = setInterval(loadLandingContent, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const hero = landingContent.hero || {};
  const backgroundImage = hero.background_image;
  const logoImage = hero.logo_image;

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        background: backgroundImage 
          ? `url(http://localhost:3004${backgroundImage}?v=${contentTimestamp}) center/cover no-repeat`
          : 'linear-gradient(to bottom right, #e0f4f6, #f8fafc, #eff6ff)'
      }}
    >
      {backgroundImage && (
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      )}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
          <div className="text-center mb-8">
            {logoImage ? (
              <div className="mb-6 flex justify-center">
                <img 
                  src={`http://localhost:3004${logoImage}?v=${contentTimestamp}`} 
                  alt="Logo AUTOMIVY" 
                  className="h-16 w-auto"
                  key={`login-logo-${contentTimestamp}`}
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #046f78, #034a52)' }}>
                {isLogin ? (
                  <LogIn className="w-10 h-10 text-white" />
                ) : (
                  <UserPlus className="w-10 h-10 text-white" />
                )}
              </div>
            )}
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              AUTOMIVY
            </h1>
            <p className="text-slate-600 text-lg">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Intelligent Automation Platform
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:outline-none transition-all duration-200 bg-slate-50 focus:bg-white"
                style={{ 
                  '--tw-ring-color': '#046f78',
                } as React.CSSProperties & { '--tw-ring-color'?: string }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#046f78';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:outline-none transition-all duration-200 bg-slate-50 focus:bg-white"
                style={{ 
                  '--tw-ring-color': '#046f78',
                } as React.CSSProperties & { '--tw-ring-color'?: string }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#046f78';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {isLogin && (
              <div className="text-right">
                <a
                  href="/forgot-password"
                  className="text-sm font-semibold transition-colors"
                  style={{ color: '#046f78' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#034a52'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#046f78'}
                >
                  Mot de passe oublié ?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #034a52, #023a42)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #046f78, #034a52)'}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-green-600 hover:text-green-700 font-semibold transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8 font-medium">
          Multi-user automation dashboard powered by n8n
        </p>
      </div>
    </div>
  );
}
