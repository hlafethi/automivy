# 🔧 Configuration Nginx Proxy Manager - Un Seul Domaine

## 📋 Situation

Vous n'avez qu'un seul host pour le nom de domaine `automivy.com`. Il faut donc configurer :
- **Frontend** : `https://automivy.com` → conteneur `automivy-frontend:80`
- **Backend API** : `https://automivy.com/api` → conteneur `automivy-backend:3004`

## 🚀 Configuration dans Nginx Proxy Manager

### Étape 1 : Créer le Proxy Host Principal

1. Allez dans **Nginx Proxy Manager** > **Proxy Hosts** > **Add Proxy Host**

2. **Details Tab** :
   - **Domain Names** : `automivy.com`, `www.automivy.com` (si vous avez www)
   - **Scheme** : `http`
   - **Forward Hostname / IP** : `automivy-frontend` (nom du conteneur)
   - **Forward Port** : `80` (port interne du conteneur Nginx)
   - **Cache Assets** : ✅ Activé (optionnel)
   - **Block Common Exploits** : ✅ Activé
   - **Websockets Support** : ✅ Activé

3. **SSL Tab** :
   - **SSL Certificate** : Choisissez un certificat Let's Encrypt
   - **Force SSL** : ✅ Activé
   - **HTTP/2 Support** : ✅ Activé
   - **HSTS Enabled** : ✅ Activé

4. **Advanced Tab** (⚠️ CRITIQUE - Configuration complète) :

```nginx
# Proxy vers le backend pour les routes /api
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
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Frontend - SPA routing (toutes les autres routes vers index.html)
location / {
    proxy_pass http://automivy-frontend:80;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Important pour le SPA routing
    proxy_intercept_errors off;
}
```

5. Cliquez sur **Save**

## ⚠️ Points Importants

### Ordre des Locations

L'ordre est **CRITIQUE** dans Nginx. La location `/api` doit être **AVANT** la location `/` pour que les requêtes `/api` soient correctement routées vers le backend.

### Configuration CORS dans le Backend

Puisque le frontend et le backend utilisent le même domaine, vous n'avez **pas besoin** de configurer CORS de manière complexe. Le backend doit accepter les requêtes depuis `https://automivy.com`.

Dans Portainer, configurez :
```env
CORS_ORIGIN=https://automivy.com
FRONTEND_URL=https://automivy.com
BACKEND_URL=https://automivy.com
```

### Vérification

1. **Frontend** : Accédez à `https://automivy.com` - vous devriez voir l'application React
2. **Backend** : Accédez à `https://automivy.com/api/health` - vous devriez voir `{"status":"ok"}`

## 🐛 Dépannage

### Le frontend charge mais les appels API échouent

- Vérifiez que la location `/api` est **avant** la location `/` dans l'onglet Advanced
- Vérifiez que `proxy_pass` pointe vers `http://automivy-backend:3004` (pas `http://automivy-backend:3004/api`)
- Vérifiez que Nginx Proxy Manager et les conteneurs sont sur le même réseau Docker

### Erreur 502 Bad Gateway

- Vérifiez que les conteneurs `automivy-frontend` et `automivy-backend` sont en état `running` ou `healthy`
- Vérifiez que Nginx Proxy Manager peut résoudre les noms de conteneurs (même réseau Docker)
- Vérifiez les logs : `docker logs automivy-backend` et `docker logs automivy-frontend`

### Les routes du frontend ne fonctionnent pas (404)

- Assurez-vous que le frontend a bien la configuration SPA routing dans `nginx.conf`
- Vérifiez que `proxy_intercept_errors off;` est présent dans la location `/`

## 📝 Configuration Alternative (Si la première ne fonctionne pas)

Si la configuration ci-dessus ne fonctionne pas, vous pouvez essayer cette version alternative dans l'onglet Advanced :

```nginx
# Backend API - doit être en premier
location /api/ {
    proxy_pass http://automivy-backend:3004/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
}

# Frontend - toutes les autres routes
location / {
    proxy_pass http://automivy-frontend:80;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
}
```

Note : Dans cette version, `proxy_pass http://automivy-backend:3004/;` a un `/` à la fin, ce qui supprime le préfixe `/api` de l'URL avant de la transmettre au backend.

---

*Guide créé le 2025-08-07*

