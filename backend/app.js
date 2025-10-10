const express = require('express');
const cors = require('cors');
const config = require('./config');

// Import des routes
const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const workflowRoutes = require('./routes/workflows');
const userWorkflowRoutes = require('./routes/userWorkflows');
const setupRoutes = require('./routes/setup');
const apiKeyRoutes = require('./routes/apiKeys');
const oauthRoutes = require('./routes/oauth');
const emailCredentialRoutes = require('./routes/emailCredentials');
const n8nRoutes = require('./routes/n8n');

const app = express();

// Middleware
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/user-workflows', userWorkflowRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/email-credentials', emailCredentialRoutes);
app.use('/api/n8n', n8nRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend API is running', timestamp: new Date().toISOString() });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Route 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
