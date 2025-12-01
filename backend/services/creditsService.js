// Service de gestion des crédits pour les workflows Newsletter
// 30 crédits par mois selon l'abonnement choisi

const db = require('../database');

class CreditsService {
  constructor() {
    this.db = db;
  }

  /**
   * Initialise les crédits pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {string} planId - ID du plan d'abonnement (optionnel, défaut: 'free')
   */
  async initializeUserCredits(userId, planId = null) {
    try {
      // Récupérer ou créer le plan
      let plan;
      if (planId) {
        const planResult = await this.db.query(
          'SELECT * FROM subscription_plans WHERE id = $1',
          [planId]
        );
        plan = planResult.rows[0];
      } else {
        // Plan gratuit par défaut
        const planResult = await this.db.query(
          "SELECT * FROM subscription_plans WHERE name = 'free'"
        );
        plan = planResult.rows[0];
      }

      if (!plan) {
        throw new Error('Plan d\'abonnement non trouvé');
      }

      // Vérifier si l'utilisateur a déjà des crédits
      const existingCredits = await this.db.query(
        'SELECT * FROM user_credits WHERE user_id = $1',
        [userId]
      );

      if (existingCredits.rows.length > 0) {
        console.log(`✅ [CreditsService] Crédits déjà initialisés pour l'utilisateur ${userId}`);
        return existingCredits.rows[0];
      }

      // Créer l'abonnement utilisateur
      const subscriptionResult = await this.db.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 month')
         ON CONFLICT (user_id) DO UPDATE SET plan_id = $2, updated_at = NOW()
         RETURNING *`,
        [userId, plan.id]
      );

      // Créer les crédits utilisateur
      const creditsResult = await this.db.query(
        `INSERT INTO user_credits (user_id, total_credits, next_reset_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 month')
         RETURNING *`,
        [userId, plan.monthly_credits]
      );

      // Enregistrer la transaction
      await this.db.query(
        `INSERT INTO credit_transactions (user_id, transaction_type, amount, description)
         VALUES ($1, 'earned', $2, 'Initialisation des crédits - Plan: ' || $3)`,
        [userId, plan.monthly_credits, plan.name]
      );

      console.log(`✅ [CreditsService] Crédits initialisés: ${plan.monthly_credits} crédits pour l'utilisateur ${userId}`);
      return creditsResult.rows[0];
    } catch (error) {
      console.error('❌ [CreditsService] Erreur initialisation crédits:', error);
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur a suffisamment de crédits
   * @param {string} userId - ID de l'utilisateur
   * @param {number} requiredCredits - Nombre de crédits requis (défaut: 1)
   * @returns {Promise<boolean>}
   */
  async hasEnoughCredits(userId, requiredCredits = 1) {
    try {
      // Réinitialiser les crédits si nécessaire
      await this.resetMonthlyCreditsIfNeeded(userId);

      const result = await this.db.query(
        'SELECT remaining_credits FROM user_credits WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Initialiser les crédits si l'utilisateur n'en a pas
        await this.initializeUserCredits(userId);
        return false; // Pas de crédits après initialisation (plan gratuit = 5)
      }

      const remainingCredits = result.rows[0].remaining_credits || 0;
      return remainingCredits >= requiredCredits;
    } catch (error) {
      console.error('❌ [CreditsService] Erreur vérification crédits:', error);
      return false;
    }
  }

  /**
   * Consomme des crédits pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {number} amount - Nombre de crédits à consommer (défaut: 1)
   * @param {string} workflowId - ID du workflow (optionnel)
   * @param {string} description - Description de l'utilisation (optionnel)
   * @returns {Promise<Object>} Nouveau solde de crédits
   */
  async consumeCredits(userId, amount = 1, workflowId = null, description = null) {
    try {
      // Vérifier si l'utilisateur a suffisamment de crédits
      const hasCredits = await this.hasEnoughCredits(userId, amount);
      if (!hasCredits) {
        throw new Error('Crédits insuffisants');
      }

      // Consommer les crédits
      const result = await this.db.query(
        `UPDATE user_credits 
         SET used_credits = used_credits + $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [amount, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Crédits utilisateur non trouvés');
      }

      // Enregistrer la transaction
      await this.db.query(
        `INSERT INTO credit_transactions (user_id, transaction_type, amount, workflow_id, description)
         VALUES ($1, 'used', $2, $3, $4)`,
        [userId, amount, workflowId, description || `Utilisation de ${amount} crédit(s) pour newsletter`]
      );

      console.log(`✅ [CreditsService] ${amount} crédit(s) consommé(s) pour l'utilisateur ${userId}`);
      return result.rows[0];
    } catch (error) {
      console.error('❌ [CreditsService] Erreur consommation crédits:', error);
      throw error;
    }
  }

  /**
   * Récupère le solde de crédits d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>}
   */
  async getCreditsBalance(userId) {
    try {
      await this.resetMonthlyCreditsIfNeeded(userId);

      const result = await this.db.query(
        `SELECT 
          uc.total_credits,
          uc.used_credits,
          uc.remaining_credits,
          uc.last_reset_at,
          uc.next_reset_at,
          sp.name as plan_name,
          sp.monthly_credits as plan_credits
         FROM user_credits uc
         LEFT JOIN user_subscriptions us ON uc.user_id = us.user_id
         LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE uc.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // Initialiser les crédits si l'utilisateur n'en a pas
        await this.initializeUserCredits(userId);
        return this.getCreditsBalance(userId);
      }

      return result.rows[0];
    } catch (error) {
      console.error('❌ [CreditsService] Erreur récupération solde:', error);
      throw error;
    }
  }

  /**
   * Réinitialise les crédits mensuels si nécessaire
   * @param {string} userId - ID de l'utilisateur
   */
  async resetMonthlyCreditsIfNeeded(userId) {
    try {
      const result = await this.db.query(
        `SELECT uc.*, sp.monthly_credits
         FROM user_credits uc
         LEFT JOIN user_subscriptions us ON uc.user_id = us.user_id
         LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE uc.user_id = $1 AND us.status = 'active'`,
        [userId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const credits = result.rows[0];
      const nextReset = new Date(credits.next_reset_at);
      const now = new Date();

      if (nextReset <= now) {
        const monthlyCredits = credits.monthly_credits || 0;
        
        await this.db.query(
          `UPDATE user_credits 
           SET total_credits = $1,
               used_credits = 0,
               last_reset_at = NOW(),
               next_reset_at = NOW() + INTERVAL '1 month',
               updated_at = NOW()
           WHERE user_id = $2`,
          [monthlyCredits, userId]
        );

        // Enregistrer la transaction
        await this.db.query(
          `INSERT INTO credit_transactions (user_id, transaction_type, amount, description)
           VALUES ($1, 'earned', $2, 'Réinitialisation mensuelle des crédits')`,
          [userId, monthlyCredits]
        );

        console.log(`✅ [CreditsService] Crédits réinitialisés pour l'utilisateur ${userId}: ${monthlyCredits} crédits`);
      }
    } catch (error) {
      console.error('❌ [CreditsService] Erreur réinitialisation crédits:', error);
    }
  }

  /**
   * Change le plan d'abonnement d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {string} planName - Nom du plan ('free', 'starter', 'professional', 'enterprise')
   */
  async changeSubscriptionPlan(userId, planName) {
    try {
      const planResult = await this.db.query(
        'SELECT * FROM subscription_plans WHERE name = $1',
        [planName]
      );

      if (planResult.rows.length === 0) {
        throw new Error(`Plan d'abonnement "${planName}" non trouvé`);
      }

      const plan = planResult.rows[0];

      // Mettre à jour l'abonnement
      await this.db.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 month')
         ON CONFLICT (user_id) DO UPDATE 
         SET plan_id = $2, updated_at = NOW()`,
        [userId, plan.id]
      );

      // Mettre à jour les crédits (prochaine réinitialisation)
      await this.db.query(
        `UPDATE user_credits 
         SET next_reset_at = NOW() + INTERVAL '1 month',
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      console.log(`✅ [CreditsService] Plan changé pour l'utilisateur ${userId}: ${planName}`);
    } catch (error) {
      console.error('❌ [CreditsService] Erreur changement de plan:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des transactions de crédits
   * @param {string} userId - ID de l'utilisateur
   * @param {number} limit - Nombre de transactions à récupérer (défaut: 50)
   * @returns {Promise<Array>}
   */
  async getCreditHistory(userId, limit = 50) {
    try {
      const result = await this.db.query(
        `SELECT * FROM credit_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ [CreditsService] Erreur récupération historique:', error);
      throw error;
    }
  }
}

module.exports = new CreditsService();

