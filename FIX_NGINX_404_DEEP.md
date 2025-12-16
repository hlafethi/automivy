# 🔧 Correction approfondie : 404 Nginx sur /uploads

## 🚨 Problème

Le 404 vient directement de Nginx (`nginx/1.29.3`), pas du backend. La requête n'atteint jamais le backend.

## 🔍 Diagnostic complet

### Étape 1 : Voir la configuration complète

```bash
# Voir toute la configuration du proxy host
docker exec npm cat /data/nginx/proxy_host/30.conf
```

### Étape 2 : Vérifier l'ordre exact des locations

```bash
# Extraire uniquement les locations dans l'ordre
docker exec npm cat /data/nginx/proxy_host/30.conf | grep -n "location" | head -10
```

**L'ordre DOIT être :**
1. `location /api {`
2. `location /uploads {`
3. `location / {`

### Étape 3 : Vérifier la syntaxe exacte

```bash
# Tester la syntaxe
docker exec npm nginx -t

# Voir les erreurs détaillées
docker exec npm nginx -t 2>&1
```

## ✅ Solution : Configuration complète à copier

Dans **Nginx Proxy Manager** > **Proxy Hosts** > **automivy.com** > **Advanced**, remplacez TOUTE la configuration par :

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
# ⚠️ CRITIQUE : Cette location doit être AVANT location /
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
# ⚠️ CRITIQUE : Cette location doit être EN DERNIER
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

## 🔧 Vérifications après modification

### 1. Vérifier la syntaxe

```bash
docker exec npm nginx -t
```

**Résultat attendu :** `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### 2. Forcer le rechargement

```bash
docker exec npm nginx -s reload
```

### 3. Vérifier que la location existe

```bash
docker exec npm cat /data/nginx/proxy_host/30.conf | grep -A 10 "location /uploads"
```

### 4. Tester

```bash
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

## ⚠️ Points critiques

1. **Pas de backticks** : Ne copiez PAS les triple backticks (```) dans la configuration
2. **Ordre strict** : `/api` puis `/uploads` puis `/` - cet ordre est CRITIQUE
3. **Pas d'espaces avant `location`** : Chaque `location` doit commencer en début de ligne
4. **Sauvegardez** : Cliquez sur "Save" dans Nginx Proxy Manager après avoir collé la configuration

## 🐛 Si ça ne fonctionne toujours pas

### Vérifier les logs d'erreur

```bash
docker exec npm tail -100 /data/logs/proxy-host-30_error.log | grep -i "uploads\|404\|error"
```

### Vérifier la résolution DNS

```bash
# Depuis npm, tester la résolution
docker exec npm nslookup automivy-backend

# Ou tester avec curl
docker exec npm curl -I http://automivy-backend:3004/uploads/media-1763447744222-285086997.png
```

### Vérifier le réseau

```bash
# Vérifier que npm peut joindre automivy-backend
docker exec npm ping -c 2 automivy-backend
```

