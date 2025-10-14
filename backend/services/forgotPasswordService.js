const crypto = require('crypto');
const { Pool } = require('pg');
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

class ForgotPasswordService {
  
  // Générer un token sécurisé
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Créer un token de réinitialisation
  async createResetToken(userId, email) {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
    
    try {
      // Désactiver tous les tokens existants pour cet utilisateur
      await pool.query(
        'UPDATE forgot_password_tokens SET used = TRUE WHERE user_id = $1',
        [userId]
      );

      // Créer le nouveau token
      const result = await pool.query(
        `INSERT INTO forgot_password_tokens (user_id, token, email, expires_at) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, token, expires_at`,
        [userId, email, token, expiresAt]
      );

      console.log('✅ [ForgotPassword] Token créé:', {
        userId,
        email,
        tokenId: result.rows[0].id,
        expiresAt: result.rows[0].expires_at
      });

      return {
        token,
        expiresAt: result.rows[0].expires_at
      };
    } catch (error) {
      console.error('❌ [ForgotPassword] Erreur création token:', error);
      throw error;
    }
  }

  // Valider un token de réinitialisation
  async validateResetToken(token) {
    try {
      const result = await pool.query(
        `SELECT user_id, email, expires_at, used 
         FROM forgot_password_tokens 
         WHERE token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return { valid: false, error: 'Token invalide' };
      }

      const tokenData = result.rows[0];

      // Vérifier si le token est expiré
      if (new Date() > new Date(tokenData.expires_at)) {
        return { valid: false, error: 'Token expiré' };
      }

      // Vérifier si le token a déjà été utilisé
      if (tokenData.used) {
        return { valid: false, error: 'Token déjà utilisé' };
      }

      return {
        valid: true,
        userId: tokenData.user_id,
        email: tokenData.email
      };
    } catch (error) {
      console.error('❌ [ForgotPassword] Erreur validation token:', error);
      return { valid: false, error: 'Erreur de validation' };
    }
  }

  // Marquer un token comme utilisé
  async markTokenAsUsed(token) {
    try {
      await pool.query(
        'UPDATE forgot_password_tokens SET used = TRUE WHERE token = $1',
        [token]
      );
      console.log('✅ [ForgotPassword] Token marqué comme utilisé:', token);
    } catch (error) {
      console.error('❌ [ForgotPassword] Erreur marquage token:', error);
      throw error;
    }
  }

  // Nettoyer les tokens expirés
  async cleanupExpiredTokens() {
    try {
      const result = await pool.query(
        'DELETE FROM forgot_password_tokens WHERE expires_at < NOW() OR used = TRUE'
      );
      console.log('✅ [ForgotPassword] Tokens expirés nettoyés:', result.rowCount);
      return result.rowCount;
    } catch (error) {
      console.error('❌ [ForgotPassword] Erreur nettoyage tokens:', error);
      throw error;
    }
  }

  // Obtenir les statistiques des tokens
  async getTokenStats() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_tokens,
          COUNT(CASE WHEN used = TRUE THEN 1 END) as used_tokens,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens,
          COUNT(CASE WHEN used = FALSE AND expires_at > NOW() THEN 1 END) as active_tokens
        FROM forgot_password_tokens
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ [ForgotPassword] Erreur statistiques:', error);
      throw error;
    }
  }
}

module.exports = new ForgotPasswordService();
