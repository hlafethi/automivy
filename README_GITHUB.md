# 🚀 Automivy - Plateforme SaaS d'Automatisation

Plateforme SaaS d'automatisation de workflows qui simplifie l'utilisation de n8n pour les utilisateurs finaux.

## 📋 Prérequis pour le Déploiement

- Docker et Docker Compose
- Portainer.io (recommandé)
- Base de données PostgreSQL (externe ou dans Docker)
- Nginx Proxy Manager
- Domaine configuré

## 🐳 Déploiement avec Portainer.io

### 1. Préparer le Repository

Assurez-vous que tous les fichiers suivants sont présents :
- `docker-compose.portainer.yml` : Configuration Docker Compose pour Portainer
- `Dockerfile.backend` : Image Docker pour le backend
- `Dockerfile.frontend` : Image Docker pour le frontend
- `nginx.conf` : Configuration Nginx
- `.dockerignore` : Fichiers à exclure du build

### 2. Configurer Portainer

1. **Créer une Stack dans Portainer**
   - Allez dans **Stacks** > **Add Stack**
   - **Name** : `automivy`
   - **Build method** : **Repository**
   - **Repository URL** : URL de ce repository GitHub
   - **Repository reference** : `main` (ou votre branche)
   - **Compose path** : `docker-compose.portainer.yml`

2. **Configurer les variables d'environnement**
   - Ajoutez toutes les variables nécessaires (voir `env.production.example`)
   - ⚠️ **IMPORTANT** : Remplissez toutes les valeurs sensibles

3. **Déployer**
   - Cliquez sur **Deploy the stack**

### 3. Configuration Nginx Proxy Manager

Créez un proxy host :
- **Domain** : `automivy.com`
- **Forward to** : `automivy-frontend:80`
- **SSL** : Activer avec Let's Encrypt

## 📚 Documentation

- **Guide complet Portainer** : Voir `PORTAINER_DEPLOYMENT.md`
- **Guide déploiement général** : Voir `DEPLOYMENT_GUIDE.md`
- **Architecture** : Voir `REFERENCE_ARCHITECTURE.md`

## 🔐 Variables d'Environnement Requises

Toutes les variables sont documentées dans `env.production.example`. Les principales :

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `N8N_URL`, `N8N_API_KEY`
- `NOCODB_BASE_URL`, `NOCODB_API_TOKEN`, `NOCODB_BASE_ID`
- `OPENROUTER_API_KEY`
- `SMTP_*` (configuration email)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
- `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGIN`

## 🏗️ Architecture

- **Backend** : Node.js + Express (port 3004)
- **Frontend** : React + TypeScript + Vite (servi par Nginx)
- **Base de données** : PostgreSQL (externe ou Docker)
- **Intégrations** : n8n, NocoDB, OpenRouter

## 📝 Notes

- ⚠️ Ne commitez JAMAIS le fichier `.env` dans GitHub
- Utilisez uniquement `.env.example` avec des valeurs vides
- Les variables sensibles doivent être configurées dans Portainer

## 🔄 Mise à Jour

Pour mettre à jour l'application via Portainer :
1. Allez dans **Stacks** > `automivy`
2. Cliquez sur **Pull and redeploy**

---

Pour plus de détails, consultez `PORTAINER_DEPLOYMENT.md`

