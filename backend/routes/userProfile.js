const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
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

// =====================================================
// USER PROFILE API ROUTES
// =====================================================

// Get user profile with statistics
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        up.id,
        up.email,
        up.role,
        up.first_name,
        up.last_name,
        up.avatar_url,
        up.bio,
        up.phone,
        up.company,
        up.job_title,
        up.location,
        up.website,
        up.timezone,
        up.language,
        up.created_at,
        up.updated_at,
        COALESCE(us.total_workflows, 0) as total_workflows,
        COALESCE(us.active_workflows, 0) as active_workflows,
        COALESCE(us.total_automations, 0) as total_automations,
        COALESCE(us.successful_automations, 0) as successful_automations,
        COALESCE(us.failed_automations, 0) as failed_automations,
        COALESCE(us.community_posts, 0) as community_posts,
        COALESCE(us.community_likes, 0) as community_likes,
        COALESCE(us.community_events_attended, 0) as community_events_attended,
        us.last_activity
      FROM user_profiles up
      LEFT JOIN user_statistics us ON up.id = us.user_id
      WHERE up.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      // Créer un profil par défaut si il n'existe pas
      await pool.query(`
        INSERT INTO user_profiles (id, email, role, first_name, last_name, timezone, language)
        VALUES ($1, $2, $3, '', '', 'UTC', 'fr')
        ON CONFLICT (id) DO NOTHING
      `, [userId, req.user.email, req.user.role]);
      
      // Réessayer la requête
      const retryResult = await pool.query(`
        SELECT 
          up.id,
          up.email,
          up.role,
          up.first_name,
          up.last_name,
          up.avatar_url,
          up.bio,
          up.phone,
          up.company,
          up.job_title,
          up.location,
          up.website,
          up.timezone,
          up.language,
          up.created_at,
          up.updated_at,
          COALESCE(us.total_workflows, 0) as total_workflows,
          COALESCE(us.active_workflows, 0) as active_workflows,
          COALESCE(us.total_automations, 0) as total_automations,
          COALESCE(us.successful_automations, 0) as successful_automations,
          COALESCE(us.failed_automations, 0) as failed_automations,
          COALESCE(us.community_posts, 0) as community_posts,
          COALESCE(us.community_likes, 0) as community_likes,
          COALESCE(us.community_events_attended, 0) as community_events_attended,
          us.last_activity
        FROM user_profiles up
        LEFT JOIN user_statistics us ON up.id = us.user_id
        WHERE up.id = $1
      `, [userId]);
      
      if (retryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Profil utilisateur non trouvé'
        });
      }
      
      return res.json({
        success: true,
        data: retryResult.rows[0]
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      first_name,
      last_name,
      avatar_url,
      bio,
      phone,
      company,
      job_title,
      location,
      website,
      timezone,
      language
    } = req.body;
    
    const result = await pool.query(`
      UPDATE user_profiles SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        avatar_url = COALESCE($4, avatar_url),
        bio = COALESCE($5, bio),
        phone = COALESCE($6, phone),
        company = COALESCE($7, company),
        job_title = COALESCE($8, job_title),
        location = COALESCE($9, location),
        website = COALESCE($10, website),
        timezone = COALESCE($11, timezone),
        language = COALESCE($12, language),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      userId, first_name, last_name, avatar_url, bio, phone,
      company, job_title, location, website, timezone, language
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profil utilisateur non trouvé'
      });
    }
    
    // Log activity
    await pool.query(
      'SELECT log_user_activity($1, $2, $3, $4, $5, $6)',
      [
        userId,
        'profile_updated',
        'Profil utilisateur mis à jour',
        JSON.stringify({ fields_updated: Object.keys(req.body) }),
        req.ip,
        req.get('User-Agent')
      ]
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profil mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create default preferences if they don't exist
      await pool.query(`
        INSERT INTO user_preferences (user_id, theme, email_notifications, app_notifications, community_notifications, workflow_notifications, email_frequency, privacy_level)
        VALUES ($1, 'system', true, true, true, true, 'daily', 'public')
        RETURNING *
      `, [userId]);
      
      const newResult = await pool.query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
      );
      
      return res.json({
        success: true,
        data: newResult.rows[0]
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des préférences'
    });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      theme,
      email_notifications,
      app_notifications,
      community_notifications,
      workflow_notifications,
      email_frequency,
      privacy_level
    } = req.body;
    
    const result = await pool.query(`
      UPDATE user_preferences SET
        theme = COALESCE($2, theme),
        email_notifications = COALESCE($3, email_notifications),
        app_notifications = COALESCE($4, app_notifications),
        community_notifications = COALESCE($5, community_notifications),
        workflow_notifications = COALESCE($6, workflow_notifications),
        email_frequency = COALESCE($7, email_frequency),
        privacy_level = COALESCE($8, privacy_level),
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [
      userId, theme, email_notifications, app_notifications,
      community_notifications, workflow_notifications, email_frequency,
      privacy_level
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Préférences utilisateur non trouvées'
      });
    }
    
    // Log activity
    await pool.query(
      'SELECT log_user_activity($1, $2, $3, $4, $5, $6)',
      [
        userId,
        'preferences_updated',
        'Préférences utilisateur mises à jour',
        JSON.stringify({ preferences_updated: Object.keys(req.body) }),
        req.ip,
        req.get('User-Agent')
      ]
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Préférences mises à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des préférences'
    });
  }
});

// Get user statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT * FROM user_statistics WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Statistiques utilisateur non trouvées'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// Get user activity logs
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, activity_type } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];
    let paramCount = 1;
    
    if (activity_type) {
      paramCount++;
      whereClause += ` AND activity_type = $${paramCount}`;
      queryParams.push(activity_type);
    }
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM user_activity_logs ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);
    
    // Get activity logs
    const result = await pool.query(`
      SELECT * FROM user_activity_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...queryParams, parseInt(limit), offset]);
    
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
    console.error('Erreur lors de la récupération des activités:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des activités'
    });
  }
});

// Get user achievements
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT * FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at DESC',
      [userId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des succès:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des succès'
    });
  }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT id, ip_address, user_agent, is_active, expires_at, created_at, last_activity FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des sessions'
    });
  }
});

// Terminate a session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    
    const result = await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING *',
      [sessionId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée'
      });
    }
    
    // Log activity
    await pool.query(
      'SELECT log_user_activity($1, $2, $3, $4, $5, $6)',
      [
        userId,
        'session_terminated',
        'Session utilisateur terminée',
        JSON.stringify({ session_id: sessionId }),
        req.ip,
        req.get('User-Agent')
      ]
    );
    
    res.json({
      success: true,
      message: 'Session terminée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la session'
    });
  }
});

// Update user statistics (admin only)
router.put('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId, statistics } = req.body;
    
    // Check if user is admin or updating their own stats
    if (req.user.role !== 'admin' && userId !== targetUserId) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }
    
    const updateUserId = targetUserId || userId;
    
    await pool.query(
      'SELECT update_user_statistics($1, $2)',
      [updateUserId, JSON.stringify(statistics)]
    );
    
    // Log activity
    await pool.query(
      'SELECT log_user_activity($1, $2, $3, $4, $5, $6)',
      [
        userId,
        'statistics_updated',
        'Statistiques utilisateur mises à jour',
        JSON.stringify({ target_user_id: updateUserId, statistics }),
        req.ip,
        req.get('User-Agent')
      ]
    );
    
    res.json({
      success: true,
      message: 'Statistiques mises à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des statistiques'
    });
  }
});

// Get user profile summary (for admin dashboard)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get basic profile info
    const profileResult = await pool.query(
      'SELECT * FROM get_user_profile_with_stats($1)',
      [userId]
    );
    
    // Get recent activity
    const activityResult = await pool.query(
      'SELECT * FROM user_activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    
    // Get achievements count
    const achievementsResult = await pool.query(
      'SELECT COUNT(*) as total_achievements FROM user_achievements WHERE user_id = $1',
      [userId]
    );
    
    // Get active sessions count
    const sessionsResult = await pool.query(
      'SELECT COUNT(*) as active_sessions FROM user_sessions WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        profile: profileResult.rows[0],
        recent_activity: activityResult.rows,
        total_achievements: parseInt(achievementsResult.rows[0].total_achievements),
        active_sessions: parseInt(sessionsResult.rows[0].active_sessions)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du résumé'
    });
  }
});

module.exports = router;
