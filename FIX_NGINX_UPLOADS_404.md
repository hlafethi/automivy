# 🔧 Correction : 404 sur /uploads via Nginx Proxy Manager

## 🚨 Problème identifié

- ✅ Backend sert correctement : `HTTP/1.1 200 OK`
- ❌ Nginx Proxy Manager retourne : `HTTP/2 404`

**Cause :** La location `/uploads` n'est pas correctement configurée dans Nginx Proxy Manager.

## ✅ Solution

### Étape 1 : Vérifier la configuration actuelle

```bash
docker exec npm cat /data/nginx/proxy_host/30.conf | grep -A 15 "location /uploads"
```

### Étape 2 : Vérifier l'ordre des locations

```bash
docker exec npm cat /data/nginx/proxy_host/30.conf | grep -B 2 -A 2 "location"
```

**L'ordre doit être :**
1. `location /api` (en premier)
2. `location /uploads` (en deuxième)
3. `location /` (en dernier)

### Étape 3 : Corriger dans Nginx Proxy Manager

1. **Nginx Proxy Manager** > **Proxy Hosts** > **automivy.com**
2. Onglet **Advanced**
3. Vérifiez que vous avez **exactement** cette configuration (dans cet ordre) :

```
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
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Proxy vers le backend pour les fichiers uploads
location /uploads {
    proxy_pass http://automivy-backend:3004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
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
    proxy_intercept_errors off;
}
```

4. **Sauvegardez** et attendez quelques secondes que Nginx se recharge.

### Étape 4 : Vérifier la syntaxe Nginx

```bash
docker exec npm nginx -t
```

**Résultat attendu :** `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### Étape 5 : Tester à nouveau

```bash
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

**Résultat attendu :** `HTTP/2 200`

## 🔍 Diagnostic supplémentaire

Si le problème persiste :

```bash
# Voir la configuration complète
docker exec npm cat /data/nginx/proxy_host/30.conf

# Voir les logs Nginx
docker logs npm --tail 50 | grep -i "uploads\|404"

# Tester la résolution DNS depuis npm
docker exec npm ping -c 2 automivy-backend
```

## ⚠️ Points critiques

1. **L'ordre des locations est crucial** : `/api` et `/uploads` doivent être **AVANT** `/`
2. **Pas de backticks** : Ne copiez pas les triple backticks (```) dans la configuration
3. **Nom du conteneur** : Assurez-vous que `automivy-backend` est le bon nom de conteneur

