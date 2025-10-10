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

  async getTemplates(userId) {
    const result = await this.query(
      'SELECT * FROM templates WHERE created_by = $1 ORDER BY created_at DESC',
      [userId]
    );
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
    const result = await this.query(
      'SELECT * FROM templates WHERE id = $1 AND (created_by = $2 OR visible = true)',
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
    const result = await this.query(
      'SELECT * FROM workflows WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
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
    const result = await this.query(
      'SELECT * FROM admin_api_keys WHERE created_by = $1 ORDER BY created_at DESC',
      [userId]
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
      isActive = true
    } = data;

    const result = await this.query(
      `INSERT INTO user_workflows 
       (user_id, template_id, n8n_workflow_id, n8n_credential_id, name, description, schedule, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [userId, templateId, n8nWorkflowId, n8nCredentialId, name, description, schedule, isActive]
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
    const result = await this.query(
      'DELETE FROM user_workflows WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }
}

module.exports = new Database();
