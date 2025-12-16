# 🧪 Tests de connectivité npm → automivy-backend

## ✅ Configuration vérifiée

- ✅ Syntaxe Nginx valide
- ✅ Ordre des locations correct : `/api`, `/uploads`, `/`
- ✅ Locations bien configurées

## 🔍 Tests à effectuer

### Test 1 : Résolution DNS depuis npm

```bash
# Tester la résolution du nom
docker exec npm nslookup automivy-backend

# Ou avec getent
docker exec npm getent hosts automivy-backend
```

### Test 2 : Connectivité réseau

```bash
# Tester avec ping (si disponible)
docker exec npm ping -c 2 automivy-backend

# Tester avec wget/curl
docker exec npm wget -O- http://automivy-backend:3004/api/health 2>&1 | head -20
```

### Test 3 : Test direct du proxy_pass

```bash
# Tester depuis npm vers le backend
docker exec npm curl -v http://automivy-backend:3004/uploads/media-1763447744222-285086997.png 2>&1 | head -30
```

### Test 4 : Vérifier les logs d'erreur détaillés

```bash
# Logs d'erreur récents
docker exec npm tail -50 /data/logs/proxy-host-30_error.log

# Logs d'accès pour voir les requêtes
docker exec npm tail -20 /data/logs/proxy-host-30_access.log | grep uploads
```

### Test 5 : Vérifier l'IP du backend

```bash
# Récupérer l'IP de automivy-backend
docker inspect automivy-backend | grep -A 10 "Networks" | grep "IPAddress"

# Tester avec l'IP directement
docker exec npm curl -I http://10.0.0.4:3004/uploads/media-1763447744222-285086997.png
```

## 🔧 Solution si la résolution DNS échoue

Si `nslookup` ou `getent` ne fonctionne pas, utilisez l'IP directement dans la configuration :

1. Récupérez l'IP :
```bash
docker inspect automivy-backend | grep -A 10 "Networks" | grep "IPAddress"
```

2. Dans Nginx Proxy Manager, remplacez dans la location `/uploads` :
```
proxy_pass http://10.0.0.4:3004;
```
au lieu de :
```
proxy_pass http://automivy-backend:3004;
```

## 🧪 Test final

Après les tests, vérifiez :
```bash
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

