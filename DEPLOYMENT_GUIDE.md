# 🚀 Guide de Déploiement Production Automivy

## 📋 Prérequis

- VPS avec Docker et Docker Compose installés
- Portainer.io installé (optionnel mais recommandé)
- Nginx Proxy Manager configuré
- Domaine `automivy.com` pointant vers votre VPS

## 🔧 Configuration Initiale

### 1. Préparer les fichiers sur le VPS

```bash
# Se connecter au VPS
ssh user@your-vps-ip

# Créer le répertoire de l'application
mkdir -p /opt/automivy
cd /opt/automivy

# Cloner ou copier les fichiers de l'application
# (via git, scp, ou Portainer)
```

### 2. Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp env.production.example .env

# Éditer le fichier .env avec vos valeurs
nano .env
```

**⚠️ IMPORTANT - Base de données** :
- **Option 1 - Base de données externe** : Si vous utilisez une base de données déjà existante sur le VPS (ex: 147.93.58.155), configurez `DB_HOST=147.93.58.155` dans `.env` et commentez toute la section `postgres` dans `docker-compose.yml` (lignes 94-118)
- **Option 2 - Base de données dans Docker** : Si vous voulez créer une nouvelle base de données dans Docker, laissez `DB_HOST=postgres` et gardez la section `postgres` active

**Note** : Pour accéder à une DB externe depuis Docker, utilisez l'IP du VPS (147.93.58.155) ou `host.docker.internal` si vous êtes sur Windows/Mac. Sur Linux, utilisez directement l'IP du VPS.

**⚠️ IMPORTANT** : Remplissez toutes les variables, notamment :
- `DB_PASSWORD` : Mot de passe fort pour PostgreSQL
- `JWT_SECRET` : Secret JWT unique et sécurisé
- `N8N_API_KEY` : Clé API de votre instance n8n
- `NOCODB_API_TOKEN` : Token API NocoDB
- `NOCODB_BASE_ID` : ID de la base NocoDB
- `OPENROUTER_API_KEY` : Clé API OpenRouter
- `SMTP_PASSWORD` : Mot de passe SMTP
- `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` : Credentials OAuth Google
- `MICROSOFT_CLIENT_ID` et `MICROSOFT_CLIENT_SECRET` : Credentials OAuth Microsoft

### 3. Configurer Nginx Proxy Manager

Dans Nginx Proxy Manager, créez un nouveau proxy host :

- **Domain Names** : `automivy.com`, `www.automivy.com`
- **Forward Hostname/IP** : `automivy-frontend` (nom du conteneur)
- **Forward Port** : `80`
- **SSL** : Activer SSL avec Let's Encrypt
- **Websockets Support** : Activer (pour les connexions WebSocket si nécessaire)

### 4. Déployer avec Docker Compose

#### Option A : Via Portainer.io

1. Connectez-vous à Portainer
2. Allez dans **Stacks** > **Add Stack**
3. Nommez la stack : `automivy`
4. Collez le contenu de `docker-compose.yml`
5. Ajoutez les variables d'environnement depuis le fichier `.env`
6. Cliquez sur **Deploy the stack**

#### Option B : Via ligne de commande

```bash
# Construire et démarrer les conteneurs
docker-compose up -d --build

# Vérifier les logs
docker-compose logs -f

# Vérifier le statut
docker-compose ps
```

## 🔍 Vérification

### 1. Vérifier que les conteneurs sont en cours d'exécution

```bash
docker-compose ps
```

Vous devriez voir :
- `automivy-backend` : Status `Up`
- `automivy-frontend` : Status `Up`
- `automivy-postgres` : Status `Up`

### 2. Vérifier les logs

```bash
# Logs du backend
docker-compose logs backend

# Logs du frontend
docker-compose logs frontend

# Logs de PostgreSQL
docker-compose logs postgres

# Tous les logs
docker-compose logs -f
```

### 3. Tester l'application

```bash
# Test du backend
curl http://localhost:3004/api/health

# Test du frontend
curl http://localhost:80/health

# Test via le domaine
curl https://automivy.com/api/health
```

## 🔄 Mise à Jour

### 1. Mettre à jour le code

```bash
# Arrêter les conteneurs
docker-compose down

# Mettre à jour le code (via git, scp, etc.)
git pull  # ou copier les nouveaux fichiers

# Reconstruire et redémarrer
docker-compose up -d --build
```

### 2. Mettre à jour uniquement le backend

```bash
docker-compose up -d --build backend
```

### 3. Mettre à jour uniquement le frontend

```bash
docker-compose up -d --build frontend
```

## 🗄️ Base de Données

### Initialisation de la base de données

La base de données est initialisée automatiquement au premier démarrage via le script `database/schema.sql`.

### Sauvegarde de la base de données

```bash
# Créer une sauvegarde
docker-compose exec postgres pg_dump -U fethi automivy > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer une sauvegarde
docker-compose exec -T postgres psql -U fethi automivy < backup_20250101_120000.sql
```

### Accès à la base de données

```bash
# Se connecter à PostgreSQL
docker-compose exec postgres psql -U fethi -d automivy
```

## 🔐 Sécurité

### 1. Changer les mots de passe par défaut

⚠️ **IMPORTANT** : Changez tous les mots de passe par défaut dans le fichier `.env`.

### 2. Configurer le firewall

```bash
# Autoriser uniquement les ports nécessaires
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp  # SSH
ufw enable
```

### 3. SSL/TLS

Configurez SSL via Nginx Proxy Manager avec Let's Encrypt pour `automivy.com`.

## 📊 Monitoring

### Logs

Les logs sont disponibles via :
- `docker-compose logs -f` : Tous les logs
- Portainer : Interface graphique pour les logs
- Fichiers dans `/opt/automivy/logs` (si montés)

### Health Checks

Les conteneurs ont des health checks configurés :
- Backend : `http://localhost:3004/api/health`
- Frontend : `http://localhost:80/health`
- PostgreSQL : `pg_isready`

## 🐛 Troubleshooting

### Problème : Les conteneurs ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier les variables d'environnement
docker-compose config
```

### Problème : Erreur de connexion à la base de données

1. Vérifier que PostgreSQL est démarré : `docker-compose ps postgres`
2. Vérifier les variables `DB_*` dans `.env`
3. Vérifier les logs : `docker-compose logs postgres`

### Problème : Le frontend ne charge pas

1. Vérifier que le build a réussi : `docker-compose logs frontend`
2. Vérifier la configuration Nginx Proxy Manager
3. Vérifier les variables `FRONTEND_URL` et `BACKEND_URL` dans `.env`

### Problème : Erreur 502 Bad Gateway

1. Vérifier que le backend est démarré : `docker-compose ps backend`
2. Vérifier les logs du backend : `docker-compose logs backend`
3. Vérifier la configuration Nginx Proxy Manager (Forward Hostname/IP)

## 📝 Notes Importantes

### Volumes

Les volumes suivants sont créés :
- `postgres_data` : Données PostgreSQL (persistantes)
- `./backend/public/uploads` : Fichiers uploadés (bind mount)
- `./logs` : Logs de l'application (bind mount)

### Réseau

Tous les conteneurs sont sur le réseau `automivy-network` et peuvent communiquer entre eux via leurs noms de conteneurs.

### Ports

- **Backend** : Port 3004 (interne uniquement, non exposé)
- **Frontend** : Port 80 (interne uniquement, accessible via Nginx Proxy Manager)
- **PostgreSQL** : Port 5432 (exposé optionnellement, désactiver en production si non nécessaire)

## 🔄 Redémarrage

```bash
# Redémarrer tous les services
docker-compose restart

# Redémarrer un service spécifique
docker-compose restart backend
docker-compose restart frontend
docker-compose restart postgres
```

## 🛑 Arrêt

```bash
# Arrêter les conteneurs (sans supprimer)
docker-compose stop

# Arrêter et supprimer les conteneurs (garder les volumes)
docker-compose down

# Arrêter et supprimer tout (y compris les volumes) ⚠️ DANGEREUX
docker-compose down -v
```

---

*Guide créé le 2025-08-07*

