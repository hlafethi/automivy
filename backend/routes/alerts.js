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

// GET /api/alerts - Récupérer les alertes
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      severity, 
      source,
      startDate, 
      endDate,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtres
    if (status) {
      whereConditions.push(`a.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (severity) {
      whereConditions.push(`a.severity = $${paramIndex++}`);
      queryParams.push(severity);
    }

    if (source) {
      whereConditions.push(`a.source = $${paramIndex++}`);
      queryParams.push(source);
    }

    if (startDate) {
      whereConditions.push(`a.triggered_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`a.triggered_at <= $${paramIndex++}`);
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
        a.title,
        a.description,
        a.severity,
        a.status,
        a.source,
        a.source_id,
        a.metadata,
        a.triggered_at,
        a.acknowledged_at,
        a.acknowledged_by,
        a.resolved_at,
        a.resolved_by,
        a.resolved_reason,
        a.created_at,
        a.updated_at,
        at.name as alert_type_name,
        at.category as alert_category
      FROM alerts a
      JOIN alert_types at ON a.alert_type_id = at.id
      ${whereClause}
      ORDER BY a.triggered_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `
      SELECT COUNT(*) 
      FROM alerts a
      JOIN alert_types at ON a.alert_type_id = at.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      alerts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des alertes' });
  }
});

// GET /api/alerts/stats - Récupérer les statistiques des alertes
router.get('/stats', async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    const result = await pool.query('SELECT get_alerts_stats($1, $2) as stats', [startDate, endDate]);
    const stats = result.rows[0].stats;

    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des alertes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// GET /api/alerts/types - Récupérer les types d'alertes
router.get('/types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        severity,
        category,
        is_active,
        created_at
      FROM alert_types 
      WHERE is_active = true
      ORDER BY severity DESC, name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des types d\'alertes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des types d\'alertes' });
  }
});

// PUT /api/alerts/:id/acknowledge - Reconnaître une alerte
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const query = `
      UPDATE alerts 
      SET 
        status = 'ACKNOWLEDGED',
        acknowledged_at = NOW(),
        acknowledged_by = $1,
        updated_at = NOW()
      WHERE id = $2 AND status = 'ACTIVE'
      RETURNING *
    `;

    const result = await pool.query(query, [req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerte non trouvée ou déjà traitée' });
    }

    res.json({ success: true, alert: result.rows[0] });
  } catch (error) {
    console.error('Erreur lors de la reconnaissance de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la reconnaissance de l\'alerte' });
  }
});

// PUT /api/alerts/:id/resolve - Résoudre une alerte
router.put('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const query = `
      UPDATE alerts 
      SET 
        status = 'RESOLVED',
        resolved_at = NOW(),
        resolved_by = $1,
        resolved_reason = $2,
        updated_at = NOW()
      WHERE id = $3 AND status IN ('ACTIVE', 'ACKNOWLEDGED')
      RETURNING *
    `;

    const result = await pool.query(query, [req.user.id, reason, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerte non trouvée ou déjà résolue' });
    }

    res.json({ success: true, alert: result.rows[0] });
  } catch (error) {
    console.error('Erreur lors de la résolution de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la résolution de l\'alerte' });
  }
});

// PUT /api/alerts/:id/suppress - Supprimer une alerte
router.put('/:id/suppress', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const query = `
      UPDATE alerts 
      SET 
        status = 'SUPPRESSED',
        resolved_at = NOW(),
        resolved_by = $1,
        resolved_reason = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [req.user.id, reason, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }

    res.json({ success: true, alert: result.rows[0] });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'alerte' });
  }
});

// POST /api/alerts - Créer une alerte manuellement
router.post('/', async (req, res) => {
  try {
    const { 
      alert_type_name, 
      title, 
      description, 
      severity, 
      source, 
      source_id, 
      metadata 
    } = req.body;

    const result = await pool.query(
      'SELECT create_alert($1, $2, $3, $4, $5, $6, $7) as alert_id',
      [alert_type_name, title, description, severity, source, source_id, metadata]
    );

    const alertId = result.rows[0].alert_id;

    // Récupérer l'alerte créée
    const alertResult = await pool.query(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.severity,
        a.status,
        a.source,
        a.source_id,
        a.metadata,
        a.triggered_at,
        a.created_at,
        at.name as alert_type_name,
        at.category as alert_category
      FROM alerts a
      JOIN alert_types at ON a.alert_type_id = at.id
      WHERE a.id = $1
    `, [alertId]);

    res.status(201).json({ success: true, alert: alertResult.rows[0] });
  } catch (error) {
    console.error('Erreur lors de la création de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'alerte' });
  }
});

// DELETE /api/alerts/:id - Supprimer une alerte
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }

    res.json({ success: true, message: 'Alerte supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'alerte' });
  }
});

module.exports = router;
