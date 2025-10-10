const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tous les endpoints nécessitent une authentification
router.use(authenticateToken);

// Récupérer toutes les credentials email de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const credentials = await db.getEmailCredentials(req.user.userId);
    res.json(credentials);
  } catch (error) {
    console.error('Get email credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Créer une nouvelle credential email
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      imapHost, 
      imapPort, 
      imapUser, 
      imapPassword, 
      smtpHost, 
      smtpPort, 
      smtpUser, 
      smtpPassword 
    } = req.body;

    if (!name || !imapHost || !imapPort || !imapUser || !imapPassword) {
      return res.status(400).json({ error: 'Name, IMAP host, port, user, and password are required' });
    }

    const credential = await db.createEmailCredential(
      req.user.userId,
      name,
      imapHost,
      imapPort,
      imapUser,
      imapPassword,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword
    );

    res.status(201).json(credential);
  } catch (error) {
    console.error('Create email credential error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supprimer une credential email
router.delete('/:id', async (req, res) => {
  try {
    const credential = await db.deleteEmailCredential(req.params.id, req.user.userId);
    if (!credential) {
      return res.status(404).json({ error: 'Email credential not found' });
    }

    res.json({ message: 'Email credential deleted successfully' });
  } catch (error) {
    console.error('Delete email credential error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
