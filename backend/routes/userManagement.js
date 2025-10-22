const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Configuration de la base de données
const pool = new Pool({
  user: process.env.DB_USER || 'fethi',
  host: process.env.DB_HOST || '147.93.58.155',
  database: process.env.DB_NAME || 'automivy',
  password: process.env.DB_PASSWORD || 'Fethi@2025!',
  port: process.env.DB_PORT || 5432,
});

// Appliquer le middleware d'authentification et d'admin à toutes les routes
router.use(authenticateToken);
router.use(requireAdmin);

// Route pour récupérer tous les utilisateurs avec leurs statistiques
router.get('/', async (req, res) => {
  try {
    console.log('👥 [UserManagement] Récupération de tous les utilisateurs...');

    const query = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.created_at,
        u.last_login,
        u.is_active,
        COUNT(w.id) as workflows_count,
        COUNT(CASE WHEN w.is_active = true THEN 1 END) as active_workflows,
        COUNT(CASE WHEN w.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_workflows
      FROM users u
      LEFT JOIN workflows w ON u.id = w.user_id
      GROUP BY u.id, u.email, u.role, u.created_at, u.last_login, u.is_active
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    const users = result.rows;

    console.log(`✅ [UserManagement] ${users.length} utilisateurs récupérés`);

    res.json({
      success: true,
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('❌ [UserManagement] Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des utilisateurs',
      details: error.message 
    });
  }
});

// Route pour récupérer les détails d'un utilisateur spécifique
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`👤 [UserManagement] Récupération des détails pour l'utilisateur: ${userId}`);

    // Informations de base de l'utilisateur
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.created_at,
        u.last_login,
        u.is_active,
        up.first_name,
        up.last_name,
        up.phone,
        up.company,
        up.position
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.id
      WHERE u.id = $1
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Workflows de l'utilisateur
    const workflowsQuery = `
      SELECT 
        id,
        name,
        is_active,
        created_at,
        n8n_workflow_id,
        params
      FROM workflows
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const workflowsResult = await pool.query(workflowsQuery, [userId]);
    const workflows = workflowsResult.rows;

    // Statistiques d'activité
    const activityQuery = `
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_workflows,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as workflows_this_week,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as workflows_this_month
      FROM workflows
      WHERE user_id = $1
    `;
    
    const activityResult = await pool.query(activityQuery, [userId]);
    const activity = activityResult.rows[0];

    // Dernières connexions
    const loginQuery = `
      SELECT 
        created_at as login_time,
        'Connexion' as action
      FROM users
      WHERE id = $1
      UNION ALL
      SELECT 
        created_at as login_time,
        'Création de workflow' as action
      FROM workflows
      WHERE user_id = $1
      ORDER BY login_time DESC
      LIMIT 10
    `;
    
    const loginResult = await pool.query(loginQuery, [userId]);
    const recentActivity = loginResult.rows;

    const userDetails = {
      ...user,
      workflows: workflows,
      activity: activity,
      recentActivity: recentActivity
    };

    console.log(`✅ [UserManagement] Détails récupérés pour l'utilisateur: ${user.email}`);

    res.json({
      success: true,
      user: userDetails
    });
  } catch (error) {
    console.error('❌ [UserManagement] Erreur lors de la récupération des détails utilisateur:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des détails utilisateur',
      details: error.message 
    });
  }
});

// Route pour mettre à jour les informations d'un utilisateur
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, role, is_active, first_name, last_name, phone, company, position } = req.body;
    
    console.log(`✏️ [UserManagement] Mise à jour de l'utilisateur: ${userId}`);

    // Mettre à jour les informations de base
    const userUpdateQuery = `
      UPDATE users 
      SET email = $1, role = $2, is_active = $3
      WHERE id = $4
      RETURNING *
    `;
    
    const userResult = await pool.query(userUpdateQuery, [email, role, is_active, userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Mettre à jour ou créer le profil utilisateur
    const profileUpsertQuery = `
      INSERT INTO user_profiles (id, first_name, last_name, phone, company, position)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) 
      DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        company = EXCLUDED.company,
        position = EXCLUDED.position
      RETURNING *
    `;
    
    const profileResult = await pool.query(profileUpsertQuery, [
      userId, first_name, last_name, phone, company, position
    ]);

    console.log(`✅ [UserManagement] Utilisateur mis à jour: ${email}`);

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: {
        ...userResult.rows[0],
        profile: profileResult.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ [UserManagement] Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de l\'utilisateur',
      details: error.message 
    });
  }
});

// Route pour réinitialiser le mot de passe d'un utilisateur
router.post('/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    console.log(`🔐 [UserManagement] Réinitialisation du mot de passe pour l'utilisateur: ${userId}`);

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    const updateQuery = `
      UPDATE users 
      SET password = $1
      WHERE id = $2
      RETURNING email
    `;
    
    const result = await pool.query(updateQuery, [hashedPassword, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    console.log(`✅ [UserManagement] Mot de passe réinitialisé pour: ${result.rows[0].email}`);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('❌ [UserManagement] Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la réinitialisation du mot de passe',
      details: error.message 
    });
  }
});

// Route pour désactiver/activer un utilisateur
router.post('/:userId/toggle-status', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔄 [UserManagement] Changement de statut pour l'utilisateur: ${userId}`);

    // Récupérer le statut actuel
    const currentQuery = `SELECT is_active FROM users WHERE id = $1`;
    const currentResult = await pool.query(currentQuery, [userId]);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const newStatus = !currentResult.rows[0].is_active;

    // Mettre à jour le statut
    const updateQuery = `
      UPDATE users 
      SET is_active = $1
      WHERE id = $2
      RETURNING email, is_active
    `;
    
    const result = await pool.query(updateQuery, [newStatus, userId]);

    console.log(`✅ [UserManagement] Statut changé pour ${result.rows[0].email}: ${newStatus ? 'Actif' : 'Inactif'}`);

    res.json({
      success: true,
      message: `Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('❌ [UserManagement] Erreur lors du changement de statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors du changement de statut',
      details: error.message 
    });
  }
});

// Route pour supprimer un utilisateur
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🗑️ [UserManagement] Suppression de l'utilisateur: ${userId}`);

    // Récupérer l'email avant suppression pour les logs
    const userQuery = `SELECT email FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const userEmail = userResult.rows[0].email;

    // Supprimer en cascade (workflows, user_profiles, puis users)
    await pool.query('DELETE FROM workflows WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    console.log(`✅ [UserManagement] Utilisateur supprimé: ${userEmail}`);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ [UserManagement] Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de l\'utilisateur',
      details: error.message 
    });
  }
});

// Route pour les statistiques des utilisateurs
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('📊 [UserManagement] Récupération des statistiques utilisateurs...');

    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as active_this_week
      FROM users
    `;
    
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    console.log('✅ [UserManagement] Statistiques récupérées');

    res.json({
      success: true,
      stats: {
        total: parseInt(stats.total_users),
        active: parseInt(stats.active_users),
        newThisWeek: parseInt(stats.new_this_week),
        newThisMonth: parseInt(stats.new_this_month),
        admins: parseInt(stats.admin_users),
        activeThisWeek: parseInt(stats.active_this_week)
      }
    });
  } catch (error) {
    console.error('❌ [UserManagement] Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques',
      details: error.message 
    });
  }
});

module.exports = router;
