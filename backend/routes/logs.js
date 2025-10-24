const express = require('express');
const { Pool } = require('pg');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configuration de la base de données
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

// Middleware pour vérifier les permissions admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé - Admin requis' });
  }
  next();
};

// Appliquer l'authentification puis la vérification admin
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/logs/system - Récupérer les logs système
router.get('/system', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      level, 
      category, 
      startDate, 
      endDate,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (level) {
      whereConditions.push(`level = $${paramIndex++}`);
      queryParams.push(level);
    }

    if (category) {
      whereConditions.push(`category = $${paramIndex++}`);
      queryParams.push(category);
    }

    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (search) {
      whereConditions.push(`(message ILIKE $${paramIndex++} OR details::text ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        timestamp,
        level,
        category,
        message,
        details,
        user_id,
        session_id,
        ip_address,
        user_agent,
        request_id,
        duration_ms,
        created_at
      FROM system_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM system_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs système:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs système' });
  }
});

// GET /api/logs/audit - Récupérer les logs d'audit
router.get('/audit', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      resourceType, 
      success,
      startDate, 
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (action) {
      whereConditions.push(`action = $${paramIndex++}`);
      queryParams.push(action);
    }

    if (resourceType) {
      whereConditions.push(`resource_type = $${paramIndex++}`);
      queryParams.push(resourceType);
    }

    if (success !== undefined) {
      whereConditions.push(`success = $${paramIndex++}`);
      queryParams.push(success === 'true');
    }

    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        timestamp,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        session_id,
        success,
        error_message,
        created_at
      FROM audit_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs d\'audit:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs d\'audit' });
  }
});

// GET /api/logs/errors - Récupérer les logs d'erreurs
router.get('/errors', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      level, 
      errorType, 
      resolved,
      startDate, 
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (level) {
      whereConditions.push(`level = $${paramIndex++}`);
      queryParams.push(level);
    }

    if (errorType) {
      whereConditions.push(`error_type = $${paramIndex++}`);
      queryParams.push(errorType);
    }

    if (resolved !== undefined) {
      whereConditions.push(`resolved = $${paramIndex++}`);
      queryParams.push(resolved === 'true');
    }

    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        timestamp,
        level,
        error_type,
        message,
        stack_trace,
        context,
        user_id,
        session_id,
        ip_address,
        user_agent,
        request_id,
        resolved,
        resolved_at,
        resolved_by,
        created_at
      FROM error_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM error_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs d\'erreurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs d\'erreurs' });
  }
});

// GET /api/logs/performance - Récupérer les logs de performance
router.get('/performance', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      operation, 
      startDate, 
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (operation) {
      whereConditions.push(`operation = $${paramIndex++}`);
      queryParams.push(operation);
    }

    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        timestamp,
        operation,
        duration_ms,
        memory_usage_mb,
        cpu_usage_percent,
        endpoint,
        method,
        status_code,
        user_id,
        request_id,
        created_at
      FROM performance_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM performance_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs de performance:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs de performance' });
  }
});

// GET /api/logs/stats - Récupérer les statistiques des logs
router.get('/stats', async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h par défaut
      endDate = new Date().toISOString()
    } = req.query;

    const result = await pool.query('SELECT get_logs_stats($1, $2) as stats', [startDate, endDate]);
    const stats = result.rows[0].stats;

    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// PUT /api/logs/errors/:id/resolve - Marquer une erreur comme résolue
router.put('/errors/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved = true, resolvedBy } = req.body;

    const query = `
      UPDATE error_logs 
      SET resolved = $1, resolved_at = NOW(), resolved_by = $2 
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [resolved, resolvedBy, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Log d\'erreur non trouvé' });
    }

    res.json({ success: true, log: result.rows[0] });
  } catch (error) {
    console.error('Erreur lors de la résolution du log:', error);
    res.status(500).json({ error: 'Erreur lors de la résolution du log' });
  }
});

// DELETE /api/logs/cleanup - Nettoyer les anciens logs
router.delete('/cleanup', async (req, res) => {
  try {
    await pool.query('SELECT cleanup_old_logs()');
    res.json({ success: true, message: 'Nettoyage des anciens logs terminé' });
  } catch (error) {
    console.error('Erreur lors du nettoyage des logs:', error);
    res.status(500).json({ error: 'Erreur lors du nettoyage des logs' });
  }
});

// GET /api/logs/export - Exporter les logs
router.get('/export', async (req, res) => {
  try {
    const { 
      type = 'system', // system, audit, errors, performance
      format = 'json', // json, csv
      startDate,
      endDate
    } = req.query;

    let tableName;
    let selectFields;

    switch (type) {
      case 'system':
        tableName = 'system_logs';
        selectFields = 'id, timestamp, level, category, message, details, user_id, ip_address';
        break;
      case 'audit':
        tableName = 'audit_logs';
        selectFields = 'id, timestamp, user_id, action, resource_type, resource_id, success, ip_address';
        break;
      case 'errors':
        tableName = 'error_logs';
        selectFields = 'id, timestamp, level, error_type, message, stack_trace, resolved, user_id, ip_address';
        break;
      case 'performance':
        tableName = 'performance_logs';
        selectFields = 'id, timestamp, operation, duration_ms, memory_usage_mb, cpu_usage_percent, endpoint, method, status_code, user_id';
        break;
      default:
        return res.status(400).json({ error: 'Type de log invalide' });
    }

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `SELECT ${selectFields} FROM ${tableName} ${whereClause} ORDER BY timestamp DESC`;
    const result = await pool.query(query, queryParams);

    if (format === 'csv') {
      // Générer CSV
      const headers = selectFields.split(', ');
      const csvRows = [headers.join(',')];
      
      result.rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header.trim()];
          return typeof value === 'object' ? JSON.stringify(value) : (value || '');
        });
        csvRows.push(values.join(','));
      });

      const csv = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="logs_${type}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // Retourner JSON
      res.json({
        type,
        exported_at: new Date().toISOString(),
        count: result.rows.length,
        logs: result.rows
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'export des logs:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export des logs' });
  }
});


module.exports = router;
