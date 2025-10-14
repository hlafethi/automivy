const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Tous les endpoints nécessitent une authentification et un rôle admin
router.use(authenticateToken);
router.use(requireAdmin);

// Récupérer toutes les clés API de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const apiKeys = await db.getApiKeys(req.user.id);
    res.json(apiKeys);
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Créer une nouvelle clé API
router.post('/', async (req, res) => {
  try {
    const { name, key, service } = req.body;

    if (!name || !key || !service) {
      return res.status(400).json({ error: 'Name, key, and service are required' });
    }

    const apiKey = await db.createApiKey(req.user.id, name, key, service);
    res.status(201).json(apiKey);
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supprimer une clé API
router.delete('/:id', async (req, res) => {
  try {
    const apiKey = await db.deleteApiKey(req.params.id, req.user.id);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
