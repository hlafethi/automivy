// Types partagés entre frontend et backend
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  workflow_data: any;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  workflow_data: any;
  n8n_workflow_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWorkflow {
  id: string;
  user_id: string;
  template_id: string;
  n8n_workflow_id: string;
  n8n_credential_id: string;
  name: string;
  description?: string;
  schedule: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  service: string;
  created_at: string;
  updated_at: string;
}

export interface OAuthCredential {
  id: string;
  user_id: string;
  provider: string;
  encrypted_data: any;
  n8n_credential_id?: string;
  email?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailCredential {
  id: string;
  user_id: string;
  name: string;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  created_at: string;
  updated_at: string;
}
