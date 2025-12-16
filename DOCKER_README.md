# 🐳 Docker - Déploiement Automivy

## 📁 Fichiers créés

- `docker-compose.yml` : Configuration complète de la stack Docker
- `Dockerfile.backend` : Image Docker pour le backend Node.js
- `Dockerfile.frontend` : Image Docker pour le frontend React (avec Nginx)
- `nginx.conf` : Configuration Nginx pour servir le frontend
- `env.production.example` : Exemple de fichier d'environnement
- `.dockerignore` : Fichiers à exclure du build Docker
- `DEPLOYMENT_GUIDE.md` : Guide complet de déploiement

## 🚀 Démarrage rapide

### 1. Configurer l'environnement

```bash
cp env.production.example .env
nano .env  # Remplir toutes les variables
```

### 2. Démarrer les services

```bash
docker-compose up -d --build
```

### 3. Vérifier les logs

```bash
docker-compose logs -f
```

## 📋 Services inclus

- **backend** : API Node.js (port 3004 interne)
- **frontend** : Application React servie par Nginx (port 80 interne)
- **postgres** : Base de données PostgreSQL (port 5432, optionnel si DB externe)

## 🔧 Configuration Nginx Proxy Manager

Dans Nginx Proxy Manager, créez un proxy host :
- **Domain** : `automivy.com`
- **Forward to** : `automivy-frontend:80`
- **SSL** : Activer avec Let's Encrypt

## ⚠️ Notes importantes

1. **Base de données** : Si vous utilisez une DB externe (147.93.58.155), configurez `DB_HOST` dans `.env` et commentez la section `postgres` dans `docker-compose.yml`

2. **Variables d'environnement** : Toutes les variables dans `env.production.example` doivent être remplies

3. **Volumes** : Les données sont persistantes dans les volumes Docker

4. **Logs** : Accessibles via `docker-compose logs` ou Portainer

## 📚 Documentation complète

Voir `DEPLOYMENT_GUIDE.md` pour le guide complet de déploiement.

