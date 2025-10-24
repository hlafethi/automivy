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

// GET /api/database/stats - Récupérer les statistiques générales
router.get('/stats', async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    const result = await pool.query('SELECT get_database_stats($1, $2) as stats', [startDate, endDate]);
    const stats = result.rows[0].stats;

    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de base de données:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// GET /api/database/metrics - Récupérer les métriques
router.get('/metrics', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category,
      metric_name,
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
      whereConditions.push(`category = $${paramIndex++}`);
      queryParams.push(category);
    }

    if (metric_name) {
      whereConditions.push(`metric_name = $${paramIndex++}`);
      queryParams.push(metric_name);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (search) {
      whereConditions.push(`(metric_name ILIKE $${paramIndex++} OR database_name ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        metric_name,
        metric_value,
        metric_unit,
        category,
        subcategory,
        database_name,
        table_name,
        index_name,
        query_type,
        connection_id,
        session_id,
        user_id,
        ip_address,
        metadata,
        created_at
      FROM database_metrics 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM database_metrics ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      metrics: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des métriques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des métriques' });
  }
});

// GET /api/database/slow-queries - Récupérer les requêtes lentes
router.get('/slow-queries', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      min_time,
      database_name,
      startDate, 
      endDate,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (min_time) {
      whereConditions.push(`execution_time_ms >= $${paramIndex++}`);
      queryParams.push(parseInt(min_time));
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramIndex++}`);
      queryParams.push(database_name);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (search) {
      whereConditions.push(`query_text ILIKE $${paramIndex++}`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        query_text,
        query_hash,
        execution_time_ms,
        rows_examined,
        rows_sent,
        database_name,
        table_name,
        index_used,
        user_id,
        ip_address,
        session_id,
        created_at
      FROM slow_queries 
      ${whereClause}
      ORDER BY execution_time_ms DESC, created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM slow_queries ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      queries: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des requêtes lentes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des requêtes lentes' });
  }
});

// GET /api/database/connections - Récupérer les connexions actives
router.get('/connections', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      state,
      user_name,
      database_name,
      startDate, 
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (state) {
      whereConditions.push(`state = $${paramIndex++}`);
      queryParams.push(state);
    }

    if (user_name) {
      whereConditions.push(`user_name = $${paramIndex++}`);
      queryParams.push(user_name);
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramIndex++}`);
      queryParams.push(database_name);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        connection_id,
        user_name,
        database_name,
        client_ip,
        client_port,
        state,
        command,
        time_seconds,
        info,
        created_at,
        updated_at
      FROM active_connections 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM active_connections ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      connections: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des connexions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des connexions' });
  }
});

// GET /api/database/errors - Récupérer les erreurs
router.get('/errors', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      severity,
      database_name,
      startDate, 
      endDate,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (severity) {
      whereConditions.push(`error_severity = $${paramIndex++}`);
      queryParams.push(severity);
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramIndex++}`);
      queryParams.push(database_name);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (search) {
      whereConditions.push(`(error_message ILIKE $${paramIndex++} OR error_code ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        error_code,
        error_message,
        error_severity,
        database_name,
        table_name,
        operation,
        user_id,
        ip_address,
        session_id,
        stack_trace,
        metadata,
        created_at
      FROM database_errors 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM database_errors ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      errors: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des erreurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des erreurs' });
  }
});

// GET /api/database/tables - Récupérer les statistiques des tables
router.get('/tables', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      database_name,
      min_size,
      startDate, 
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (database_name) {
      whereConditions.push(`database_name = $${paramIndex++}`);
      queryParams.push(database_name);
    }

    if (min_size) {
      whereConditions.push(`total_size_bytes >= $${paramIndex++}`);
      queryParams.push(parseInt(min_size));
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        database_name,
        table_name,
        table_rows,
        table_size_bytes,
        index_size_bytes,
        total_size_bytes,
        avg_row_length,
        data_free,
        auto_increment_value,
        table_collation,
        table_engine,
        created_at
      FROM table_statistics 
      ${whereClause}
      ORDER BY total_size_bytes DESC, created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM table_statistics ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      tables: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des tables:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques des tables' });
  }
});

// GET /api/database/backups - Récupérer les sauvegardes
router.get('/backups', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      backup_type,
      backup_status,
      database_name,
      startDate, 
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (backup_type) {
      whereConditions.push(`backup_type = $${paramIndex++}`);
      queryParams.push(backup_type);
    }

    if (backup_status) {
      whereConditions.push(`backup_status = $${paramIndex++}`);
      queryParams.push(backup_status);
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramIndex++}`);
      queryParams.push(database_name);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        backup_name,
        backup_type,
        database_name,
        file_path,
        file_size_bytes,
        backup_status,
        start_time,
        end_time,
        duration_seconds,
        compression_ratio,
        created_by,
        metadata,
        created_at
      FROM database_backups 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM database_backups ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      backups: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sauvegardes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des sauvegardes' });
  }
});

// POST /api/database/cleanup - Nettoyer les anciennes données
router.post('/cleanup', async (req, res) => {
  try {
    await pool.query('SELECT cleanup_old_database_metrics()');
    res.json({ success: true, message: 'Nettoyage des anciennes données effectué avec succès' });
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    res.status(500).json({ error: 'Erreur lors du nettoyage des données' });
  }
});

// POST /api/database/collect - Déclencher la collecte de métriques
router.post('/collect', async (req, res) => {
  try {
    const databaseMonitoringService = require('../services/databaseMonitoringService');
    const results = await databaseMonitoringService.collectMetrics();
    res.json({ 
      success: true, 
      message: 'Collecte de métriques effectuée avec succès',
      results 
    });
  } catch (error) {
    console.error('Erreur lors de la collecte des métriques:', error);
    res.status(500).json({ error: 'Erreur lors de la collecte des métriques' });
  }
});

// GET /api/database/status - Obtenir le statut du monitoring
router.get('/status', async (req, res) => {
  try {
    const databaseMonitoringService = require('../services/databaseMonitoringService');
    const status = databaseMonitoringService.getStatus();
    res.json({ 
      success: true, 
      status 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut' });
  }
});

module.exports = router;
