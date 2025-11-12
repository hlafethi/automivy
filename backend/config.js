require('dotenv').config();
const os = require('os');

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

module.exports = {
  database: {
    host: process.env.DB_HOST || '147.93.58.155',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'automivy',
    user: process.env.DB_USER || 'fethi',
    password: process.env.DB_PASSWORD || 'Fethi@2025!',
    ssl: process.env.DB_SSL === 'true'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  server: {
    port: process.env.PORT || 3004,
    corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3005']
  },
  n8n: {
    url: process.env.N8N_URL || 'https://n8n.globalsaas.eu',
    apiKey: process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNmM3ZmUyNy1kNGY4LTQxYTktOTI3OS1kYzVjMmNhZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzAzOTM2fQ.nejAxVx_Yv-Cz6TwJbEUvZufsNlSNl9Bw7psRb3JPzA'
  },
  email: {
    smtpHost: process.env.SMTP_HOST || 'mail.heleam.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || 'admin@heleam.com',
    smtpPassword: process.env.SMTP_PASSWORD || 'Fethi@2025*',
    fromEmail: process.env.FROM_EMAIL || 'admin@heleam.com'
  },
  app: {
    name: process.env.APP_NAME || 'Automivy',
    // Pour OAuth, utiliser localhost au lieu de l'IP privée (Google n'accepte pas les IPs privées)
    frontendUrl: process.env.FRONTEND_URL || `http://localhost:5173`
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  }
};
