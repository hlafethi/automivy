# 🔧 Correction : Les uploads sont routés vers le frontend au lieu du backend

## 🚨 Problème identifié

Les logs montrent :
```
[Sent-to automivy-frontend]
```

Les requêtes `/uploads` sont envoyées au **frontend** au lieu du **backend** !

## ✅ Solution : Utiliser une location plus spécifique

Le problème est que `location /` capture tout. Il faut utiliser une location avec un préfixe plus spécifique ou un modifier.

### Solution 1 : Utiliser `^~` pour forcer la priorité

Dans **Nginx Proxy Manager** > **Proxy Hosts** > **automivy.com** > **Advanced**, modifiez la location `/uploads` :

```
location ^~ /uploads {
    proxy_pass http://automivy-backend:3004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
}
```

Le `^~` force Nginx à utiliser cette location sans vérifier les autres locations regex.

### Solution 2 : Vérifier l'ordre dans la configuration générée

```bash
# Vérifier que la location /uploads est bien avant location /
docker exec npm cat /data/nginx/proxy_host/30.conf | grep -n "location" | head -5
```

L'ordre doit être :
1. `location /api`
2. `location /uploads` (ou `location ^~ /uploads`)
3. `location /`

### Solution 3 : Configuration complète avec `^~`

Remplacez TOUTE la configuration Advanced par :

```
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

location ^~ /uploads {
    proxy_pass http://automivy-backend:3004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
}

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

## 🧪 Test après modification

```bash
# Vérifier la configuration
docker exec npm nginx -t

# Forcer le rechargement
docker exec npm nginx -s reload

# Tester
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png

# Vérifier les logs
docker exec npm tail -5 /data/logs/proxy-host-30_access.log | grep uploads
```

Les logs devraient maintenant montrer `[Sent-to automivy-backend]` au lieu de `[Sent-to automivy-frontend]`.

