const { Pool } = require('pg');
const config = require('./config');

class Database {
  constructor() {
    this.pool = new Pool(config.database);
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async end() {
    await this.pool.end();
  }

  // Méthodes pour les utilisateurs
  async createUser(email, passwordHash, role = 'user') {
    const result = await this.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
      [email, passwordHash, role]
    );
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const result = await this.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async getUserById(id) {
    const result = await this.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async createUserProfile(userId, email, role) {
    const result = await this.query(
      'INSERT INTO user_profiles (id, email, role) VALUES ($1, $2, $3) RETURNING *',
      [userId, email, role]
    );
    return result.rows[0];
  }

  // Méthodes pour les templates
  async createTemplate(userId, name, description, workflowData) {
    const result = await this.query(
      'INSERT INTO templates (created_by, name, description, json) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, description, JSON.stringify(workflowData)]
    );
    return result.rows[0];
  }

  async getTemplates(userId, userRole = 'user') {
    let query, params;
    
    if (userRole === 'admin') {
      // Les admins voient tous les templates
      query = 'SELECT * FROM templates ORDER BY created_at DESC';
      params = [];
    } else {
      // Les utilisateurs normaux voient les templates visibles
      query = 'SELECT * FROM templates WHERE visible = true ORDER BY created_at DESC';
      params = [];
    }
    
    const result = await this.query(query, params);
    return result.rows;
  }

  async getVisibleTemplates() {
    const result = await this.query(
      'SELECT * FROM templates WHERE visible = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async updateTemplateVisibility(id, visible) {
    const result = await this.query(
      'UPDATE templates SET visible = $1 WHERE id = $2 RETURNING *',
      [visible, id]
    );
    return result.rows[0];
  }

  async getTemplateById(id, userId) {
    const result = await this.query(
      'SELECT * FROM templates WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    return result.rows[0];
  }

  async getTemplateByIdForUser(id, userId) {
    // Permet aux utilisateurs d'accéder aux templates visibles même s'ils ne les ont pas créés
    // Les admins peuvent accéder à tous les templates
    const result = await this.query(
      'SELECT * FROM templates WHERE id = $1 AND (created_by = $2 OR visible = true OR $2 = (SELECT id FROM users WHERE role = \'admin\' LIMIT 1))',
      [id, userId]
    );
    return result.rows[0];
  }

  async updateTemplate(id, userId, updates) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');
    
    const values = [id, userId, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE templates SET ${setClause} WHERE id = $1 AND created_by = $2 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async updateTemplateAsAdmin(id, updates) {
    // Permet aux admins de mettre à jour n'importe quel template sans vérifier created_by
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE templates SET ${setClause} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteTemplate(id, userId) {
    const result = await this.query(
      'DELETE FROM templates WHERE id = $1 AND created_by = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  // Méthodes pour les workflows
  async createWorkflow(userId, name, description, workflowData, n8nWorkflowId, templateId = null) {
    const result = await this.query(
      'INSERT INTO workflows (user_id, name, n8n_workflow_id, template_id, params) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, name, n8nWorkflowId, templateId, JSON.stringify({ description, workflowData })]
    );
    return result.rows[0];
  }

  async getWorkflows(userId) {
    const result = await this.query(`
      SELECT 
        id,
        user_id,
        name,
        n8n_workflow_id,
        template_id,
        params,
        is_active as active,
        created_at,
        updated_at
      FROM workflows 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);
    return result.rows;
  }

  async getAllWorkflows() {
    const result = await this.query(`
      SELECT 
        uw.id,
        uw.user_id,
        uw.name,
        uw.n8n_workflow_id,
        uw.template_id,
        uw.description,
        uw.schedule,
        uw.is_active as active,
        uw.created_at,
        uw.updated_at,
        u.email as user_email,
        u.role as user_role,
        t.name as template_name
      FROM user_workflows uw
      LEFT JOIN users u ON uw.user_id = u.id
      LEFT JOIN templates t ON uw.template_id = t.id
      ORDER BY uw.created_at DESC
    `);
    return result.rows;
  }

  async getWorkflowById(id, userId) {
    const result = await this.query(
      'SELECT * FROM workflows WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0];
  }

  async updateWorkflow(id, userId, updates) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');
    
    const values = [id, userId, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE workflows SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteWorkflow(id, userId) {
    const result = await this.query(
      'DELETE FROM workflows WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  // Méthodes pour les clés API
  async createApiKey(userId, name, key, service) {
    const result = await this.query(
      'INSERT INTO admin_api_keys (created_by, service_name, api_key, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, service, key, name]
    );
    return result.rows[0];
  }

  async getApiKeys(userId) {
    // Seuls les admins peuvent accéder aux clés API
    const result = await this.query(
      'SELECT * FROM admin_api_keys ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async deleteApiKey(id, userId) {
    const result = await this.query(
      'DELETE FROM admin_api_keys WHERE id = $1 AND created_by = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  // Méthodes pour les credentials OAuth
  async createOAuthCredential(userId, provider, encryptedData, n8nCredentialId, email, expiresAt) {
    const result = await this.query(
      'INSERT INTO oauth_credentials (user_id, provider, encrypted_data, n8n_credential_id, email, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, provider, encryptedData, n8nCredentialId, email, expiresAt]
    );
    return result.rows[0];
  }

  async getOAuthCredentials(userId, provider) {
    let query = 'SELECT * FROM oauth_credentials WHERE user_id = $1';
    const params = [userId];
    
    if (provider) {
      query += ' AND provider = $2';
      params.push(provider);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.query(query, params);
    return result.rows;
  }

  async deleteOAuthCredential(id, userId) {
    const result = await this.query(
      'DELETE FROM oauth_credentials WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  // Méthodes pour les credentials email
  async createEmailCredential(userId, name, imapHost, imapPort, imapUser, imapPassword, smtpHost, smtpPort, smtpUser, smtpPassword) {
    const result = await this.query(
      'INSERT INTO email_credentials (user_id, name, imap_host, imap_port, imap_user, imap_password, smtp_host, smtp_port, smtp_user, smtp_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [userId, name, imapHost, imapPort, imapUser, imapPassword, smtpHost, smtpPort, smtpUser, smtpPassword]
    );
    return result.rows[0];
  }

  async getEmailCredentials(userId) {
    const result = await this.query(
      'SELECT * FROM email_credentials WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async deleteEmailCredential(id, userId) {
    const result = await this.query(
      'DELETE FROM email_credentials WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  // Méthodes pour les workflows utilisateur
  async createUserWorkflow(data) {
    const {
      userId,
      templateId,
      n8nWorkflowId,
      n8nCredentialId,
      name,
      description,
      schedule,
      isActive = true,
      webhookPath
    } = data;

    // Vérifier si la colonne webhook_path existe, sinon l'ajouter
    try {
      await this.query(`
        ALTER TABLE user_workflows 
        ADD COLUMN IF NOT EXISTS webhook_path VARCHAR(255)
      `);
    } catch (err) {
      // La colonne existe déjà ou erreur, continuer
      console.log('🔍 [Database] Colonne webhook_path:', err.message.includes('already exists') ? 'existe déjà' : 'erreur');
    }

    const result = await this.query(
      `INSERT INTO user_workflows 
       (user_id, template_id, n8n_workflow_id, n8n_credential_id, name, description, schedule, is_active, webhook_path) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [userId, templateId, n8nWorkflowId, n8nCredentialId, name, description, schedule, isActive, webhookPath]
    );
    return result.rows[0];
  }

  async getUserWorkflows(userId) {
    const result = await this.query(
      'SELECT * FROM user_workflows WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getUserWorkflowById(id, userId) {
    const result = await this.query(
      'SELECT * FROM user_workflows WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0];
  }

  async updateUserWorkflow(id, userId, updates) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');
    
    const values = [id, userId, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE user_workflows SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async toggleUserWorkflow(id, userId, active) {
    const result = await this.query(
      'UPDATE user_workflows SET is_active = $3 WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId, active]
    );
    return result.rows[0];
  }

  async deleteUserWorkflow(id, userId) {
    const client = await this.pool.connect();
    try {
      console.log('🔧 [Database] Suppression workflow:', { id, userId });
      
      await client.query('BEGIN');
      
      // Désactiver temporairement RLS pour permettre la suppression
      await client.query('SET LOCAL row_security = off');
      
      // Récupérer le n8n_workflow_id avant suppression
      const workflowResult = await client.query(
        'SELECT n8n_workflow_id FROM user_workflows WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (workflowResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn('⚠️ [Database] Workflow non trouvé');
        return null;
      }
      
      const n8nWorkflowId = workflowResult.rows[0].n8n_workflow_id;
      
      // Supprimer d'abord les enregistrements dans workflow_executions qui référencent ce workflow
      // La contrainte utilise user_workflow_id (l'ID de la table user_workflows), pas n8n_workflow_id
      // Utiliser SAVEPOINT pour pouvoir continuer même en cas d'erreur
      try {
        await client.query('SAVEPOINT before_delete_executions');
        const deleteExecutionsResult = await client.query(
          'DELETE FROM workflow_executions WHERE user_workflow_id = $1',
          [id]
        );
        await client.query('RELEASE SAVEPOINT before_delete_executions');
        console.log(`🧹 [Database] ${deleteExecutionsResult.rowCount} exécution(s) supprimée(s) pour workflow ${id}`);
      } catch (execError) {
        // Rollback au savepoint pour continuer la transaction
        await client.query('ROLLBACK TO SAVEPOINT before_delete_executions');
        // Si la table n'existe pas ou s'il n'y a pas d'enregistrements, continuer
        if (execError.message.includes('does not exist') || execError.code === '42P01') {
          console.log('ℹ️ [Database] Table workflow_executions n\'existe pas, continuation...');
        } else {
          console.warn('⚠️ [Database] Erreur suppression executions (non bloquant):', execError.message);
        }
      }
      
      // Supprimer le workflow de user_workflows
      const result = await client.query(
        'DELETE FROM user_workflows WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
      
      await client.query('COMMIT');
      
      console.log('✅ [Database] Workflow supprimé:', result.rows.length > 0 ? result.rows[0].id : 'aucun');
      return result.rows[0];
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('❌ [Database] Erreur lors du rollback:', rollbackError);
      }
      console.error('❌ [Database] Erreur suppression workflow:', error);
      console.error('❌ [Database] Error message:', error.message);
      console.error('❌ [Database] Error code:', error.code);
      console.error('❌ [Database] Error detail:', error.detail);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new Database();
