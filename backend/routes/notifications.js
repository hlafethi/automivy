const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { Pool } = require('pg');
const config = require('../config');
const nodemailer = require('nodemailer');

// Configuration de la base de données
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

// Configuration SMTP (récupérée depuis les paramètres admin)
let smtpConfig = null;

// Charger la configuration SMTP
async function loadSMTPConfig() {
  try {
    const result = await pool.query('SELECT * FROM admin_settings WHERE key = $1', ['smtp_config']);
    if (result.rows.length > 0) {
      smtpConfig = JSON.parse(result.rows[0].value);
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la config SMTP:', error);
  }
}

// Initialiser la configuration SMTP
loadSMTPConfig();

// Créer un transporteur SMTP
function createSMTPTransporter() {
  if (!smtpConfig) {
    throw new Error('Configuration SMTP non disponible');
  }

  return nodemailer.createTransporter({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.password
    }
  });
}

// Envoyer une notification
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { type, title, message, user_id, data } = req.body;
    const senderId = req.user.id;

    // Vérifier les préférences de l'utilisateur
    const preferencesResult = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [user_id]
    );

    if (preferencesResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Préférences utilisateur non trouvées'
      });
    }

    const preferences = preferencesResult.rows[0];
    let notificationSent = false;

    // Envoyer selon le type et les préférences
    switch (type) {
      case 'email':
        if (preferences.email_notifications) {
          await sendEmailNotification(user_id, title, message, data);
          notificationSent = true;
        }
        break;

      case 'push':
        if (preferences.app_notifications) {
          await sendPushNotification(user_id, title, message, data);
          notificationSent = true;
        }
        break;

      case 'webhook':
        if (preferences.community_notifications || preferences.workflow_notifications) {
          await sendWebhookNotification(user_id, title, message, data);
          notificationSent = true;
        }
        break;
    }

    // Enregistrer la notification en base
    const notificationResult = await pool.query(`
      INSERT INTO notifications (type, title, message, user_id, sender_id, data, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [type, title, message, user_id, senderId, JSON.stringify(data || {}), notificationSent ? 'sent' : 'pending']);

    res.json({
      success: true,
      data: notificationResult.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de la notification'
    });
  }
});

// Envoyer notification par email
async function sendEmailNotification(userId, subject, message, data) {
  try {
    const transporter = createSMTPTransporter();
    
    // Récupérer l'email de l'utilisateur
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('Utilisateur non trouvé');
    }

    const userEmail = userResult.rows[0].email;

    const mailOptions = {
      from: smtpConfig.from,
      to: userEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${subject}</h2>
          <p>${message}</p>
          ${data ? `<p><strong>Détails:</strong> ${JSON.stringify(data)}</p>` : ''}
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Cette notification a été envoyée depuis Automivy.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé à ${userEmail}: ${subject}`);
  } catch (error) {
    console.error('Erreur envoi email:', error);
    throw error;
  }
}

// Envoyer notification push (stockée pour récupération côté client)
async function sendPushNotification(userId, title, message, data) {
  // Les notifications push sont gérées côté client via le service
  console.log(`📱 Notification push pour ${userId}: ${title}`);
}

// Envoyer webhook
async function sendWebhookNotification(userId, title, message, data) {
  try {
    // Récupérer l'URL webhook de l'utilisateur
    const preferencesResult = await pool.query(
      'SELECT webhook_url FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (preferencesResult.rows.length === 0 || !preferencesResult.rows[0].webhook_url) {
      throw new Error('URL webhook non configurée');
    }

    const webhookUrl = preferencesResult.rows[0].webhook_url;

    const payload = {
      title,
      message,
      user_id: userId,
      data,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    console.log(`🔗 Webhook envoyé à ${webhookUrl}: ${title}`);
  } catch (error) {
    console.error('Erreur webhook:', error);
    throw error;
  }
}

// Récupérer les notifications de l'utilisateur
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }
    if (type) {
      paramCount++;
      whereClause += ` AND type = $${paramCount}`;
      params.push(type);
    }

    const result = await pool.query(`
      SELECT * FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    const totalResult = await pool.query(`
      SELECT COUNT(*) FROM notifications 
      ${whereClause}
    `, params);
    const total = parseInt(totalResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notifications'
    });
  }
});

// Récupérer les notifications en attente
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notifications'
    });
  }
});

// Marquer une notification comme lue
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    await pool.query(`
      UPDATE notifications 
      SET status = 'read', read_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);

    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la notification'
    });
  }
});

// Configuration SMTP (admin seulement)
router.post('/smtp/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { host, port, secure, user, password, from } = req.body;

    const smtpConfig = {
      host,
      port: parseInt(port),
      secure: Boolean(secure),
      user,
      password,
      from
    };

    // Sauvegarder en base
    await pool.query(`
      INSERT INTO admin_settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `, ['smtp_config', JSON.stringify(smtpConfig)]);

    // Recharger la configuration
    await loadSMTPConfig();

    res.json({
      success: true,
      message: 'Configuration SMTP sauvegardée'
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la config SMTP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde de la configuration SMTP'
    });
  }
});

// Tester la configuration SMTP
router.post('/smtp/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { host, port, secure, user, password, from } = req.body;

    const transporter = nodemailer.createTransporter({
      host,
      port: parseInt(port),
      secure: Boolean(secure),
      auth: { user, pass: password }
    });

    // Test de connexion
    await transporter.verify();

    // Envoi d'un email de test
    await transporter.sendMail({
      from,
      to: user, // Envoyer à soi-même pour le test
      subject: 'Test SMTP Automivy',
      html: `
        <h2>Test de configuration SMTP</h2>
        <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement !</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    });

    res.json({
      success: true,
      message: 'Configuration SMTP testée avec succès !'
    });
  } catch (error) {
    console.error('Erreur test SMTP:', error);
    res.status(500).json({
      success: false,
      error: `Erreur test SMTP: ${error.message}`
    });
  }
});

// Admin: Get notification settings
router.get('/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM admin_settings WHERE key = 'notification_config'
    `);
    
    if (result.rows.length === 0) {
      // Créer des paramètres par défaut
      const defaultSettings = {
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        email_enabled: true,
        push_enabled: true,
        webhook_enabled: false,
        retry_attempts: 3,
        retry_delay: 5000
      };
      
      await pool.query(`
        INSERT INTO admin_settings (key, value, description)
        VALUES ('notification_config', $1, 'Configuration globale des notifications')
        RETURNING *
      `, [JSON.stringify(defaultSettings)]);
      
      return res.json({
        success: true,
        data: {
          key: 'notification_config',
          value: defaultSettings
        }
      });
    }
    
    const settings = result.rows[0];
    res.json({
      success: true,
      data: {
        key: settings.key,
        value: typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des paramètres'
    });
  }
});

// Admin: Update notification settings
router.put('/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, email_enabled, push_enabled, webhook_enabled, retry_attempts, retry_delay } = req.body;
    
    const settingsValue = {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_pass,
      email_enabled,
      push_enabled,
      webhook_enabled,
      retry_attempts,
      retry_delay
    };
    
    const result = await pool.query(`
      INSERT INTO admin_settings (key, value, description)
      VALUES ('notification_config', $1, 'Configuration globale des notifications')
      ON CONFLICT (key) DO UPDATE SET 
        value = $1,
        updated_at = NOW()
      RETURNING *
    `, [JSON.stringify(settingsValue)]);
    
    res.json({
      success: true,
      data: {
        key: result.rows[0].key,
        value: JSON.parse(result.rows[0].value)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des paramètres'
    });
  }
});

// Admin: Test SMTP connection
router.post('/admin/test-smtp', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT value FROM admin_settings WHERE key = 'notification_config'
    `);
    
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Configuration SMTP non trouvée'
      });
    }
    
    const settings = typeof result.rows[0].value === 'string' ? 
      JSON.parse(result.rows[0].value) : result.rows[0].value;
    
    const { smtp_host, smtp_port, smtp_user, smtp_pass } = settings;
    
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
      return res.status(400).json({
        success: false,
        message: 'Configuration SMTP incomplète'
      });
    }
    
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: {
        user: smtp_user,
        pass: smtp_pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    await transporter.verify();
    res.json({
      success: true,
      message: 'Connexion SMTP réussie !'
    });
  } catch (error) {
    console.error('Erreur test SMTP admin:', error);
    res.status(500).json({
      success: false,
      message: `Échec de la connexion SMTP: ${error.message}`
    });
  }
});

module.exports = router;
