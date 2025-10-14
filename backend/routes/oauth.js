const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tous les endpoints nécessitent une authentification
router.use(authenticateToken);

// Récupérer toutes les credentials OAuth de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const { provider } = req.query;
    const credentials = await db.getOAuthCredentials(req.user.id, provider);
    res.json(credentials);
  } catch (error) {
    console.error('Get OAuth credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Créer une nouvelle credential OAuth
router.post('/', async (req, res) => {
  try {
    const { provider, encryptedData, n8nCredentialId, email, expiresAt } = req.body;

    if (!provider || !encryptedData) {
      return res.status(400).json({ error: 'Provider and encrypted data are required' });
    }

    const credential = await db.createOAuthCredential(
      req.user.id,
      provider,
      encryptedData,
      n8nCredentialId,
      email,
      expiresAt
    );

    res.status(201).json(credential);
  } catch (error) {
    console.error('Create OAuth credential error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supprimer une credential OAuth
router.delete('/:id', async (req, res) => {
  try {
    const credential = await db.deleteOAuthCredential(req.params.id, req.user.id);
    if (!credential) {
      return res.status(404).json({ error: 'OAuth credential not found' });
    }

    res.json({ message: 'OAuth credential deleted successfully' });
  } catch (error) {
    console.error('Delete OAuth credential error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
