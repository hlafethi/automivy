const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Configuration de la base de données
const pool = new Pool({
  user: process.env.DB_USER || 'fethi',
  host: process.env.DB_HOST || '147.93.58.155',
  database: process.env.DB_NAME || 'automivy',
  password: process.env.DB_PASSWORD || 'Fethi@2025!',
  port: process.env.DB_PORT || 5432,
});

// Appliquer le middleware d'authentification à toutes les routes
router.use(authenticateToken);

// Route pour récupérer tous les tickets (admin) ou les tickets de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const { user } = req;
    // console.log(`🎫 [Tickets] Récupération des tickets pour l'utilisateur: ${user.email}`);

    let query;
    let params = [];

    if (user.role === 'admin') {
      // Admin peut voir tous les tickets
      query = `
        SELECT 
          t.*,
          u1.email as created_by_email,
          u1.role as created_by_role,
          u2.email as assigned_to_email,
          u2.role as assigned_to_role,
          COUNT(tc.id) as comments_count,
          COUNT(ta.id) as attachments_count
        FROM tickets t
        LEFT JOIN users u1 ON t.user_id = u1.id
        LEFT JOIN users u2 ON t.assigned_to = u2.id
        LEFT JOIN ticket_comments tc ON t.id = tc.ticket_id
        LEFT JOIN ticket_attachments ta ON t.id = ta.ticket_id
        GROUP BY t.id, u1.email, u1.role, u2.email, u2.role
        ORDER BY t.created_at DESC
      `;
    } else {
      // Utilisateur ne voit que ses tickets et ceux qui lui sont assignés
      query = `
        SELECT 
          t.*,
          u1.email as created_by_email,
          u1.role as created_by_role,
          u2.email as assigned_to_email,
          u2.role as assigned_to_role,
          COUNT(tc.id) as comments_count,
          COUNT(ta.id) as attachments_count
        FROM tickets t
        LEFT JOIN users u1 ON t.user_id = u1.id
        LEFT JOIN users u2 ON t.assigned_to = u2.id
        LEFT JOIN ticket_comments tc ON t.id = tc.ticket_id
        LEFT JOIN ticket_attachments ta ON t.id = ta.ticket_id
        WHERE t.user_id = $1 OR t.assigned_to = $1
        GROUP BY t.id, u1.email, u1.role, u2.email, u2.role
        ORDER BY t.created_at DESC
      `;
      params = [user.id];
    }
    
    const result = await pool.query(query, params);
    const tickets = result.rows;

    // console.log(`✅ [Tickets] ${tickets.length} tickets récupérés`);

    res.json({
      success: true,
      tickets: tickets,
      total: tickets.length
    });
  } catch (error) {
    console.error('❌ [Tickets] Erreur lors de la récupération des tickets:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des tickets',
      details: error.message 
    });
  }
});

// Route pour récupérer un ticket spécifique avec ses commentaires
router.get('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { user } = req;
    
    // console.log(`🎫 [Tickets] Récupération du ticket: ${ticketId}`);

    // Vérifier les permissions
    const permissionQuery = `
      SELECT user_id, assigned_to FROM tickets WHERE id = $1
    `;
    const permissionResult = await pool.query(permissionQuery, [ticketId]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé' });
    }

    const ticket = permissionResult.rows[0];
    const canView = user.role === 'admin' || 
                   ticket.user_id === user.id || 
                   ticket.assigned_to === user.id;

    if (!canView) {
      return res.status(403).json({ error: 'Accès non autorisé à ce ticket' });
    }

    // Récupérer les détails du ticket
    const ticketQuery = `
      SELECT 
        t.*,
        u1.email as created_by_email,
        u1.role as created_by_role,
        u2.email as assigned_to_email,
        u2.role as assigned_to_role
      FROM tickets t
      LEFT JOIN users u1 ON t.user_id = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.id = $1
    `;
    
    const ticketResult = await pool.query(ticketQuery, [ticketId]);
    const ticketDetails = ticketResult.rows[0];

    // Récupérer les commentaires
    const commentsQuery = `
      SELECT 
        tc.*,
        u.email as author_email,
        u.role as author_role
      FROM ticket_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC
    `;
    
    const commentsResult = await pool.query(commentsQuery, [ticketId]);
    const comments = commentsResult.rows;

    // Récupérer les fichiers joints
    const attachmentsQuery = `
      SELECT 
        ta.*,
        u.email as uploaded_by_email
      FROM ticket_attachments ta
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE ta.ticket_id = $1
      ORDER BY ta.created_at ASC
    `;
    
    const attachmentsResult = await pool.query(attachmentsQuery, [ticketId]);
    const attachments = attachmentsResult.rows;

    const ticketWithDetails = {
      ...ticketDetails,
      comments: comments,
      attachments: attachments
    };

    // console.log(`✅ [Tickets] Détails récupérés pour le ticket: ${ticketId}`);

    res.json({
      success: true,
      ticket: ticketWithDetails
    });
  } catch (error) {
    console.error('❌ [Tickets] Erreur lors de la récupération du ticket:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du ticket',
      details: error.message 
    });
  }
});

// Route pour créer un nouveau ticket
router.post('/', async (req, res) => {
  try {
    const { user } = req;
    const { title, description, priority = 'medium', category = 'general' } = req.body;
    
    console.log(`🎫 [Tickets] Création d'un nouveau ticket par: ${user.email}`);

    if (!title || !description) {
      return res.status(400).json({ error: 'Titre et description requis' });
    }

    const query = `
      INSERT INTO tickets (title, description, priority, category, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(query, [title, description, priority, category, user.id]);
    const newTicket = result.rows[0];

    // Créer une notification pour tous les admins
    try {
      const adminQuery = `SELECT id FROM users WHERE role = 'admin'`;
      const adminResult = await pool.query(adminQuery);
      
      for (const admin of adminResult.rows) {
        const notificationQuery = `
          INSERT INTO ticket_notifications (ticket_id, user_id, type, message, ticket_title, ticket_status)
          VALUES ($1, $2, 'created', $3, $4, $5)
        `;
        const message = `Nouveau ticket créé par ${user.email}: ${title}`;
        await pool.query(notificationQuery, [
          newTicket.id,
          admin.id,
          message,
          title,
          newTicket.status
        ]);
      }
      console.log(`🔔 [Tickets] Notifications créées pour ${adminResult.rows.length} admins`);
    } catch (notificationError) {
      console.error('❌ [Tickets] Erreur lors de la création des notifications:', notificationError);
      // Ne pas faire échouer la création du ticket si les notifications échouent
    }

    console.log(`✅ [Tickets] Ticket créé: ${newTicket.id}`);

    res.status(201).json({
      success: true,
      message: 'Ticket créé avec succès',
      ticket: newTicket
    });
  } catch (error) {
    console.error('❌ [Tickets] Erreur lors de la création du ticket:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du ticket',
      details: error.message 
    });
  }
});

// Route pour mettre à jour un ticket
router.put('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { user } = req;
    const { title, description, status, priority, category, assigned_to } = req.body;
    
    console.log(`🎫 [Tickets] Mise à jour du ticket: ${ticketId}`);

    // Vérifier les permissions
    const permissionQuery = `
      SELECT user_id, assigned_to FROM tickets WHERE id = $1
    `;
    const permissionResult = await pool.query(permissionQuery, [ticketId]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé' });
    }

    const ticket = permissionResult.rows[0];
    const canUpdate = user.role === 'admin' || ticket.user_id === user.id;

    if (!canUpdate) {
      return res.status(403).json({ error: 'Accès non autorisé à ce ticket' });
    }

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
      if (status === 'resolved') {
        updates.push(`resolved_at = NOW()`);
      } else if (status === 'closed') {
        updates.push(`closed_at = NOW()`);
      }
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`);
      values.push(assigned_to);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(ticketId);

    const query = `
      UPDATE tickets 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    const updatedTicket = result.rows[0];

    console.log(`✅ [Tickets] Ticket mis à jour: ${ticketId}`);

    res.json({
      success: true,
      message: 'Ticket mis à jour avec succès',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('❌ [Tickets] Erreur lors de la mise à jour du ticket:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du ticket',
      details: error.message 
    });
  }
});

// Route pour ajouter un commentaire à un ticket
router.post('/:ticketId/comments', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { user } = req;
    const { content, comment_text, is_internal = false } = req.body;
    const commentContent = content || comment_text;
    
    console.log(`💬 [Tickets] Ajout d'un commentaire au ticket: ${ticketId}`);

    if (!commentContent) {
      return res.status(400).json({ error: 'Contenu du commentaire requis' });
    }

    // Vérifier les permissions
    const permissionQuery = `
      SELECT user_id, assigned_to FROM tickets WHERE id = $1
    `;
    const permissionResult = await pool.query(permissionQuery, [ticketId]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé' });
    }

    const ticket = permissionResult.rows[0];
    const canComment = user.role === 'admin' || 
                      ticket.user_id === user.id || 
                      ticket.assigned_to === user.id;

    if (!canComment) {
      return res.status(403).json({ error: 'Accès non autorisé à ce ticket' });
    }

    const query = `
      INSERT INTO ticket_comments (ticket_id, user_id, comment_text)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [ticketId, user.id, commentContent]);
    const newComment = result.rows[0];

    // Créer des notifications pour les autres participants du ticket
    try {
      // Récupérer les détails du ticket pour les notifications
      const ticketDetailsQuery = `
        SELECT t.title, t.status, t.user_id, t.assigned_to
        FROM tickets t
        WHERE t.id = $1
      `;
      const ticketDetailsResult = await pool.query(ticketDetailsQuery, [ticketId]);
      const ticketDetails = ticketDetailsResult.rows[0];

      // Créer une liste des utilisateurs à notifier (créateur, assigné, admins)
      const notifyUsers = new Set();
      
      // Ajouter le créateur du ticket
      if (ticketDetails.user_id) {
        notifyUsers.add(ticketDetails.user_id);
      }
      
      // Ajouter l'assigné du ticket
      if (ticketDetails.assigned_to) {
        notifyUsers.add(ticketDetails.assigned_to);
      }
      
      // Ajouter tous les admins
      const adminQuery = `SELECT id FROM users WHERE role = 'admin'`;
      const adminResult = await pool.query(adminQuery);
      adminResult.rows.forEach(admin => notifyUsers.add(admin.id));
      
      // Retirer l'auteur du commentaire de la liste
      notifyUsers.delete(user.id);

      // Créer les notifications
      for (const userId of notifyUsers) {
        const notificationQuery = `
          INSERT INTO ticket_notifications (ticket_id, user_id, type, message, ticket_title, ticket_status)
          VALUES ($1, $2, 'commented', $3, $4, $5)
        `;
        const message = `Nouveau commentaire de ${user.email} sur le ticket: ${ticketDetails.title}`;
        await pool.query(notificationQuery, [
          ticketId,
          userId,
          message,
          ticketDetails.title,
          ticketDetails.status
        ]);
      }
      console.log(`🔔 [Tickets] Notifications de commentaire créées pour ${notifyUsers.size} utilisateurs`);
    } catch (notificationError) {
      console.error('❌ [Tickets] Erreur lors de la création des notifications de commentaire:', notificationError);
      // Ne pas faire échouer l'ajout du commentaire si les notifications échouent
    }

    console.log(`✅ [Tickets] Commentaire ajouté au ticket: ${ticketId}`);

    res.status(201).json({
      success: true,
      message: 'Commentaire ajouté avec succès',
      comment: newComment
    });
  } catch (error) {
    console.error('❌ [Tickets] Erreur lors de l\'ajout du commentaire:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'ajout du commentaire',
      details: error.message 
    });
  }
});

// Route pour récupérer les notifications de tickets
router.get('/notifications/unread', async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`🔔 [Tickets] Récupération des notifications pour: ${user.email}`);

    const query = `
      SELECT 
        tn.*,
        t.title as ticket_title,
        t.status as ticket_status
      FROM ticket_notifications tn
      LEFT JOIN tickets t ON tn.ticket_id = t.id
      WHERE tn.user_id = $1 AND tn.is_read = false
      ORDER BY tn.created_at DESC
    `;
    
    const result = await pool.query(query, [user.id]);
    const notifications = result.rows;

    console.log(`✅ [Tickets] ${notifications.length} notifications non lues récupérées`);

    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('❌ [Tickets] Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des notifications',
      details: error.message 
    });
  }
});

// Route pour marquer une notification comme lue
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { user } = req;
    
    console.log(`🔔 [Tickets] Marquage de la notification comme lue: ${notificationId}`);

    const query = `
      UPDATE ticket_notifications 
      SET is_read = true 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [notificationId, user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    console.log(`✅ [Tickets] Notification marquée comme lue: ${notificationId}`);

    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    console.error('❌ [Tickets] Erreur lors du marquage de la notification:', error);
    res.status(500).json({ 
      error: 'Erreur lors du marquage de la notification',
      details: error.message 
    });
  }
});

// Route pour les statistiques des tickets (admin uniquement)
router.get('/stats/overview', async (req, res) => {
  try {
    const { user } = req;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    console.log('📊 [Tickets] Récupération des statistiques des tickets...');

    const statsQuery = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as tickets_this_week,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as tickets_this_month
      FROM tickets
    `;
    
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    console.log('✅ [Tickets] Statistiques récupérées');

    res.json({
      success: true,
      stats: {
        total: parseInt(stats.total_tickets),
        open: parseInt(stats.open_tickets),
        inProgress: parseInt(stats.in_progress_tickets),
        resolved: parseInt(stats.resolved_tickets),
        closed: parseInt(stats.closed_tickets),
        urgent: parseInt(stats.urgent_tickets),
        highPriority: parseInt(stats.high_priority_tickets),
        thisWeek: parseInt(stats.tickets_this_week),
        thisMonth: parseInt(stats.tickets_this_month)
      }
    });
  } catch (error) {
    console.error('❌ [Tickets] Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques',
      details: error.message 
    });
  }
});

module.exports = router;
