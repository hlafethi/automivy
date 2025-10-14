-- Table pour les tokens de réinitialisation de mot de passe
CREATE TABLE IF NOT EXISTS forgot_password_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_forgot_password_tokens_token ON forgot_password_tokens(token);
CREATE INDEX IF NOT EXISTS idx_forgot_password_tokens_user_id ON forgot_password_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_forgot_password_tokens_email ON forgot_password_tokens(email);
CREATE INDEX IF NOT EXISTS idx_forgot_password_tokens_expires_at ON forgot_password_tokens(expires_at);

-- Nettoyer les tokens expirés (à exécuter périodiquement)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM forgot_password_tokens 
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;
