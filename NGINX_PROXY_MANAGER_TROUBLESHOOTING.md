# 🔍 Diagnostic Nginx Proxy Manager - Erreur "Internal Error"

## 📋 Commandes de Diagnostic sur le VPS

### 1. Vérifier les Logs de Nginx Proxy Manager

```bash
# Voir les logs en temps réel
docker logs npm -f

# Voir les 100 dernières lignes
docker logs npm --tail 100

# Chercher les erreurs
docker logs npm 2>&1 | grep -i error
```

### 2. Vérifier que les Conteneurs Automivy sont Démarrés

```bash
# Vérifier l'état des conteneurs
docker ps | grep automivy

# Vérifier les logs du backend
docker logs automivy-backend --tail 50

# Vérifier les logs du frontend
docker logs automivy-frontend --tail 50
```

### 3. Vérifier la Connectivité Réseau

```bash
# Vérifier que npm peut résoudre les noms de conteneurs
docker exec npm ping -c 3 automivy-frontend
docker exec npm ping -c 3 automivy-backend

# Vérifier que npm peut accéder aux ports
docker exec npm wget -O- http://automivy-frontend:80/health
docker exec npm wget -O- http://automivy-backend:3004/api/health
```

### 4. Vérifier les Réseaux Docker

```bash
# Lister tous les réseaux
docker network ls

# Vérifier le réseau de npm
docker inspect npm | grep -A 10 Networks

# Vérifier le réseau des conteneurs automivy
docker inspect automivy-frontend | grep -A 10 Networks
docker inspect automivy-backend | grep -A 10 Networks

# Vérifier les conteneurs sur le même réseau que npm
docker network inspect bridge | grep -A 5 Containers
# ou
docker network inspect default | grep -A 5 Containers
```

### 5. Vérifier la Configuration Nginx de NPM

```bash
# Accéder au conteneur npm
docker exec -it npm sh

# Dans le conteneur, vérifier la configuration
cat /data/nginx/proxy_host/1.conf
# ou
ls -la /data/nginx/proxy_host/

# Vérifier les logs Nginx dans npm
cat /data/logs/proxy-host-*_access.log | tail -20
cat /data/logs/proxy-host-*_error.log | tail -20
```

### 6. Tester la Connexion Directe

```bash
# Tester depuis le VPS directement
curl -I http://automivy-frontend:80/health
curl -I http://automivy-backend:3004/api/health

# Tester avec l'IP du conteneur
FRONTEND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' automivy-frontend)
BACKEND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' automivy-backend)

echo "Frontend IP: $FRONTEND_IP"
echo "Backend IP: $BACKEND_IP"

curl -I http://$FRONTEND_IP/health
curl -I http://$BACKEND_IP:3004/api/health
```

### 7. Vérifier les Certificats SSL

```bash
# Vérifier les certificats existants
docker exec npm ls -la /data/certbot/conf/live/

# Vérifier les logs Let's Encrypt
docker exec npm cat /data/logs/letsencrypt.log | tail -50
```

### 8. Vérifier les Ports et Connexions

```bash
# Vérifier les ports ouverts sur npm
docker port npm

# Vérifier les connexions réseau
netstat -tulpn | grep 80
netstat -tulpn | grep 443
```

## 🔧 Solutions Courantes

### Problème 1 : npm ne peut pas résoudre les noms de conteneurs

**Solution** : Connecter npm au même réseau que les conteneurs automivy

```bash
# Identifier le réseau
NETWORK_NAME=$(docker inspect automivy-frontend | grep -A 5 Networks | grep -oP '"NetworkID": "\K[^"]+' | head -1)
NETWORK_NAME=$(docker network ls | grep $(docker inspect automivy-frontend -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}') | awk '{print $2}')

# Ou simplement utiliser "bridge" ou "default"
docker network connect bridge npm
# ou
docker network connect default npm
```

### Problème 2 : Les conteneurs ne sont pas démarrés

**Solution** : Redémarrer les conteneurs

```bash
docker restart automivy-backend
docker restart automivy-frontend
docker restart npm
```

### Problème 3 : Erreur SSL Let's Encrypt

**Solution** : Vérifier que le domaine pointe vers le VPS

```bash
# Vérifier le DNS
nslookup automivy.com
dig automivy.com

# Vérifier que le port 80 est accessible depuis l'extérieur
# (doit être ouvert dans le firewall)
```

### Problème 4 : Configuration Nginx invalide dans l'onglet Advanced

**Solution** : Vérifier la syntaxe de la configuration

```bash
# Tester la configuration Nginx
docker exec npm nginx -t
```

## 📝 Commandes Rapides (Copier-Coller)

```bash
# Diagnostic complet en une commande
echo "=== Logs NPM ===" && \
docker logs npm --tail 20 && \
echo -e "\n=== État Conteneurs ===" && \
docker ps | grep -E "automivy|npm" && \
echo -e "\n=== Réseaux ===" && \
docker network inspect bridge | grep -A 3 "automivy\|npm" && \
echo -e "\n=== Test Connectivité ===" && \
docker exec npm ping -c 2 automivy-frontend 2>&1 | head -5 && \
docker exec npm ping -c 2 automivy-backend 2>&1 | head -5
```

---

*Guide créé le 2025-08-07*

