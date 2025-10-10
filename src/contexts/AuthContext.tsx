import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResponse } from '../lib/auth';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role?: 'user' | 'admin') => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 [AuthContext] Initialisation du contexte d\'authentification...');
    
    // Vérifier le token stocké au chargement
    const storedToken = localStorage.getItem('auth_token');
    console.log('🔍 [AuthContext] Token stocké:', storedToken ? 'Présent' : 'Absent');
    
    if (storedToken) {
      setToken(storedToken);
      console.log('🔍 [AuthContext] Token défini, vérification de la validité...');
      
      // Vérifier la validité du token
      authService.getCurrentUser()
        .then(user => {
          console.log('🔍 [AuthContext] Utilisateur récupéré:', user);
          if (user) {
            console.log('✅ [AuthContext] Utilisateur valide:', user.id, user.email);
            setUser(user);
          } else {
            console.log('❌ [AuthContext] Utilisateur invalide, nettoyage...');
            // Token invalide, nettoyer le stockage
            localStorage.removeItem('auth_token');
            setToken(null);
          }
        })
        .catch(error => {
          console.log('❌ [AuthContext] Erreur récupération utilisateur:', error);
          localStorage.removeItem('auth_token');
          setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      console.log('⚠️ [AuthContext] Aucun token stocké');
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔍 [AuthContext] Tentative de connexion pour:', email);
      const response: AuthResponse = await authService.login(email, password);
      console.log('✅ [AuthContext] Connexion réussie:', response.user);
      console.log('🔍 [AuthContext] Utilisateur ID:', response.user.id);
      console.log('🔍 [AuthContext] Token:', response.token ? 'Présent' : 'Absent');
      
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('auth_token', response.token);
      
      console.log('✅ [AuthContext] Utilisateur et token définis');
    } catch (error) {
      console.log('❌ [AuthContext] Erreur de connexion:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, role: 'user' | 'admin' = 'user') => {
    try {
      const response: AuthResponse = await authService.signup(email, password, role);
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('auth_token', response.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    authService.logout();
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    signup,
    logout,
    loading,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};