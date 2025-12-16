# 🔧 Correction : 404 malgré connectivité OK

## ✅ Tests confirmés

- ✅ DNS résolution : `automivy-backend` → `10.0.7.2`
- ✅ Connectivité : npm peut joindre le backend
- ✅ Backend répond : HTTP 200 OK
- ✅ Configuration Nginx : syntaxe valide, ordre correct

## 🚨 Problème identifié

Le 404 vient probablement d'un **cache Nginx** ou d'une **configuration par défaut** qui intercepte avant nos locations custom.

## ✅ Solutions à essayer

### Solution 1 : Forcer le rechargement complet de Nginx

```bash
# Redémarrer npm complètement
docker restart npm

# Attendre 10 secondes puis tester
sleep 10
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

### Solution 2 : Vérifier les logs d'erreur détaillés

```bash
# Voir les logs d'erreur récents
docker exec npm tail -100 /data/logs/proxy-host-30_error.log | grep -i "uploads\|404"

# Voir les logs d'accès pour cette requête spécifique
docker exec npm tail -50 /data/logs/proxy-host-30_access.log | grep "uploads.*1763447744222"
```

### Solution 3 : Utiliser l'IP directement dans proxy_pass

Puisque la résolution DNS fonctionne mais que le proxy ne fonctionne pas, essayons avec l'IP :

1. **Dans Nginx Proxy Manager** > **Proxy Hosts** > **automivy.com** > **Advanced**
2. Modifiez la location `/uploads` :

Remplacez :
```
proxy_pass http://automivy-backend:3004;
```

Par :
```
proxy_pass http://10.0.7.2:3004;
```

3. **Sauvegardez** et testez :
```bash
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

### Solution 4 : Ajouter des headers de debug

Ajoutez dans la location `/uploads` pour voir ce qui se passe :

```
location /uploads {
    proxy_pass http://automivy-backend:3004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Debug headers
    add_header X-Debug-Upstream $upstream_addr always;
    add_header X-Debug-Status $upstream_status always;
    
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
}
```

### Solution 5 : Vérifier s'il y a une configuration par défaut qui intercepte

```bash
# Vérifier s'il y a d'autres includes qui pourraient intercepter
docker exec npm cat /data/nginx/proxy_host/30.conf | grep -i "include\|location" | head -20

# Vérifier la configuration custom
docker exec npm cat /data/nginx/custom/server_proxy.conf 2>/dev/null || echo "Fichier custom non trouvé"
```

## 🧪 Test après chaque solution

```bash
# Test simple
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png

# Test avec headers de debug (si Solution 4 appliquée)
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png 2>&1 | grep -i "x-debug"
```

## 📝 Note importante

L'IP `10.0.7.2` est différente de `10.0.0.4` testée précédemment. Cela suggère que le backend pourrait être sur un réseau différent. Utilisez l'IP résolue par DNS (`10.0.7.2`) dans la configuration.

