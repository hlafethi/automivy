# 🚀 Guide de Déploiement Automivy avec Portainer.io et GitHub

## 📋 Prérequis

- VPS avec Docker et Portainer.io installés
- Compte GitHub avec le repository de l'application
- Base de données PostgreSQL déjà configurée sur le VPS (147.93.58.155)
- Nginx Proxy Manager configuré
- Domaine `automivy.com` pointant vers votre VPS

## 🔧 Étape 1 : Préparer le Repository GitHub

### 1.1. Créer un fichier `.env.example` dans le repository

Créez un fichier `.env.example` à la racine du repository avec toutes les variables nécessaires (sans les valeurs sensibles) :

```env
# Base de Données PostgreSQL (externe sur le VPS)
DB_HOST=147.93.58.155
DB_PORT=5432
DB_NAME=automivy
DB_USER=fethi
DB_PASSWORD=
DB_SSL=false

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=24h

# n8n
N8N_URL=https://n8n.globalsaas.eu
N8N_API_KEY=

# NocoDB
NOCODB_BASE_URL=https://nocodb.globalsaas.eu
NOCODB_API_TOKEN=
NOCODB_BASE_ID=

# OpenRouter
OPENROUTER_API_KEY=

# SMTP
SMTP_HOST=mail.heleam.com
SMTP_PORT=587
SMTP_USER=admin@heleam.com
SMTP_PASSWORD=
FROM_EMAIL=admin@heleam.com

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# URLs
FRONTEND_URL=https://automivy.com
BACKEND_URL=https://automivy.com
CORS_ORIGIN=https://automivy.com
```

### 1.2. S'assurer que tous les fichiers Docker sont dans le repository

Vérifiez que ces fichiers sont présents dans votre repository GitHub :
- `docker-compose.portainer.yml` (ou `docker-compose.yml`)
- `Dockerfile.backend`
- `Dockerfile.frontend`
- `nginx.conf`
- `.dockerignore`

## 🔧 Étape 2 : Configurer Portainer.io

### 2.1. Créer une Stack dans Portainer

1. **Connectez-vous à Portainer**
   - Accédez à l'interface Portainer (généralement `http://votre-vps-ip:9000`)

2. **Allez dans Stacks**
   - Cliquez sur **Stacks** dans le menu de gauche
   - Cliquez sur **Add Stack**

3. **Configurer la Stack**
   - **Name** : `automivy`
   - **Build method** : Sélectionnez **Repository**
   - **Repository URL** : `https://github.com/votre-username/votre-repo.git`
   - **Repository reference** : `main` (ou `master` selon votre branche)
   - **Compose path** : `docker-compose.portainer.yml` (ou `docker-compose.yml`)

4. **Configurer les variables d'environnement**
   - Cliquez sur **Environment variables**
   - Ajoutez toutes les variables nécessaires (voir section ci-dessous)

### 2.2. Variables d'environnement à configurer dans Portainer

Dans la section **Environment variables** de Portainer, ajoutez :

```env
# Base de Données PostgreSQL (externe)
DB_HOST=147.93.58.155
DB_PORT=5432
DB_NAME=automivy
DB_USER=fethi
DB_PASSWORD=VotreMotDePasseSecurise
DB_SSL=false

# JWT
JWT_SECRET=VotreSecretJWTTresSecuriseChangezMoi
JWT_EXPIRES_IN=24h

# n8n
N8N_URL=https://n8n.globalsaas.eu
N8N_API_KEY=VotreCleAPIn8n

# NocoDB
NOCODB_BASE_URL=https://nocodb.globalsaas.eu
NOCODB_API_TOKEN=VotreTokenAPINocoDB
NOCODB_BASE_ID=VotreBaseIDNocoDB

# OpenRouter
OPENROUTER_API_KEY=VotreCleAPIOpenRouter

# SMTP
SMTP_HOST=mail.heleam.com
SMTP_PORT=587
SMTP_USER=admin@heleam.com
SMTP_PASSWORD=VotreMotDePasseSMTP
FROM_EMAIL=admin@heleam.com

# OAuth Google
GOOGLE_CLIENT_ID=VotreGoogleClientID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=VotreGoogleClientSecret

# OAuth Microsoft
MICROSOFT_CLIENT_ID=VotreMicrosoftClientID
MICROSOFT_CLIENT_SECRET=VotreMicrosoftClientSecret

# URLs Application
FRONTEND_URL=https://automivy.com
BACKEND_URL=https://automivy.com
CORS_ORIGIN=https://automivy.com
```

**⚠️ IMPORTANT** : Remplissez toutes les valeurs avec vos vraies données sensibles.

### 2.3. Déployer la Stack

1. Cliquez sur **Deploy the stack**
2. Portainer va :
   - Cloner le repository GitHub
   - Construire les images Docker
   - Démarrer les conteneurs

## 🔍 Étape 3 : Vérification

### 3.1. Vérifier les conteneurs

Dans Portainer, allez dans **Containers** et vérifiez que :
- `automivy-backend` est en cours d'exécution (Status: Running)
- `automivy-frontend` est en cours d'exécution (Status: Running)

### 3.2. Vérifier les logs

1. Cliquez sur la stack `automivy`
2. Cliquez sur **Logs** pour voir les logs en temps réel
3. Vérifiez qu'il n'y a pas d'erreurs

### 3.3. Tester l'application

```bash
# Test du backend (depuis le VPS)
curl http://localhost:3004/api/health

# Test du frontend (depuis le VPS)
curl http://localhost:80/health

# Test via le domaine
curl https://automivy.com/api/health
```

## 🔧 Étape 4 : Configurer Nginx Proxy Manager

### 4.1. Créer un Proxy Host

1. **Connectez-vous à Nginx Proxy Manager**
   - Accédez à l'interface (généralement `http://votre-vps-ip:81`)

2. **Créer un nouveau Proxy Host**
   - Cliquez sur **Proxy Hosts** > **Add Proxy Host**

3. **Configurer le Proxy Host**
   - **Domain Names** : `automivy.com`, `www.automivy.com`
   - **Scheme** : `http`
   - **Forward Hostname/IP** : `automivy-frontend` (nom du conteneur Docker)
   - **Forward Port** : `80`
   - **Cache Assets** : Activé (optionnel)
   - **Block Common Exploits** : Activé
   - **Websockets Support** : Activé

4. **Configurer SSL**
   - Allez dans l'onglet **SSL**
   - **SSL Certificate** : Sélectionnez **Request a new SSL Certificate**
   - **Force SSL** : Activé
   - **HTTP/2 Support** : Activé
   - **HSTS Enabled** : Activé
   - Cliquez sur **Save**

## 🔄 Mise à Jour de l'Application

### Option 1 : Via Portainer (Re-déployer)

1. Allez dans **Stacks** > `automivy`
2. Cliquez sur **Editor**
3. Cliquez sur **Pull and redeploy**
4. Portainer va :
   - Récupérer les dernières modifications depuis GitHub
   - Reconstruire les images
   - Redémarrer les conteneurs

### Option 2 : Via Git Webhook (Automatique)

Pour automatiser les mises à jour, vous pouvez configurer un webhook GitHub :

1. **Dans GitHub** :
   - Allez dans **Settings** > **Webhooks** de votre repository
   - Ajoutez un nouveau webhook
   - **Payload URL** : `http://votre-vps-ip:9000/api/webhooks/pull`
   - **Content type** : `application/json`
   - **Events** : Sélectionnez **Just the push event**

2. **Dans Portainer** :
   - Allez dans **Stacks** > `automivy`
   - Activez **Automatic updates** (si disponible)

## 🐛 Troubleshooting

### Problème : Les conteneurs ne démarrent pas

1. **Vérifier les logs dans Portainer**
   - Allez dans **Containers** > Sélectionnez le conteneur > **Logs**
   - Cherchez les erreurs

2. **Vérifier les variables d'environnement**
   - Allez dans **Stacks** > `automivy` > **Editor**
   - Vérifiez que toutes les variables sont correctement définies

3. **Vérifier la connexion à la base de données**
   - Testez la connexion depuis le VPS :
   ```bash
   psql -h 147.93.58.155 -U fethi -d automivy
   ```

### Problème : Erreur de build

1. **Vérifier que tous les fichiers Docker sont dans GitHub**
   - `Dockerfile.backend`
   - `Dockerfile.frontend`
   - `docker-compose.portainer.yml`
   - `nginx.conf`

2. **Vérifier les logs de build dans Portainer**
   - Allez dans **Stacks** > `automivy` > **Logs**
   - Cherchez les erreurs de build

### Problème : Le frontend ne charge pas

1. **Vérifier Nginx Proxy Manager**
   - Vérifiez que le proxy host est correctement configuré
   - Vérifiez que le Forward Hostname/IP est `automivy-frontend`

2. **Vérifier les logs du frontend**
   - Dans Portainer, allez dans **Containers** > `automivy-frontend` > **Logs**

### Problème : Erreur 502 Bad Gateway

1. **Vérifier que le backend est démarré**
   - Dans Portainer, vérifiez que `automivy-backend` est en cours d'exécution

2. **Vérifier la configuration Nginx**
   - Vérifiez que `nginx.conf` est correctement configuré
   - Vérifiez que le proxy vers `backend:3004` est correct

## 📊 Monitoring

### Logs

Les logs sont accessibles via Portainer :
- **Stack logs** : Allez dans **Stacks** > `automivy` > **Logs**
- **Container logs** : Allez dans **Containers** > Sélectionnez le conteneur > **Logs**

### Health Checks

Les conteneurs ont des health checks configurés :
- Backend : `http://localhost:3004/api/health`
- Frontend : `http://localhost:80/health`

Vous pouvez vérifier le statut dans Portainer > **Containers** > Voir la colonne **Status**.

## 🔐 Sécurité

### 1. Variables d'environnement sensibles

⚠️ **IMPORTANT** : Ne commitez JAMAIS le fichier `.env` dans GitHub. Utilisez uniquement `.env.example` avec des valeurs vides.

### 2. Accès à la base de données

La base de données PostgreSQL est externe (147.93.58.155). Assurez-vous que :
- Le firewall autorise les connexions depuis les conteneurs Docker
- Les credentials sont sécurisés
- Le mot de passe est fort

### 3. SSL/TLS

Configurez SSL via Nginx Proxy Manager avec Let's Encrypt pour `automivy.com`.

## 📝 Notes Importantes

### Volumes Docker

Les volumes suivants sont créés automatiquement :
- `automivy_uploads` : Fichiers uploadés (persistants)
- `automivy_logs` : Logs de l'application (persistants)

### Réseau Docker

Tous les conteneurs sont sur le réseau `automivy-network` et peuvent communiquer entre eux via leurs noms de conteneurs.

### Base de données externe

La base de données PostgreSQL est sur le VPS (147.93.58.155). Le backend y accède directement via l'IP du VPS. Assurez-vous que :
- PostgreSQL accepte les connexions depuis Docker
- Le firewall est configuré correctement
- Les credentials sont corrects

## 🔄 Redémarrage

Pour redémarrer les services :

1. **Via Portainer** :
   - Allez dans **Stacks** > `automivy`
   - Cliquez sur **Restart**

2. **Via ligne de commande** :
   ```bash
   docker restart automivy-backend automivy-frontend
   ```

## 🛑 Arrêt

Pour arrêter les services :

1. **Via Portainer** :
   - Allez dans **Stacks** > `automivy`
   - Cliquez sur **Stop**

2. **Via ligne de commande** :
   ```bash
   docker stop automivy-backend automivy-frontend
   ```

---

*Guide créé le 2025-08-07*

