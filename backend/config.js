require('dotenv').config();

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
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  },
  n8n: {
    url: process.env.N8N_URL || 'https://n8n.globalsaas.eu',
    apiKey: process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNmM3ZmUyNy1kNGY4LTQxYTktOTI3OS1kYzVjMmNhZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzAzOTM2fQ.nejAxVx_Yv-Cz6TwJbEUvZufsNlSNl9Bw7psRb3JPzA'
  }
};
