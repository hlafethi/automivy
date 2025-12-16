# ⚡ Démarrage Rapide - Portainer.io + GitHub

## 🎯 Étapes Rapides

### 1. Préparer GitHub

✅ Vérifiez que ces fichiers sont dans votre repository :
- `docker-compose.portainer.yml`
- `Dockerfile.backend`
- `Dockerfile.frontend`
- `nginx.conf`
- `.dockerignore`

### 2. Configurer Portainer

1. **Portainer** > **Stacks** > **Add Stack**
2. **Name** : `automivy`
3. **Build method** : `Repository`
4. **Repository URL** : 
   - **Si repository public** : `https://github.com/hlafethi/automivy.git`
   - **Si repository privé** : `https://TOKEN@github.com/hlafethi/automivy.git` (remplacez TOKEN par votre Personal Access Token GitHub)
5. **Repository reference** : `refactor/code-cleanup-and-improvements` (ou votre branche)
6. **Compose path** : `docker-compose.portainer.yml`

⚠️ **Si erreur d'authentification** : Voir `PORTAINER_GITHUB_AUTH.md` pour configurer l'authentification GitHub

### 3. Variables d'Environnement dans Portainer

Ajoutez ces variables (remplissez avec vos vraies valeurs) :

```env
# Base de données (externe sur VPS)
DB_HOST=147.93.58.155
DB_PORT=5432
DB_NAME=automivy
DB_USER=fethi
DB_PASSWORD=VotreMotDePasse

# JWT
JWT_SECRET=VotreSecretJWT

# n8n
N8N_URL=https://n8n.globalsaas.eu
N8N_API_KEY=VotreCleAPI

# NocoDB
NOCODB_BASE_URL=https://nocodb.globalsaas.eu
NOCODB_API_TOKEN=VotreToken
NOCODB_BASE_ID=VotreBaseID

# OpenRouter
OPENROUTER_API_KEY=VotreCleAPI

# SMTP
SMTP_HOST=mail.heleam.com
SMTP_PORT=587
SMTP_USER=admin@heleam.com
SMTP_PASSWORD=VotreMotDePasse
FROM_EMAIL=admin@heleam.com

# OAuth
GOOGLE_CLIENT_ID=VotreClientID
GOOGLE_CLIENT_SECRET=VotreSecret
MICROSOFT_CLIENT_ID=VotreClientID
MICROSOFT_CLIENT_SECRET=VotreSecret

# URLs
FRONTEND_URL=https://automivy.com
BACKEND_URL=https://automivy.com
CORS_ORIGIN=https://automivy.com
```

### 4. Déployer

Cliquez sur **Deploy the stack** et attendez que les conteneurs démarrent.

### 5. Configurer Nginx Proxy Manager

1. **Nginx Proxy Manager** > **Proxy Hosts** > **Add Proxy Host**
2. **Domain** : `automivy.com`
3. **Forward to** : `automivy-frontend:80`
4. **SSL** : Activer avec Let's Encrypt

## ✅ Vérification

```bash
# Test backend
curl http://localhost:3004/api/health

# Test frontend
curl http://localhost:80/health

# Test via domaine
curl https://automivy.com/api/health
```

## 🔄 Mise à Jour

Dans Portainer : **Stacks** > `automivy` > **Pull and redeploy**

---

📚 **Documentation complète** : Voir `PORTAINER_DEPLOYMENT.md`

