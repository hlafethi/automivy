/**
 * Configuration de l'URL de l'API
 * En production, utilise l'URL relative /api (proxifiée par Nginx Proxy Manager)
 * En développement, utilise localhost:3004
 */
export const getApiBaseUrl = (): string => {
  // En production (build), utiliser l'URL relative
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // En développement, utiliser la variable d'environnement ou localhost par défaut
  return import.meta.env.VITE_API_URL || 'http://localhost:3004/api';
};

/**
 * URL de base pour les assets statiques (images, vidéos, etc.)
 * En production, utilise l'URL relative (proxifiée par Nginx)
 * En développement, utilise localhost:3004
 */
export const getAssetsBaseUrl = (): string => {
  if (import.meta.env.PROD) {
    return ''; // URL relative, le serveur actuel servira les assets
  }
  
  return 'http://localhost:3004';
};

