require('dotenv').config();
const os = require('os');

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Fonction pour détecter l'IP locale
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Fonction pour obtenir une valeur avec fallback uniquement en développement
function getEnvWithDevFallback(envVar, devFallback, description) {
  const value = process.env[envVar];
  if (!value) {
    if (isProduction) {
      throw new Error(`❌ [Config] Variable d'environnement requise manquante en production: ${envVar} (${description})`);
    }
    if (isDevelopment && devFallback) {
      console.warn(`⚠️  [Config] Utilisation de la valeur par défaut pour ${envVar} (développement uniquement)`);
      return devFallback;
    }
  }
  return value;
}

// Validation des secrets critiques au démarrage
function validateSecrets() {
  const requiredInProduction = [
    { key: 'DB_PASSWORD', description: 'Mot de passe de la base de données' },
    { key: 'JWT_SECRET', description: 'Secret JWT pour l\'authentification' },
    { key: 'N8N_API_KEY', description: 'Clé API n8n' },
    { key: 'SMTP_PASSWORD', description: 'Mot de passe SMTP' }
  ];

  const missing = [];
  for (const { key, description } of requiredInProduction) {
    if (!process.env[key] && isProduction) {
      missing.push({ key, description });
    }
  }

  if (missing.length > 0) {
    console.error('❌ [Config] Secrets manquants en production:');
    missing.forEach(({ key, description }) => {
      console.error(`   - ${key}: ${description}`);
    });
    throw new Error('Configuration invalide: secrets manquants');
  }

  // Avertissements pour les valeurs par défaut en développement
  if (isDevelopment) {
    if (process.env.JWT_SECRET === 'your-secret-key-change-in-production' || !process.env.JWT_SECRET) {
      console.warn('⚠️  [Config] JWT_SECRET utilise une valeur par défaut - changez-la en production');
    }
  }
}

// Validation au chargement du module
validateSecrets();

const config = {
  database: {
    host: process.env.DB_HOST || '147.93.58.155',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'automivy',
    user: process.env.DB_USER || 'fethi',
    password: getEnvWithDevFallback('DB_PASSWORD', 'Fethi@2025!', 'Mot de passe de la base de données'),
    ssl: process.env.DB_SSL === 'true'
  },
  jwt: {
    secret: getEnvWithDevFallback('JWT_SECRET', 'your-secret-key-change-in-production', 'Secret JWT'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  server: {
    port: process.env.PORT || 3004,
    corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3005']
  },
  n8n: {
    url: process.env.N8N_URL || 'https://n8n.globalsaas.eu',
    apiKey: getEnvWithDevFallback(
      'N8N_API_KEY',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNmM3ZmUyNy1kNGY4LTQxYTktOTI3OS1kYzVjMmNhZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzAzOTM2fQ.nejAxVx_Yv-Cz6TwJbEUvZufsNlSNl9Bw7psRb3JPzA',
      'Clé API n8n'
    )
  },
  email: {
    smtpHost: process.env.SMTP_HOST || 'mail.heleam.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || 'admin@heleam.com',
    smtpPassword: getEnvWithDevFallback('SMTP_PASSWORD', 'Fethi@2025*', 'Mot de passe SMTP'),
    fromEmail: process.env.FROM_EMAIL || 'admin@heleam.com'
  },
  app: {
    name: process.env.APP_NAME || 'Automivy',
    // Pour OAuth, utiliser localhost au lieu de l'IP privée (Google n'accepte pas les IPs privées)
    frontendUrl: process.env.FRONTEND_URL || `http://localhost:5173`,
    backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3004}`
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET
  }
};

module.exports = config;
