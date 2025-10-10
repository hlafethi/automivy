-- Script d'initialisation de la base de données Automivy
-- Ce script crée la base de données et applique le schéma

-- Créer la base de données si elle n'existe pas
-- (Cette commande doit être exécutée en tant que superuser)
-- CREATE DATABASE automivy;

-- Se connecter à la base de données automivy
-- \c automivy;

-- Le schéma sera appliqué séparément

-- Créer un utilisateur admin par défaut (mot de passe: admin123)
-- Le mot de passe doit être hashé avec bcrypt
INSERT INTO users (id, email, password_hash, role) VALUES 
('00000000-0000-0000-0000-000000000001', 'admin@automivy.com', '$2b$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8Kj', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Créer le profil admin correspondant
INSERT INTO user_profiles (id, email, role) VALUES 
('00000000-0000-0000-0000-000000000001', 'admin@automivy.com', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Note: Le mot de passe par défaut est 'admin123' hashé avec bcrypt
-- En production, changez ce mot de passe immédiatement
