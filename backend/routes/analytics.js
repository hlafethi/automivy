const express = require('express');
const { Pool } = require('pg');
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

// Appliquer le middleware d'authentification et d'admin à toutes les routes analytics
router.use(authenticateToken);
router.use(requireAdmin);

// Route pour récupérer toutes les analytics
router.get('/', async (req, res) => {
  try {
    console.log('📊 [Analytics] Récupération des données analytics...');

    // Statistiques utilisateurs
    const usersQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
      FROM users
    `;
    const usersResult = await pool.query(usersQuery);
    const users = usersResult.rows[0];

    // Statistiques workflows
    const workflowsQuery = `
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_workflows
      FROM user_workflows
    `;
    const workflowsResult = await pool.query(workflowsQuery);
    const workflows = workflowsResult.rows[0];

    // Statistiques templates
    const templatesQuery = `
      SELECT COUNT(*) as total_templates
      FROM templates
    `;
    const templatesResult = await pool.query(templatesQuery);
    const templates = templatesResult.rows[0];

    // Statistiques de performance réelles
    const performanceQuery = `
      SELECT 
        AVG(response_time) as avg_response_time,
        AVG(uptime) as avg_uptime,
        AVG(error_rate) as avg_error_rate,
        AVG(cpu_usage) as avg_cpu,
        AVG(memory_usage) as avg_memory,
        AVG(disk_usage) as avg_disk
      FROM performance_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    const performanceResult = await pool.query(performanceQuery);
    const performance = performanceResult.rows[0];

    // Statistiques d'activité réelles
    const activityQuery = `
      SELECT 
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as today,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as this_week,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as this_month
      FROM activity_logs
    `;
    const activityResult = await pool.query(activityQuery);
    const activity = activityResult.rows[0];

    // Statistiques des workflows (taux de succès et temps d'exécution)
    const workflowStatsQuery = `
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
        AVG(CASE WHEN status = 'success' THEN execution_time END) as avg_execution_time
      FROM workflow_executions
      WHERE started_at > NOW() - INTERVAL '30 days'
    `;
    const workflowStatsResult = await pool.query(workflowStatsQuery);
    const workflowStats = workflowStatsResult.rows[0];

    // Calculer le taux de croissance réel
    const growthRate = users.new_this_month > 0 ? 
      Math.round((users.new_this_month / Math.max(users.total_users - users.new_this_month, 1)) * 100) : 0;

    // Calculer le taux de succès des workflows
    const successRate = workflowStats.total_executions > 0 ? 
      Math.round((workflowStats.successful_executions / workflowStats.total_executions) * 100) : 0;

    const analyticsData = {
      users: {
        total: parseInt(users.total_users) || 0,
        active: parseInt(users.active_users) || 0,
        newThisMonth: parseInt(users.new_this_month) || 0,
        growth: growthRate
      },
      workflows: {
        total: parseInt(workflows.total_workflows) || 0,
        active: parseInt(workflows.active_workflows) || 0,
        successRate: successRate,
        avgExecutionTime: Math.round(workflowStats.avg_execution_time) || 0
      },
      performance: {
        responseTime: Math.round(performance.avg_response_time) || 0,
        uptime: Math.round(performance.avg_uptime * 100) / 100 || 0,
        errorRate: Math.round(performance.avg_error_rate * 100) / 100 || 0
      },
      activity: {
        today: parseInt(activity.today) || 0,
        thisWeek: parseInt(activity.this_week) || 0,
        thisMonth: parseInt(activity.this_month) || 0
      },
      templates: {
        total: parseInt(templates.total_templates) || 0
      }
    };

    console.log('✅ [Analytics] Données récupérées avec succès:', analyticsData);

    res.json(analyticsData);
  } catch (error) {
    console.error('❌ [Analytics] Erreur lors de la récupération des analytics:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des analytics',
      details: error.message 
    });
  }
});

// Route pour les statistiques utilisateurs détaillées
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as active_today
      FROM users
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ [Analytics] Erreur stats utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stats utilisateurs' });
  }
});

// Route pour les statistiques workflows détaillées
router.get('/workflows', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as paused,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week
      FROM user_workflows
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ [Analytics] Erreur stats workflows:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stats workflows' });
  }
});

// Route pour les statistiques de performance
router.get('/performance', async (req, res) => {
  try {
    // Simulation de données de performance
    const performanceData = {
      responseTime: Math.floor(Math.random() * 100) + 150, // 150-250ms
      uptime: 99.5 + Math.random() * 0.4, // 99.5-99.9%
      errorRate: Math.random() * 0.5, // 0-0.5%
      cpuUsage: Math.floor(Math.random() * 30) + 20, // 20-50%
      memoryUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
      diskUsage: Math.floor(Math.random() * 20) + 10 // 10-30%
    };
    
    res.json(performanceData);
  } catch (error) {
    console.error('❌ [Analytics] Erreur stats performance:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stats performance' });
  }
});

module.exports = router;
