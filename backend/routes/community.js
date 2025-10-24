const express = require('express');
const { Pool } = require('pg');
const config = require('../config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);

// ===== STATISTIQUES =====
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT get_community_stats() as stats');
    const stats = result.rows[0].stats;
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// ===== CATÉGORIES =====
router.get('/categories', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT dc.*, 
             COUNT(d.id) as discussions_count
      FROM discussion_categories dc
      LEFT JOIN discussions d ON dc.id = d.category_id AND d.status = 'ACTIVE'
    `;
    
    const conditions = ['dc.is_active = true'];
    const params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      conditions.push(`(dc.name ILIKE $${paramCount} OR dc.description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += `
      GROUP BY dc.id
      ORDER BY dc.sort_order ASC, dc.name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM discussion_categories dc WHERE dc.is_active = true';
    const countParams = [];
    
    if (search) {
      countQuery += ' AND (dc.name ILIKE $1 OR dc.description ILIKE $1)';
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
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
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des catégories'
    });
  }
});

// ===== DISCUSSIONS =====
router.get('/discussions', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category = '', 
      status = 'ACTIVE',
      search = '',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT d.*, 
             u.email as author_email,
             dc.name as category_name,
             dc.color as category_color
      FROM discussions d
      LEFT JOIN users u ON d.author_id = u.id
      LEFT JOIN discussion_categories dc ON d.category_id = dc.id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      conditions.push(`d.status = $${paramCount}`);
      params.push(status);
    }
    
    if (category) {
      paramCount++;
      conditions.push(`d.category_id = $${paramCount}`);
      params.push(category);
    }
    
    if (search) {
      paramCount++;
      conditions.push(`(d.title ILIKE $${paramCount} OR d.content ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Tri
    const validSorts = ['created_at', 'updated_at', 'last_activity_at', 'views_count', 'likes_count', 'replies_count'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
    
    query += ` ORDER BY d.is_pinned DESC, d.${sortField} ${sortOrder}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Compter le total
    let countQuery = `
      SELECT COUNT(*) 
      FROM discussions d
      LEFT JOIN users u ON d.author_id = u.id
      LEFT JOIN discussion_categories dc ON d.category_id = dc.id
    `;
    
    const countConditions = [];
    const countParams = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countConditions.push(`d.status = $${countParamCount}`);
      countParams.push(status);
    }
    
    if (category) {
      countParamCount++;
      countConditions.push(`d.category_id = $${countParamCount}`);
      countParams.push(category);
    }
    
    if (search) {
      countParamCount++;
      countConditions.push(`(d.title ILIKE $${countParamCount} OR d.content ILIKE $${countParamCount})`);
      countParams.push(`%${search}%`);
    }
    
    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
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
    console.error('Erreur lors de la récupération des discussions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des discussions'
    });
  }
});

// Créer une nouvelle discussion
router.post('/discussions', async (req, res) => {
  try {
    const { title, content, category_id, tags = [] } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Le titre et le contenu sont requis'
      });
    }
    
    // Créer la discussion
    const discussionQuery = `
      INSERT INTO discussions (title, content, category_id, author_id, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING *
    `;
    
    const discussionResult = await pool.query(discussionQuery, [
      title,
      content,
      category_id,
      req.user.id // ID de l'utilisateur connecté
    ]);
    
    const discussion = discussionResult.rows[0];
    
    // Ajouter les tags si fournis
    if (tags.length > 0) {
      for (const tagName of tags) {
        // Vérifier si le tag existe, sinon le créer
        let tagResult = await pool.query('SELECT id FROM tags WHERE name = $1', [tagName]);
        let tagId;
        
        if (tagResult.rows.length === 0) {
          const newTagResult = await pool.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName]
          );
          tagId = newTagResult.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }
        
        // Lier le tag à la discussion
        await pool.query(
          'INSERT INTO discussion_tags (discussion_id, tag_id) VALUES ($1, $2)',
          [discussion.id, tagId]
        );
      }
    }
    
    res.status(201).json({
      success: true,
      data: discussion
    });
  } catch (error) {
    console.error('Erreur lors de la création de la discussion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la discussion'
    });
  }
});

// Mettre à jour une discussion
router.put('/discussions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category_id, status } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Le titre et le contenu sont requis'
      });
    }
    
    const query = `
      UPDATE discussions 
      SET title = $1, content = $2, category_id = $3, status = $4, updated_at = NOW()
      WHERE id = $5 AND author_id = $6
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      title,
      content,
      category_id,
      status || 'ACTIVE',
      id,
      req.user.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Discussion non trouvée ou non autorisée'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la discussion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la discussion'
    });
  }
});

// Supprimer une discussion
router.delete('/discussions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que la discussion existe et appartient à l'utilisateur
    const checkQuery = 'SELECT id FROM discussions WHERE id = $1 AND author_id = $2';
    const checkResult = await pool.query(checkQuery, [id, req.user.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Discussion non trouvée ou non autorisée'
      });
    }
    
    // Supprimer les réponses d'abord
    await pool.query('DELETE FROM discussion_replies WHERE discussion_id = $1', [id]);
    
    // Supprimer les likes
    await pool.query('DELETE FROM discussion_likes WHERE discussion_id = $1', [id]);
    
    // Supprimer les tags liés
    await pool.query('DELETE FROM discussion_tags WHERE discussion_id = $1', [id]);
    
    // Supprimer la discussion
    await pool.query('DELETE FROM discussions WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Discussion supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la discussion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la discussion'
    });
  }
});

// Ajouter un like à une discussion
router.post('/discussions/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Vérifier si l'utilisateur a déjà liké
    const existingLike = await pool.query(
      'SELECT id FROM discussion_likes WHERE discussion_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (existingLike.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Vous avez déjà liké cette discussion'
      });
    }
    
    // Ajouter le like
    await pool.query(
      'INSERT INTO discussion_likes (discussion_id, user_id) VALUES ($1, $2)',
      [id, userId]
    );
    
    res.json({
      success: true,
      message: 'Like ajouté avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du like:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du like'
    });
  }
});

// Retirer un like d'une discussion
router.delete('/discussions/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'DELETE FROM discussion_likes WHERE discussion_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Like non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Like retiré avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du like:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du like'
    });
  }
});

// ===== ÉVÉNEMENTS =====

// Créer un nouvel événement
router.post('/events', async (req, res) => {
  try {
    const {
      title,
      description,
      event_type,
      start_date,
      end_date,
      location,
      is_virtual,
      max_participants,
      registration_deadline,
      status = 'PUBLISHED'
    } = req.body;
    
    const userId = req.user.id;
    
    const result = await pool.query(
      `INSERT INTO community_events (
        title, description, event_type, start_date, end_date, 
        location, is_virtual, max_participants, 
        status, organizer_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        title, description, event_type, start_date, end_date,
        location, is_virtual, max_participants,
        status, userId
      ]
    );
    
    const event = result.rows[0];
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'événement'
    });
  }
});

// Mettre à jour un événement
router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      event_type,
      start_date,
      end_date,
      location,
      is_virtual,
      max_participants,
      registration_deadline,
      status
    } = req.body;
    
    const userId = req.user.id;
    
    // Vérifier que l'utilisateur est l'organisateur ou un admin
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM community_events WHERE id = $1',
      [id]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Événement non trouvé'
      });
    }
    
    if (eventCheck.rows[0].organizer_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cet événement'
      });
    }
    
    const result = await pool.query(
      `UPDATE community_events SET
        title = $1, description = $2, event_type = $3, start_date = $4,
        end_date = $5, location = $6, is_virtual = $7, max_participants = $8,
        status = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *`,
      [
        title, description, event_type, start_date, end_date,
        location, is_virtual, max_participants,
        status, id
      ]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'événement'
    });
  }
});

// Supprimer un événement
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Vérifier que l'utilisateur est l'organisateur ou un admin
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM community_events WHERE id = $1',
      [id]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Événement non trouvé'
      });
    }
    
    if (eventCheck.rows[0].organizer_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à supprimer cet événement'
      });
    }
    
    // Supprimer les participants d'abord
    await pool.query(
      'DELETE FROM event_participants WHERE event_id = $1',
      [id]
    );
    
    // Supprimer l'événement
    await pool.query(
      'DELETE FROM community_events WHERE id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Événement supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'événement'
    });
  }
});

// ===== RÉPONSES =====
router.get('/discussions/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT dr.*, 
             u.email as author_email
      FROM discussion_replies dr
      LEFT JOIN users u ON dr.author_id = u.id
      WHERE dr.discussion_id = $1
      ORDER BY dr.created_at ASC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [id, limit, offset]);
    
    // Compter le total
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM discussion_replies WHERE discussion_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].count);
    
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
    console.error('Erreur lors de la récupération des réponses:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des réponses'
    });
  }
});

// ===== ÉVÉNEMENTS =====
router.get('/events', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type = '', 
      status = 'PUBLISHED',
      search = ''
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT ce.*, 
             u.email as organizer_email
      FROM community_events ce
      LEFT JOIN users u ON ce.organizer_id = u.id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      conditions.push(`ce.status = $${paramCount}`);
      params.push(status);
    }
    
    if (type) {
      paramCount++;
      conditions.push(`ce.event_type = $${paramCount}`);
      params.push(type);
    }
    
    if (search) {
      paramCount++;
      conditions.push(`(ce.title ILIKE $${paramCount} OR ce.description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY ce.start_date ASC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM community_events ce';
    const countParams = [];
    
    if (status || type || search) {
      const countConditions = [];
      let countParamCount = 0;
      
      if (status) {
        countParamCount++;
        countConditions.push(`ce.status = $${countParamCount}`);
        countParams.push(status);
      }
      
      if (type) {
        countParamCount++;
        countConditions.push(`ce.event_type = $${countParamCount}`);
        countParams.push(type);
      }
      
      if (search) {
        countParamCount++;
        countConditions.push(`(ce.title ILIKE $${countParamCount} OR ce.description ILIKE $${countParamCount})`);
        countParams.push(`%${search}%`);
      }
      
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
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
    console.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des événements'
    });
  }
});


// ===== BADGES =====
router.get('/badges', async (req, res) => {
  try {
    const query = `
      SELECT ub.*, 
             COUNT(uba.user_id) as assigned_count
      FROM user_badges ub
      LEFT JOIN user_badge_assignments uba ON ub.id = uba.badge_id
      GROUP BY ub.id
      ORDER BY ub.created_at ASC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des badges:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des badges'
    });
  }
});

// Créer un nouveau badge
router.post('/badges', async (req, res) => {
  try {
    const { name, description, icon, color, criteria } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Le nom et la description sont requis'
      });
    }
    
    const query = `
      INSERT INTO user_badges (name, description, icon, color, criteria)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name,
      description,
      icon || '🏆',
      color || '#4CAF50',
      JSON.stringify(criteria || { type: 'manual', count: 1 })
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création du badge:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du badge'
    });
  }
});

// Mettre à jour un badge
router.put('/badges/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, criteria } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Le nom et la description sont requis'
      });
    }
    
    const query = `
      UPDATE user_badges 
      SET name = $1, description = $2, icon = $3, color = $4, criteria = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name,
      description,
      icon || '🏆',
      color || '#4CAF50',
      JSON.stringify(criteria || { type: 'manual', count: 1 }),
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Badge non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du badge:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du badge'
    });
  }
});

// Supprimer un badge
router.delete('/badges/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier d'abord si le badge existe
    const checkQuery = 'SELECT id FROM user_badges WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Badge non trouvé'
      });
    }
    
    // Supprimer d'abord les assignations
    await pool.query('DELETE FROM user_badge_assignments WHERE badge_id = $1', [id]);
    
    // Puis supprimer le badge
    const deleteQuery = 'DELETE FROM user_badges WHERE id = $1';
    await pool.query(deleteQuery, [id]);
    
    res.json({
      success: true,
      message: 'Badge supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du badge:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du badge'
    });
  }
});

// ===== PARTICIPATION AUX ÉVÉNEMENTS =====

// Participer à un événement
router.post('/events/:id/participate', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'événement existe et est publié
    const eventCheck = await pool.query(
      'SELECT id, max_participants, current_participants FROM community_events WHERE id = $1 AND status = $2',
      [id, 'PUBLISHED']
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Événement non trouvé ou non publié'
      });
    }

    const event = eventCheck.rows[0];

    // Vérifier si l'utilisateur participe déjà
    const existingParticipation = await pool.query(
      'SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingParticipation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Vous participez déjà à cet événement'
      });
    }

    // Vérifier la limite de participants
    if (event.max_participants && event.current_participants >= event.max_participants) {
      return res.status(400).json({
        success: false,
        error: 'L\'événement a atteint sa limite de participants'
      });
    }

    // Ajouter la participation
    await pool.query(
      'INSERT INTO event_participants (event_id, user_id, registered_at) VALUES ($1, $2, NOW())',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Participation enregistrée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la participation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la participation à l\'événement'
    });
  }
});

// Se désinscrire d'un événement
router.delete('/events/:id/participate', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participation non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Désinscription effectuée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la désinscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la désinscription'
    });
  }
});

// Vérifier la participation d'un utilisateur à un événement
router.get('/events/:id/participation', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({
      success: true,
      data: {
        isParticipating: result.rows.length > 0
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de participation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de participation'
    });
  }
});

// Récupérer les participants d'un événement (admin)
router.get('/events/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '', status = '' } = req.query;

    let whereConditions = ['ep.event_id = $1'];
    let queryParams = [id];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereConditions.push(`u.email ILIKE $${paramCount}`);
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`ep.status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Compter le total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Récupérer les participants
    const offset = (page - 1) * limit;
    const participantsQuery = `
      SELECT 
        ep.id,
        ep.status,
        ep.registered_at,
        u.id as user_id,
        u.email,
        u.role
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      ${whereClause}
      ORDER BY ep.registered_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const participantsResult = await pool.query(participantsQuery, queryParams);

    res.json({
      success: true,
      data: participantsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des participants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des participants'
    });
  }
});

// Supprimer un participant d'un événement (admin)
router.delete('/events/:eventId/participants/:participantId', async (req, res) => {
  try {
    const { eventId, participantId } = req.params;

    const result = await pool.query(
      'DELETE FROM event_participants WHERE id = $1 AND event_id = $2',
      [participantId, eventId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participant non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Participant supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du participant:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du participant'
    });
  }
});

// ===== TAGS =====
router.get('/tags', async (req, res) => {
  try {
    const { search = '' } = req.query;
    
    let query = `
      SELECT t.*, 
             COUNT(dt.discussion_id) as usage_count
      FROM tags t
      LEFT JOIN discussion_tags dt ON t.id = dt.tag_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (search) {
      conditions.push(`t.name ILIKE $1`);
      params.push(`%${search}%`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += `
      GROUP BY t.id
      ORDER BY usage_count DESC, t.name ASC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des tags:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des tags'
    });
  }
});

// ===== ACTIONS ADMIN =====

// Créer une catégorie
router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, description, color, icon, sort_order } = req.body;
    
    const query = `
      INSERT INTO discussion_categories (name, description, color, icon, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, description, color, icon, sort_order]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la catégorie'
    });
  }
});

// Créer un événement
router.post('/events', requireAdmin, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      event_type, 
      start_date, 
      end_date, 
      location, 
      is_virtual, 
      max_participants 
    } = req.body;
    
    const query = `
      INSERT INTO community_events (title, description, event_type, start_date, end_date, location, is_virtual, max_participants, organizer_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLISHED')
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      title, description, event_type, start_date, end_date, location, is_virtual, max_participants, req.user.id
    ]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'événement'
    });
  }
});


// Nettoyer les anciennes données
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    await pool.query('SELECT cleanup_old_community_data()');
    
    res.json({
      success: true,
      message: 'Nettoyage des anciennes données effectué'
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du nettoyage'
    });
  }
});

module.exports = router;
