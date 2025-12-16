# 🔧 Configuration Nginx Proxy Manager pour Automivy

## 📋 Architecture

- **Frontend** : Conteneur `automivy-frontend` sur le port **80** (interne, accessible via réseau Docker)
- **Backend** : Conteneur `automivy-backend` sur le port **3004** (interne, accessible via réseau Docker)
- **Nginx Proxy Manager** : Gère le reverse proxy et SSL, se connecte aux conteneurs via le réseau Docker

⚠️ **Important** : Les conteneurs n'exposent pas de ports sur l'hôte. Nginx Proxy Manager se connecte directement via le réseau Docker en utilisant les noms de conteneurs.

## 🚀 Configuration dans Nginx Proxy Manager

### 1. Proxy Host pour le Frontend

1. Allez dans **Nginx Proxy Manager** > **Proxy Hosts** > **Add Proxy Host**

2. **Details Tab** :
   - **Domain Names** : `automivy.com` (ou votre domaine)
   - **Scheme** : `http`
   - **Forward Hostname / IP** : `automivy-frontend` (nom du conteneur - ⚠️ utilisez le nom du conteneur, pas l'IP)
   - **Forward Port** : `80` (port interne du conteneur Nginx)
   - **Cache Assets** : ✅ Activé (optionnel)
   - **Block Common Exploits** : ✅ Activé
   - **Websockets Support** : ✅ Activé (pour les futures fonctionnalités)

3. **SSL Tab** :
   - **SSL Certificate** : Choisissez un certificat Let's Encrypt
   - **Force SSL** : ✅ Activé
   - **HTTP/2 Support** : ✅ Activé
   - **HSTS Enabled** : ✅ Activé

4. **Advanced Tab** (optionnel) :
   ```nginx
   # Configuration avancée pour SPA routing
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

### 2. Proxy Host pour le Backend API

1. Allez dans **Nginx Proxy Manager** > **Proxy Hosts** > **Add Proxy Host**

2. **Details Tab** :
   - **Domain Names** : `api.automivy.com` (ou `automivy.com/api`)
   - **Scheme** : `http`
   - **Forward Hostname / IP** : `automivy-backend` (nom du conteneur - ⚠️ utilisez le nom du conteneur, pas l'IP)
   - **Forward Port** : `3004` (port interne du conteneur)
   - **Block Common Exploits** : ✅ Activé
   - **Websockets Support** : ✅ Activé

3. **SSL Tab** :
   - **SSL Certificate** : Même certificat que le frontend (wildcard ou spécifique)
   - **Force SSL** : ✅ Activé
   - **HTTP/2 Support** : ✅ Activé

4. **Advanced Tab** (si vous utilisez `/api` sur le même domaine) :
   ```nginx
   location /api {
       proxy_pass http://automivy-backend:3004;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
   }
   ```

## 🎯 Option 1 : Deux Domaines Séparés (Recommandé)

- **Frontend** : `https://automivy.com` → `automivy-frontend:80` (port interne)
- **Backend** : `https://api.automivy.com` → `automivy-backend:3004` (port interne)

**Avantages** :
- ✅ Séparation claire
- ✅ Configuration simple
- ✅ CORS plus facile à gérer

## 🎯 Option 2 : Même Domaine avec `/api`

- **Frontend** : `https://automivy.com` → `automivy-frontend:80` (port interne)
- **Backend** : `https://automivy.com/api` → `automivy-backend:3004` (port interne, via Advanced Tab)

**Avantages** :
- ✅ Un seul domaine
- ✅ Pas de problèmes CORS
- ⚠️ Configuration plus complexe

## 🔧 Configuration CORS dans le Backend

Si vous utilisez l'Option 1 (deux domaines), assurez-vous que le backend autorise le domaine frontend :

Dans Portainer, ajoutez la variable d'environnement :
```env
CORS_ORIGIN=https://automivy.com
```

## ✅ Vérification

1. **Frontend** : Accédez à `https://automivy.com` - vous devriez voir l'application React
2. **Backend** : Accédez à `https://api.automivy.com/api/health` - vous devriez voir `{"status":"ok"}`

## 🐛 Dépannage

### Le frontend ne charge pas

- Vérifiez que le conteneur `automivy-frontend` est en état `running` ou `healthy`
- ⚠️ **CRITIQUE** : Vérifiez que Nginx Proxy Manager et `automivy-frontend` sont sur le même réseau Docker
  - Dans Portainer, allez dans **Networks** > cliquez sur le réseau de `automivy-frontend` (probablement `default` ou `bridge`)
  - Vérifiez que le conteneur `npm` (Nginx Proxy Manager) est dans la liste des conteneurs connectés
  - Si non, connectez `npm` au même réseau : `docker network connect <network-name> npm`
- Vérifiez que vous utilisez le nom du conteneur (`automivy-frontend`) et le port **80** (pas 3005) dans Nginx Proxy Manager
- Vérifiez les logs du conteneur : `docker logs automivy-frontend`

### Le backend ne répond pas

- Vérifiez que le conteneur `automivy-backend` est en état `healthy`
- ⚠️ **CRITIQUE** : Vérifiez que Nginx Proxy Manager et `automivy-backend` sont sur le même réseau Docker
  - Dans Portainer, allez dans **Networks** > cliquez sur le réseau de `automivy-backend` (probablement `default` ou `bridge`)
  - Vérifiez que le conteneur `npm` (Nginx Proxy Manager) est dans la liste des conteneurs connectés
  - Si non, connectez `npm` au même réseau : `docker network connect <network-name> npm`
- Vérifiez que vous utilisez le nom du conteneur (`automivy-backend`) et le port **3004** dans Nginx Proxy Manager
- Vérifiez les logs du conteneur : `docker logs automivy-backend`

### Erreurs CORS

- Assurez-vous que `CORS_ORIGIN` dans le backend correspond au domaine frontend
- Vérifiez que les headers CORS sont correctement configurés dans Nginx Proxy Manager

---

*Guide créé le 2025-08-07*

