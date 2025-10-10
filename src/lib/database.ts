import { Pool, PoolClient } from 'pg';

// Configuration de la base de données PostgreSQL
const pool = new Pool({
  host: import.meta.env.VITE_DB_HOST || '147.93.58.155',
  port: parseInt(import.meta.env.VITE_DB_PORT || '5432'),
  database: import.meta.env.VITE_DB_NAME || 'automivy',
  user: import.meta.env.VITE_DB_USER || 'fethi',
  password: import.meta.env.VITE_DB_PASSWORD || 'Fethi@2025!',
  ssl: import.meta.env.VITE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  json: any;
  created_by: string | null;
  created_at: string;
}

export interface Workflow {
  id: string;
  user_id: string;
  template_id: string | null;
  n8n_workflow_id: string | null;
  name: string;
  params: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminApiKey {
  id: string;
  service_name: string;
  api_key: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface OAuthCredential {
  id: string;
  user_id: string;
  provider: string;
  encrypted_data: any;
  n8n_credential_id: string | null;
  email: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCredential {
  id: string;
  user_id: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_secure: boolean;
  n8n_imap_credential_id: string | null;
  n8n_smtp_credential_id: string | null;
  created_at: string;
  updated_at: string;
}

// Classe pour gérer les requêtes de base de données
export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Méthodes pour les utilisateurs
  async createUser(email: string, passwordHash: string, role: 'user' | 'admin' = 'user'): Promise<User> {
    const result = await this.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
      [email, passwordHash, role]
    );
    return result.rows[0];
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // Méthodes pour les profils utilisateur
  async createUserProfile(id: string, email: string, role: 'user' | 'admin' = 'user'): Promise<UserProfile> {
    const result = await this.query(
      'INSERT INTO user_profiles (id, email, role) VALUES ($1, $2, $3) RETURNING *',
      [id, email, role]
    );
    return result.rows[0];
  }

  async getUserProfile(id: string): Promise<UserProfile | null> {
    const result = await this.query(
      'SELECT * FROM user_profiles WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // Méthodes pour les templates
  async getAllTemplates(): Promise<Template[]> {
    const result = await this.query(
      'SELECT * FROM templates ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getTemplate(id: string): Promise<Template | null> {
    const result = await this.query(
      'SELECT * FROM templates WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async createTemplate(name: string, description: string, json: any, createdBy: string): Promise<Template> {
    const result = await this.query(
      'INSERT INTO templates (name, description, json, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, json, createdBy]
    );
    return result.rows[0];
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.query(
      'DELETE FROM templates WHERE id = $1',
      [id]
    );
  }

  // Méthodes pour les workflows
  async getUserWorkflows(userId: string): Promise<Workflow[]> {
    const result = await this.query(
      'SELECT * FROM workflows WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getAllWorkflows(): Promise<Workflow[]> {
    const result = await this.query(
      'SELECT * FROM workflows ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async createWorkflow(userId: string, templateId: string | null, n8nWorkflowId: string | null, name: string, params: any): Promise<Workflow> {
    const result = await this.query(
      'INSERT INTO workflows (user_id, template_id, n8n_workflow_id, name, params) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, templateId, n8nWorkflowId, name, params]
    );
    return result.rows[0];
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates).filter(value => value !== undefined);
    const result = await this.query(
      `UPDATE workflows SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.query(
      'DELETE FROM workflows WHERE id = $1',
      [id]
    );
  }

  // Méthodes pour les clés API admin
  async getActiveApiKeys(): Promise<Record<string, string>> {
    const result = await this.query(
      'SELECT service_name, api_key FROM admin_api_keys WHERE is_active = true'
    );
    
    const keys: Record<string, string> = {};
    result.rows.forEach((row: any) => {
      keys[row.service_name] = row.api_key;
    });
    return keys;
  }

  async getApiKey(serviceName: string): Promise<string | null> {
    const result = await this.query(
      'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true',
      [serviceName]
    );
    return result.rows[0]?.api_key || null;
  }

  async createApiKey(serviceName: string, apiKey: string, description: string, createdBy: string): Promise<AdminApiKey> {
    const result = await this.query(
      'INSERT INTO admin_api_keys (service_name, api_key, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [serviceName, apiKey, description, createdBy]
    );
    return result.rows[0];
  }

  // Méthodes pour les credentials OAuth
  async createOAuthCredential(userId: string, provider: string, encryptedData: any, n8nCredentialId: string | null, email: string | null, expiresAt: string | null): Promise<OAuthCredential> {
    const result = await this.query(
      'INSERT INTO oauth_credentials (user_id, provider, encrypted_data, n8n_credential_id, email, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, provider, encryptedData, n8nCredentialId, email ?? null, expiresAt]
    );
    return result.rows[0];
  }

  async getOAuthCredentials(userId: string, provider?: string): Promise<OAuthCredential[]> {
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

  // Méthodes pour les credentials email
  async createEmailCredential(userId: string, emailAddress: string, imapHost: string, imapPort: number, imapUser: string, imapPassword: string, smtpHost?: string, smtpPort?: number, smtpUser?: string, smtpPassword?: string, smtpSecure: boolean = true): Promise<EmailCredential> {
    const result = await this.query(
      'INSERT INTO email_credentials (user_id, email_address, imap_host, imap_port, imap_user, imap_password, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [userId, emailAddress, imapHost, imapPort, imapUser, imapPassword, smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure]
    );
    return result.rows[0];
  }

  async getEmailCredentials(userId: string): Promise<EmailCredential[]> {
    const result = await this.query(
      'SELECT * FROM email_credentials WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  // Méthodes pour les clés API admin
  async getAllApiKeys(): Promise<AdminApiKey[]> {
    const result = await this.query(
      'SELECT * FROM admin_api_keys ORDER BY service_name'
    );
    return result.rows;
  }

  async updateApiKey(id: string, updates: Partial<AdminApiKey>): Promise<AdminApiKey> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates).filter(value => value !== undefined);
    const result = await this.query(
      `UPDATE admin_api_keys SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.query(
      'DELETE FROM admin_api_keys WHERE id = $1',
      [id]
    );
  }

  async deleteOAuthCredential(id: string): Promise<void> {
    await this.query(
      'DELETE FROM oauth_credentials WHERE id = $1',
      [id]
    );
  }
}

export const db = new DatabaseService();
