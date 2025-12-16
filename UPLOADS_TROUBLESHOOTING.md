# 🔧 Dépannage des Uploads - Erreurs 404

## 🚨 Problème
Les images `/uploads/` retournent des erreurs 404 (Not Found).

## ✅ Vérifications à effectuer

### 1. Vérifier que la configuration Nginx Proxy Manager inclut `/uploads`

**Dans Nginx Proxy Manager :**
1. Allez dans **Proxy Hosts** > éditez `automivy.com`
2. Onglet **Advanced**
3. Vérifiez que vous avez **3 locations** dans cet ordre :

```
location /api {
    proxy_pass http://automivy-backend:3004;
    ...
}

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

location / {
    proxy_pass http://automivy-frontend:80;
    ...
}
```

⚠️ **IMPORTANT** : L'ordre est critique ! `/api` et `/uploads` doivent être **AVANT** `/`.

### 2. Vérifier que les fichiers existent dans le conteneur backend

**Sur le VPS, exécutez :**

```bash
# Vérifier que le conteneur backend est en cours d'exécution
docker ps | grep automivy-backend

# Entrer dans le conteneur
docker exec -it automivy-backend sh

# Vérifier que le répertoire existe
ls -la /app/public/uploads/

# Vérifier si les fichiers existent
ls -la /app/public/uploads/ | grep media-1763447744222
```

### 3. Vérifier le volume Docker

**Sur le VPS, exécutez :**

```bash
# Lister les volumes
docker volume ls | grep automivy_uploads

# Inspecter le volume
docker volume inspect automivy_uploads

# Vérifier les fichiers dans le volume (si accessible)
docker run --rm -v automivy_uploads:/data alpine ls -la /data
```

### 4. Tester directement le backend

**Sur le VPS, exécutez :**

```bash
# Tester si le backend sert les fichiers
docker exec automivy-backend curl -I http://localhost:3004/uploads/media-1763447744222-285086997.png

# Ou depuis l'extérieur du conteneur (si vous avez accès au réseau)
curl -I http://automivy-backend:3004/uploads/media-1763447744222-285086997.png
```

### 5. Vérifier les logs du backend

**Sur le VPS, exécutez :**

```bash
# Voir les logs du backend
docker logs automivy-backend --tail 50

# Filtrer les erreurs
docker logs automivy-backend 2>&1 | grep -i "upload\|404\|error"
```

### 6. Vérifier la configuration Nginx Proxy Manager

**Sur le VPS, exécutez :**

```bash
# Vérifier la configuration Nginx générée
docker exec npm cat /data/nginx/proxy_host/30.conf | grep -A 10 "location /uploads"

# Tester la configuration Nginx
docker exec npm nginx -t
```

## 🔧 Solutions possibles

### Solution 1 : Ajouter la location `/uploads` dans Nginx Proxy Manager

Si la location `/uploads` n'existe pas :

1. **Nginx Proxy Manager** > **Proxy Hosts** > **automivy.com** > **Advanced**
2. Ajoutez la location `/uploads` **entre** `/api` et `/` :

```
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
```

3. **Sauvegardez** et attendez quelques secondes que Nginx se recharge.

### Solution 2 : Vérifier que les fichiers existent

Si les fichiers n'existent pas dans le conteneur :

1. Les fichiers ont peut-être été uploadés **avant** le déploiement Docker
2. Il faut les copier dans le volume Docker :

```bash
# Si vous avez les fichiers localement
docker cp /chemin/local/uploads/. automivy-backend:/app/public/uploads/

# Ou monter temporairement un répertoire local
docker run --rm -v automivy_uploads:/data -v /chemin/local/uploads:/source alpine cp -r /source/. /data/
```

### Solution 3 : Vérifier les permissions

Si les fichiers existent mais ne sont pas accessibles :

```bash
# Dans le conteneur backend
docker exec -it automivy-backend sh
chmod -R 755 /app/public/uploads
chown -R node:node /app/public/uploads
```

### Solution 4 : Redémarrer les conteneurs

Parfois, un redémarrage résout les problèmes de réseau :

```bash
# Dans Portainer, redémarrez la stack automivy
# Ou via la ligne de commande :
docker restart automivy-backend automivy-frontend npm
```

## 🧪 Test rapide

**Testez directement depuis votre navigateur :**

```
https://automivy.com/api/health
```

Si cela fonctionne, le backend est accessible. Ensuite testez :

```
https://automivy.com/uploads/media-1763447744222-285086997.png
```

Si cela retourne 404, c'est que :
- Soit la location `/uploads` n'est pas configurée dans Nginx Proxy Manager
- Soit les fichiers n'existent pas dans le conteneur backend

## 📝 Notes importantes

- **L'ordre des locations est critique** : `/api` et `/uploads` doivent être **avant** `/`
- Les fichiers sont stockés dans le volume Docker `automivy_uploads`
- Le backend sert les fichiers depuis `/app/public/uploads` (monté sur le volume)
- Nginx Proxy Manager doit proxifier `/uploads` vers `http://automivy-backend:3004`

