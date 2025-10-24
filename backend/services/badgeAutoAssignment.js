// Service d'attribution automatique des badges
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

class BadgeAutoAssignment {
  
  // Vérifier et attribuer automatiquement les badges pour un utilisateur
  static async checkAndAssignBadges(userId) {
    try {
      console.log(`🔍 [BadgeAutoAssignment] Vérification des badges pour l'utilisateur ${userId}`);
      
      // Récupérer tous les badges avec leurs critères
      const badgesResult = await pool.query(`
        SELECT id, name, description, criteria 
        FROM user_badges 
        WHERE criteria IS NOT NULL
      `);
      
      const badges = badgesResult.rows;
      console.log(`📊 [BadgeAutoAssignment] ${badges.length} badges à vérifier`);
      
      for (const badge of badges) {
        const criteria = typeof badge.criteria === 'string' ? 
          JSON.parse(badge.criteria) : badge.criteria;
        
        console.log(`🎯 [BadgeAutoAssignment] Vérification du badge "${badge.name}" (${criteria.type})`);
        
        // Vérifier si l'utilisateur a déjà ce badge
        const existingAssignment = await pool.query(`
          SELECT id FROM user_badge_assignments 
          WHERE user_id = $1 AND badge_id = $2
        `, [userId, badge.id]);
        
        if (existingAssignment.rows.length > 0) {
          console.log(`✅ [BadgeAutoAssignment] Badge "${badge.name}" déjà attribué`);
          continue;
        }
        
        // Vérifier les critères selon le type
        const shouldAssign = await this.checkCriteria(userId, criteria);
        
        if (shouldAssign) {
          await this.assignBadge(userId, badge.id, badge.name);
        }
      }
      
    } catch (error) {
      console.error('❌ [BadgeAutoAssignment] Erreur lors de la vérification des badges:', error);
    }
  }
  
  // Vérifier si les critères d'un badge sont remplis
  static async checkCriteria(userId, criteria) {
    try {
      switch (criteria.type) {
        case 'first_message':
          return await this.checkFirstMessage(userId);
          
        case 'weekly_active':
          return await this.checkWeeklyActive(userId, criteria.count);
          
        case 'top_message':
          return await this.checkTopMessage(userId, criteria.period);
          
        case 'helpful_responses':
          return await this.checkHelpfulResponses(userId, criteria.count);
          
        case 'moderation_help':
          return await this.checkModerationHelp(userId, criteria.count);
          
        case 'discussion_creator':
          return await this.checkDiscussionCreator(userId, criteria.count);
          
        case 'event_participant':
          return await this.checkEventParticipant(userId, criteria.count);
          
        case 'mentor':
          return await this.checkMentor(userId, criteria.count);
          
        default:
          console.log(`⚠️ [BadgeAutoAssignment] Type de critère inconnu: ${criteria.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ [BadgeAutoAssignment] Erreur lors de la vérification des critères:`, error);
      return false;
    }
  }
  
  // Premier message
  static async checkFirstMessage(userId) {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM discussions WHERE author_id = $1
    `, [userId]);
    
    const count = parseInt(result.rows[0].count);
    console.log(`📝 [BadgeAutoAssignment] Messages créés: ${count}`);
    return count >= 1;
  }
  
  // Actif (messages en une semaine)
  static async checkWeeklyActive(userId, requiredCount) {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM discussions 
      WHERE author_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
    `, [userId]);
    
    const count = parseInt(result.rows[0].count);
    console.log(`📅 [BadgeAutoAssignment] Messages cette semaine: ${count}/${requiredCount}`);
    return count >= requiredCount;
  }
  
  // Message le plus liké du mois
  static async checkTopMessage(userId, period) {
    const interval = period === 'monthly' ? '1 month' : '1 week';
    
    const result = await pool.query(`
      SELECT d.id, COUNT(dl.id) as like_count
      FROM discussions d
      LEFT JOIN discussion_likes dl ON d.id = dl.discussion_id
      WHERE d.author_id = $1 
        AND d.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY d.id
      ORDER BY like_count DESC
      LIMIT 1
    `, [userId]);
    
    if (result.rows.length === 0) return false;
    
    // Vérifier si c'est le message le plus liké de la période
    const topResult = await pool.query(`
      SELECT d.id, COUNT(dl.id) as like_count
      FROM discussions d
      LEFT JOIN discussion_likes dl ON d.id = dl.discussion_id
      WHERE d.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY d.id
      ORDER BY like_count DESC
      LIMIT 1
    `);
    
    const isTop = result.rows[0].id === topResult.rows[0].id;
    console.log(`⭐ [BadgeAutoAssignment] Message le plus liké: ${isTop}`);
    return isTop;
  }
  
  // Réponses utiles (likes reçus sur les réponses)
  static async checkHelpfulResponses(userId, requiredCount) {
    const result = await pool.query(`
      SELECT COUNT(dr.id) as count
      FROM discussion_replies dr
      LEFT JOIN reply_likes rl ON dr.id = rl.reply_id
      WHERE dr.author_id = $1
      GROUP BY dr.id
      HAVING COUNT(rl.id) >= 3
    `, [userId]);
    
    const count = result.rows.length;
    console.log(`💡 [BadgeAutoAssignment] Réponses utiles: ${count}/${requiredCount}`);
    return count >= requiredCount;
  }
  
  // Aide à la modération
  static async checkModerationHelp(userId, requiredCount) {
    // Pour l'instant, on considère qu'aider = signaler des problèmes
    // TODO: Implémenter un système de signalement
    console.log(`🛡️ [BadgeAutoAssignment] Aide modération: 0/${requiredCount} (non implémenté)`);
    return false;
  }
  
  // Créateur de discussions
  static async checkDiscussionCreator(userId, requiredCount) {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM discussions WHERE author_id = $1
    `, [userId]);
    
    const count = parseInt(result.rows[0].count);
    console.log(`📝 [BadgeAutoAssignment] Discussions créées: ${count}/${requiredCount}`);
    return count >= requiredCount;
  }
  
  // Participant aux événements
  static async checkEventParticipant(userId, requiredCount) {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM event_participants WHERE user_id = $1
    `, [userId]);
    
    const count = parseInt(result.rows[0].count);
    console.log(`🎉 [BadgeAutoAssignment] Événements participés: ${count}/${requiredCount}`);
    return count >= requiredCount;
  }
  
  // Mentor (aide aux nouveaux membres)
  static async checkMentor(userId, requiredCount) {
    // Pour l'instant, on considère qu'aider = répondre aux discussions des nouveaux membres
    const result = await pool.query(`
      SELECT COUNT(DISTINCT d.author_id) as count
      FROM discussions d
      JOIN discussion_replies dr ON d.id = dr.discussion_id
      WHERE dr.author_id = $1 
        AND d.author_id != $1
        AND d.created_at > dr.created_at - INTERVAL '7 days'
    `, [userId]);
    
    const count = parseInt(result.rows[0].count);
    console.log(`👨‍🏫 [BadgeAutoAssignment] Nouveaux membres aidés: ${count}/${requiredCount}`);
    return count >= requiredCount;
  }
  
  // Attribuer un badge à un utilisateur
  static async assignBadge(userId, badgeId, badgeName) {
    try {
      await pool.query(`
        INSERT INTO user_badge_assignments (user_id, badge_id, assigned_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, badge_id) DO NOTHING
      `, [userId, badgeId]);
      
      console.log(`🎉 [BadgeAutoAssignment] Badge "${badgeName}" attribué à l'utilisateur ${userId}`);
      
      // TODO: Envoyer une notification à l'utilisateur
      
    } catch (error) {
      console.error(`❌ [BadgeAutoAssignment] Erreur lors de l'attribution du badge:`, error);
    }
  }
}

module.exports = BadgeAutoAssignment;
