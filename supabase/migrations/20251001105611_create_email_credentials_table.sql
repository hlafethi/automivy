/*
  # Create Email Credentials Table

  1. New Tables
    - `email_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email_address` (text) - The email address
      - `imap_host` (text) - IMAP server host
      - `imap_port` (integer) - IMAP port (default 993)
      - `imap_user` (text) - IMAP username
      - `imap_password` (text) - Encrypted IMAP password
      - `smtp_host` (text) - SMTP server host
      - `smtp_port` (integer) - SMTP port (default 587)
      - `smtp_user` (text) - SMTP username
      - `smtp_password` (text) - Encrypted SMTP password
      - `smtp_secure` (boolean) - Use TLS/SSL (default true)
      - `n8n_imap_credential_id` (text) - n8n credential ID for IMAP
      - `n8n_smtp_credential_id` (text) - n8n credential ID for SMTP
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `email_credentials` table
    - Add policies for users to manage their own email credentials
*/

CREATE TABLE IF NOT EXISTS email_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_address text NOT NULL,
  imap_host text NOT NULL,
  imap_port integer DEFAULT 993 NOT NULL,
  imap_user text NOT NULL,
  imap_password text NOT NULL,
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password text,
  smtp_secure boolean DEFAULT true,
  n8n_imap_credential_id text,
  n8n_smtp_credential_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE email_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email credentials"
  ON email_credentials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email credentials"
  ON email_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email credentials"
  ON email_credentials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email credentials"
  ON email_credentials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_credentials_user_id ON email_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_email_credentials_email_address ON email_credentials(email_address);
