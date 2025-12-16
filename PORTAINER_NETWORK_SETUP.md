# 🌐 Configuration Réseau Docker pour Automivy

## 📋 Situation

Les conteneurs `automivy-backend` et `automivy-frontend` doivent pouvoir communiquer avec :
- **n8n** : Accessible via `https://n8n.globalsaas.eu` (URL publique) OU via le nom de conteneur `n8n` si sur le même réseau
- **nocodb** : Accessible via `https://nocodb.globalsaas.eu` (URL publique) OU via le nom de conteneur `nocodb` si sur le même réseau
- **localai** : Accessible via le nom de conteneur `localai` si sur le même réseau

## 🔧 Configuration Actuelle

Le `docker-compose.portainer.yml` utilise le réseau **bridge par défaut**, ce qui permet aux conteneurs de communiquer entre eux via leurs noms de conteneurs.

## ✅ Vérification

### Option 1 : Utiliser les URLs publiques (Actuel)

Si vos services sont accessibles via leurs URLs publiques (via Nginx Proxy Manager), la configuration actuelle fonctionne :

```env
N8N_URL=https://n8n.globalsaas.eu
NOCODB_BASE_URL=https://nocodb.globalsaas.eu
```

### Option 2 : Utiliser les noms de conteneurs (Si sur le même réseau)

Si vous voulez que les conteneurs communiquent directement via Docker (plus rapide, pas besoin de passer par Nginx), vous pouvez :

1. **Vérifier le réseau des autres conteneurs** :
```bash
# Sur le VPS
docker inspect n8n | grep -A 10 Networks
docker inspect nocodb | grep -A 10 Networks
```

2. **Si n8n et nocodb sont sur un réseau spécifique**, modifiez `docker-compose.portainer.yml` :

```yaml
networks:
  # Utiliser le même réseau que n8n et nocodb
  n8n_default:  # ou le nom du réseau de n8n
    external: true
```

3. **Utiliser les noms de conteneurs dans les variables d'environnement** :

```env
# Si n8n est accessible via Docker
N8N_URL=http://n8n:5678

# Si nocodb est accessible via Docker
NOCODB_BASE_URL=http://nocodb:8080
```

## 🔍 Vérifier que les Conteneurs sont sur le Même Réseau

Dans Portainer, vous pouvez vérifier :

1. Allez dans **Networks**
2. Cliquez sur le réseau (probablement `bridge` ou le réseau par défaut)
3. Vérifiez que `automivy-backend`, `automivy-frontend`, `n8n`, `nocodb` sont tous listés

## 🚀 Configuration Recommandée

Pour l'instant, gardez la configuration actuelle avec les URLs publiques :
- ✅ Plus simple
- ✅ Fonctionne même si les conteneurs sont sur des réseaux différents
- ✅ Passe par Nginx Proxy Manager (SSL, etc.)

Si vous voulez optimiser pour la communication interne, vous pouvez utiliser les noms de conteneurs, mais cela nécessite que tous les conteneurs soient sur le même réseau Docker.

---

*Guide créé le 2025-08-07*

