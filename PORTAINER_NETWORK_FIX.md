# 🔧 Résolution : Port 3005 déjà utilisé

## ❌ Erreur

```
Bind for 0.0.0.0:3005 failed: port is already allocated
```

## ✅ Solution

**Les conteneurs n'ont pas besoin d'exposer de ports** car Nginx Proxy Manager peut se connecter directement via le réseau Docker.

### Configuration dans docker-compose.portainer.yml

Le frontend **ne doit PAS** avoir de section `ports` :

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile.frontend
  container_name: automivy-frontend
  restart: unless-stopped
  networks:
    - default
  depends_on:
    - backend
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  # ❌ PAS de section ports ici
```

### Configuration dans Nginx Proxy Manager

1. **Frontend Proxy Host** :
   - **Forward Hostname / IP** : `automivy-frontend` (nom du conteneur)
   - **Forward Port** : `80` (port interne du conteneur)

2. **Backend Proxy Host** :
   - **Forward Hostname / IP** : `automivy-backend` (nom du conteneur)
   - **Forward Port** : `3004` (port interne du conteneur)

### Vérifier que Nginx Proxy Manager est sur le même réseau

Pour que Nginx Proxy Manager puisse se connecter aux conteneurs, il doit être sur le même réseau Docker :

```bash
# Vérifier le réseau de Nginx Proxy Manager
docker inspect npm | grep -A 10 Networks

# Vérifier le réseau des conteneurs automivy
docker inspect automivy-frontend | grep -A 10 Networks
docker inspect automivy-backend | grep -A 10 Networks
```

Si Nginx Proxy Manager n'est pas sur le même réseau, vous avez deux options :

#### Option 1 : Connecter Nginx Proxy Manager au réseau `default`

```bash
docker network connect default npm
```

#### Option 2 : Utiliser l'IP du VPS + ports internes (si les conteneurs exposent des ports)

Mais dans ce cas, vous devez exposer les ports dans docker-compose.portainer.yml (ce qui cause le conflit si le port est déjà utilisé).

## 🎯 Solution Recommandée

1. **Supprimez toute section `ports`** du docker-compose.portainer.yml pour le frontend
2. **Assurez-vous que Nginx Proxy Manager est sur le même réseau** que les conteneurs automivy
3. **Utilisez les noms de conteneurs** dans Nginx Proxy Manager (`automivy-frontend`, `automivy-backend`)

---

*Guide créé le 2025-08-07*

