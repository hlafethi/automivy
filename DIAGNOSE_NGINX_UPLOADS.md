# 🔍 Diagnostic : 404 sur /uploads malgré configuration correcte

## ✅ Configuration vérifiée

- ✅ `location /uploads` existe
- ✅ `location /api` existe  
- ✅ `location /` existe
- ✅ Ordre correct : `/api`, `/uploads`, `/`

## 🔍 Diagnostics à effectuer

### Test 1 : Vérifier la connectivité réseau

```bash
# Tester si npm peut résoudre automivy-backend
docker exec npm ping -c 2 automivy-backend

# Si ping ne fonctionne pas, tester avec wget
docker exec npm wget -O- http://automivy-backend:3004/uploads/media-1763447744222-285086997.png 2>&1 | head -20
```

### Test 2 : Vérifier que Nginx a bien rechargé

```bash
# Vérifier la syntaxe
docker exec npm nginx -t

# Forcer le rechargement
docker exec npm nginx -s reload

# Voir les logs d'erreur
docker exec npm tail -20 /data/logs/proxy-host-30_error.log
```

### Test 3 : Tester directement depuis npm

```bash
# Tester le proxy depuis npm
docker exec npm curl -I http://automivy-backend:3004/uploads/media-1763447744222-285086997.png
```

### Test 4 : Vérifier la configuration complète

```bash
# Voir toute la configuration du proxy host
docker exec npm cat /data/nginx/proxy_host/30.conf
```

## 🔧 Solutions possibles

### Solution 1 : Vérifier le réseau Docker

```bash
# Vérifier que npm est sur le même réseau que automivy-backend
docker network inspect bridge | grep -A 5 "npm\|automivy-backend"

# Si npm n'est pas sur le réseau, le connecter
docker network connect bridge npm
```

### Solution 2 : Utiliser l'IP du conteneur au lieu du nom

```bash
# Récupérer l'IP de automivy-backend
docker inspect automivy-backend | grep -A 10 "Networks" | grep "IPAddress"

# Modifier la configuration pour utiliser l'IP au lieu du nom
# Dans Nginx Proxy Manager, remplacez :
# proxy_pass http://automivy-backend:3004;
# Par :
# proxy_pass http://172.x.x.x:3004;
```

### Solution 3 : Vérifier les logs Nginx

```bash
# Logs d'erreur
docker exec npm tail -50 /data/logs/proxy-host-30_error.log

# Logs d'accès
docker exec npm tail -50 /data/logs/proxy-host-30_access.log
```

### Solution 4 : Redémarrer npm

```bash
docker restart npm
```

## 🧪 Test après correction

```bash
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

Résultat attendu : `HTTP/2 200`

