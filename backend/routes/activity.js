const express = require('express');
const { Pool } = require('pg');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

// Middleware d'authentification
router.use(authenticateToken);

// Middleware pour vérifier les droits admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé - Admin requis' });
  }
  next();
};

router.use(requireAdmin);

// GET /api/activity - Récupérer les activités
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      action,
      status,
      userId,
      startDate, 
      endDate,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (category) {
      whereConditions.push(`a.category = $${paramIndex++}`);
      queryParams.push(category);
    }

    if (action) {
      whereConditions.push(`a.action = $${paramIndex++}`);
      queryParams.push(action);
    }

    if (status) {
      whereConditions.push(`a.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (userId) {
      whereConditions.push(`a.user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (startDate) {
      whereConditions.push(`a.created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`a.created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (search) {
      whereConditions.push(`(a.title ILIKE $${paramIndex++} OR a.description ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        a.id,
        a.user_id,
        a.title,
        a.description,
        a.category,
        a.action,
        a.resource_type,
        a.resource_id,
        a.old_values,
        a.new_values,
        a.metadata,
        a.ip_address,
        a.user_agent,
        a.session_id,
        a.duration_ms,
        a.status,
        a.created_at,
        at.name as activity_type_name,
        at.icon as activity_icon,
        at.color as activity_color
      FROM activities a
      JOIN activity_types at ON a.activity_type_id = at.id
      ${whereClause}
      ORDER BY a.created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `
      SELECT COUNT(*) 
      FROM activities a
      JOIN activity_types at ON a.activity_type_id = at.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      activities: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des activités' });
  }
});

// GET /api/activity/stats - Récupérer les statistiques d'activité
router.get('/stats', async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      userId
    } = req.query;

    const result = await pool.query('SELECT get_activity_stats($1, $2, $3) as stats', [startDate, endDate, userId]);
    const stats = result.rows[0].stats;

    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques d\'activité:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// GET /api/activity/types - Récupérer les types d'activité
router.get('/types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        category,
        icon,
        color,
        is_active,
        created_at
      FROM activity_types 
      WHERE is_active = true
      ORDER BY category, name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des types d\'activité:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des types d\'activité' });
  }
});

// GET /api/activity/sessions - Récupérer les sessions d'activité
router.get('/sessions', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      userId,
      startDate, 
      endDate,
      isActive
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (startDate) {
      whereConditions.push(`start_time >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`start_time <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex++}`);
      queryParams.push(isActive === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        user_id,
        session_id,
        start_time,
        end_time,
        duration_minutes,
        ip_address,
        user_agent,
        is_active,
        created_at
      FROM activity_sessions 
      ${whereClause}
      ORDER BY start_time DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM activity_sessions ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      sessions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions d\'activité:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des sessions' });
  }
});

// POST /api/activity - Créer une activité
router.post('/', async (req, res) => {
  try {
    const { 
      activity_type_name, 
      title, 
      description, 
      category, 
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      metadata,
      ip_address,
      user_agent,
      session_id,
      duration_ms,
      status = 'SUCCESS'
    } = req.body;

    const result = await pool.query(
      'SELECT create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) as activity_id',
      [
        activity_type_name, 
        req.user.id, 
        title, 
        description, 
        category, 
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        metadata,
        ip_address || req.ip,
        user_agent || req.get('User-Agent'),
        session_id,
        duration_ms,
        status
      ]
    );

    const activityId = result.rows[0].activity_id;

    // Récupérer l'activité créée
    const activityResult = await pool.query(`
      SELECT 
        a.id,
        a.user_id,
        a.title,
        a.description,
        a.category,
        a.action,
        a.resource_type,
        a.resource_id,
        a.old_values,
        a.new_values,
        a.metadata,
        a.ip_address,
        a.user_agent,
        a.session_id,
        a.duration_ms,
        a.status,
        a.created_at,
        at.name as activity_type_name,
        at.icon as activity_icon,
        at.color as activity_color
      FROM activities a
      JOIN activity_types at ON a.activity_type_id = at.id
      WHERE a.id = $1
    `, [activityId]);

    res.status(201).json({ success: true, activity: activityResult.rows[0] });
  } catch (error) {
    console.error('Erreur lors de la création de l\'activité:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'activité' });
  }
});

// GET /api/activity/export - Exporter les activités
router.get('/export', async (req, res) => {
  try {
    const { 
      format = 'json',
      category,
      action,
      status,
      userId,
      startDate, 
      endDate
    } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (category) {
      whereConditions.push(`a.category = $${paramIndex++}`);
      queryParams.push(category);
    }

    if (action) {
      whereConditions.push(`a.action = $${paramIndex++}`);
      queryParams.push(action);
    }

    if (status) {
      whereConditions.push(`a.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (userId) {
      whereConditions.push(`a.user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (startDate) {
      whereConditions.push(`a.created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`a.created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        a.id,
        a.user_id,
        a.title,
        a.description,
        a.category,
        a.action,
        a.resource_type,
        a.resource_id,
        a.status,
        a.ip_address,
        a.duration_ms,
        a.created_at,
        at.name as activity_type_name
      FROM activities a
      JOIN activity_types at ON a.activity_type_id = at.id
      ${whereClause}
      ORDER BY a.created_at DESC
    `;

    const result = await pool.query(query, queryParams);

    if (format === 'csv') {
      // Générer CSV
      const csvHeader = 'ID,User ID,Title,Description,Category,Action,Resource Type,Resource ID,Status,IP Address,Duration (ms),Created At,Activity Type\n';
      const csvRows = result.rows.map(row => 
        `"${row.id}","${row.user_id || ''}","${row.title}","${row.description || ''}","${row.category}","${row.action}","${row.resource_type || ''}","${row.resource_id || ''}","${row.status}","${row.ip_address || ''}","${row.duration_ms || ''}","${row.created_at}","${row.activity_type_name}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="activities.csv"');
      res.send(csvHeader + csvRows);
    } else {
      // Générer JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="activities.json"');
      res.json({
        export_date: new Date().toISOString(),
        total_activities: result.rows.length,
        activities: result.rows
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'export des activités:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export des activités' });
  }
});

module.exports = router;
