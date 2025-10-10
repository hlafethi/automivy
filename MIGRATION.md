# Migration de Supabase vers PostgreSQL

Ce document décrit la migration du projet Automivy de Supabase vers PostgreSQL hébergé sur votre VPS.

## Changements effectués

### 1. Configuration de la base de données

- **Nouveau fichier** : `src/lib/database.ts` - Service de base de données PostgreSQL
- **Nouveau fichier** : `database/schema.sql` - Schéma PostgreSQL avec RLS
- **Nouveau fichier** : `database/init.sql` - Script d'initialisation
- **Nouveau fichier** : `scripts/init-database.js` - Script d'initialisation Node.js

### 2. Système d'authentification

- **Modifié** : `src/lib/auth.ts` - Authentification JWT au lieu de Supabase Auth
- **Modifié** : `src/contexts/AuthContext.tsx` - Contexte d'authentification mis à jour
- **Supprimé** : `src/lib/supabase.ts` - Plus nécessaire

### 3. Services mis à jour

Tous les services ont été mis à jour pour utiliser PostgreSQL :

- `src/services/apiKeyService.ts`
- `src/services/templateService.ts`
- `src/services/workflowService.ts`
- `src/services/oauthService.ts`
- `src/services/emailCredentialService.ts`

### 4. Structure de la base de données

Les tables suivantes ont été créées avec RLS (Row Level Security) :

- `users` - Utilisateurs avec authentification
- `user_profiles` - Profils utilisateur
- `templates` - Templates de workflows
- `workflows` - Workflows utilisateur
- `admin_api_keys` - Clés API administrateur
- `oauth_credentials` - Credentials OAuth
- `email_credentials` - Credentials email

## Configuration requise

### Variables d'environnement

Créez un fichier `.env` avec les variables suivantes :

```env
# Configuration de la base de données PostgreSQL
VITE_DB_HOST=147.93.58.155
VITE_DB_PORT=5432
VITE_DB_NAME=automivy
VITE_DB_USER=fethi
VITE_DB_PASSWORD=Fethi@2025!
VITE_DB_SSL=false

# Configuration JWT
VITE_JWT_SECRET=your-secret-key-change-in-production

# Configuration n8n
VITE_N8N_URL=http://localhost:5678
VITE_N8N_API_KEY=your-n8n-api-key
```

### Initialisation de la base de données

1. **Créer la base de données** (en tant que superuser PostgreSQL) :
   ```sql
   CREATE DATABASE automivy;
   ```

2. **Exécuter le script d'initialisation** :
   ```bash
   npm run init-db
   ```

3. **Vérifier l'initialisation** :
   - Utilisateur admin créé : `admin@automivy.com` / `admin123`
   - Toutes les tables créées avec RLS
   - Index et triggers configurés

## Utilisation

### Démarrage du projet

```bash
# Installer les dépendances
npm install

# Initialiser la base de données
npm run init-db

# Démarrer le serveur de développement
npm run dev
```

### Authentification

Le système d'authentification utilise maintenant JWT au lieu de Supabase Auth :

- **Inscription** : `authService.signup(email, password, role)`
- **Connexion** : `authService.login(email, password)`
- **Déconnexion** : `authService.logout()`
- **Vérification** : `authService.getCurrentUser(token)`

### Sécurité

- **RLS activé** sur toutes les tables
- **Politiques de sécurité** configurées pour chaque table
- **JWT** pour l'authentification
- **Bcrypt** pour le hachage des mots de passe

## Différences avec Supabase

### Avantages

- **Contrôle total** sur la base de données
- **Pas de dépendance** à un service externe
- **Coûts réduits** (hébergement VPS)
- **Performance** optimisée pour vos besoins

### Changements nécessaires

- **Authentification** : JWT au lieu de Supabase Auth
- **Requêtes** : SQL direct au lieu de l'API Supabase
- **RLS** : Politiques PostgreSQL au lieu de Supabase RLS
- **Gestion des erreurs** : Gestion manuelle des erreurs de base de données

## Dépannage

### Problèmes de connexion

1. **Vérifier les variables d'environnement**
2. **Tester la connexion PostgreSQL** :
   ```bash
   psql -h 147.93.58.155 -p 5432 -U fethi -d automivy
   ```

### Problèmes d'authentification

1. **Vérifier le JWT_SECRET**
2. **Vérifier les tokens** dans le localStorage
3. **Vérifier les logs** de la console

### Problèmes de RLS

1. **Vérifier les politiques** dans PostgreSQL
2. **Vérifier le contexte utilisateur** : `app.current_user_id`
3. **Tester les requêtes** directement en base

## Support

Pour toute question ou problème :

1. **Vérifier les logs** de la console
2. **Tester la connexion** à la base de données
3. **Vérifier les variables** d'environnement
4. **Consulter la documentation** PostgreSQL
