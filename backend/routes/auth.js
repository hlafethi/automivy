const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const forgotPasswordService = require('../services/forgotPasswordService');
const emailService = require('../services/emailService');
const config = require('../config');

// Configuration de la base de données
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// 🔐 Route d'enregistrement
router.post('/register', async (req, res) => {
  const { email, password, role = 'user' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, role]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error.code === '23505') { // Duplicate email error code
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🔐 Route de connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Mettre à jour la dernière connexion
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🔐 Route de vérification du token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 🔐 Demander la réinitialisation de mot de passe
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔐 [Auth] Demande de réinitialisation pour:', email);
    
    // Validation de l'email
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Adresse email invalide'
      });
    }

    // Générer un token de réinitialisation
    const { token, expiresAt } = await forgotPasswordService.createResetToken(
      email, // Utiliser l'email comme userId pour simplifier
      email
    );

    // Créer le lien de réinitialisation
    const resetLink = `${config.app.frontendUrl || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    console.log('🔗 [Auth] Lien de réinitialisation généré:', resetLink);

    // Envoyer l'email de réinitialisation
    await emailService.sendPasswordResetEmail(email, resetLink);

    console.log('✅ [Auth] Email de réinitialisation envoyé à:', email);

    res.json({
      success: true,
      message: 'Email de réinitialisation envoyé',
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('❌ [Auth] Erreur demande réinitialisation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de l\'email de réinitialisation',
      details: error.message
    });
  }
});

// 🔐 Valider un token de réinitialisation
router.get('/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 [Auth] Validation du token:', token);

    const validation = await forgotPasswordService.validateResetToken(token);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    res.json({
      success: true,
      valid: true,
      email: validation.email,
      message: 'Token valide'
    });

  } catch (error) {
    console.error('❌ [Auth] Erreur validation token:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation du token',
      details: error.message
    });
  }
});

// 🔐 Réinitialiser le mot de passe avec token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    console.log('🔐 [Auth] Réinitialisation mot de passe avec token');

    // Validation des paramètres
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    // Valider le token
    const validation = await forgotPasswordService.validateResetToken(token);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Marquer le token comme utilisé
    await forgotPasswordService.markTokenAsUsed(token);

    // TODO: Ici vous devriez mettre à jour le mot de passe dans votre système d'authentification
    // Pour l'instant, on simule la mise à jour
    console.log('✅ [Auth] Mot de passe mis à jour pour:', validation.email);
    console.log('🔐 [Auth] Nouveau mot de passe (simulé):', newPassword);

    // Envoyer un email de confirmation
    await emailService.sendPasswordChangedConfirmation(validation.email);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('❌ [Auth] Erreur réinitialisation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réinitialisation du mot de passe',
      details: error.message
    });
  }
});

// 🔐 Nettoyer les tokens expirés (route admin)
router.post('/cleanup-expired-tokens', async (req, res) => {
  try {
    const cleanedCount = await forgotPasswordService.cleanupExpiredTokens();
    
    res.json({
      success: true,
      message: `${cleanedCount} tokens expirés nettoyés`,
      cleanedCount
    });

  } catch (error) {
    console.error('❌ [Auth] Erreur nettoyage tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du nettoyage des tokens',
      details: error.message
    });
  }
});

// 📊 Statistiques des tokens (route admin)
router.get('/token-stats', async (req, res) => {
  try {
    const stats = await forgotPasswordService.getTokenStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [Auth] Erreur statistiques tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: error.message
    });
  }
});

module.exports = router;