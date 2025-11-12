# 🔧 Configuration Ollama dans Docker

## 📋 Problème actuel

Ollama est installé dans un conteneur Docker sur votre VPS. Le backend doit pouvoir s'y connecter.

## 🔍 Vérifications nécessaires

### 1. **Réseau Docker**

Si votre backend est aussi dans Docker :
- ✅ Ollama et le backend doivent être dans le **même réseau Docker**
- ✅ Utiliser le **nom du conteneur** Ollama au lieu de l'IP

Exemple :
```javascript
// Si le conteneur s'appelle "ollama-llm"
this.baseUrl = 'http://ollama-llm:11434';
```

### 2. **Port mappé**

Si votre backend n'est **pas dans Docker** :
- ✅ Utiliser l'IP du VPS + le port mappé
- ✅ Le port doit être mappé dans `docker run` ou `docker-compose.yml`

Exemple :
```javascript
// Port mappé 11434:11434 dans Docker
this.baseUrl = 'http://147.93.58.155:11434';
```

### 3. **Configuration actuelle**

Dans `backend/services/ollamaService.js` :
```javascript
this.baseUrl = process.env.OLLAMA_URL || 'http://147.93.58.155:11434';
```

## 🎯 Solutions possibles

### Solution 1 : Backend dans Docker (même réseau)

Si le backend est aussi dans Docker, utilisez le nom du conteneur :

```javascript
this.baseUrl = process.env.OLLAMA_URL || 'http://ollama-llm:11434';
```

**Variables d'environnement** (`backend/.env`) :
```
OLLAMA_URL=http://ollama-llm:11434
```

### Solution 2 : Backend hors Docker

Si le backend n'est pas dans Docker, utilisez l'IP + port mappé :

```javascript
this.baseUrl = process.env.OLLAMA_URL || 'http://147.93.58.155:11434';
```

**Vérifier le port mappé** :
```bash
docker ps | grep ollama
# Chercher la colonne PORTS (ex: 0.0.0.0:11434->11434/tcp)
```

## 🔧 Configuration Docker

### Vérifier le conteneur Ollama

```bash
# Voir les conteneurs Ollama
docker ps | grep ollama

# Voir les réseaux
docker network ls

# Voir les détails du réseau
docker network inspect <network_name>
```

### Créer un réseau Docker partagé

```bash
# Créer un réseau
docker network create automivy-network

# Connecter Ollama au réseau
docker network connect automivy-network ollama-llm

# Connecter le backend au réseau (si dans Docker)
docker network connect automivy-network automivy-backend
```

## 📝 Variables d'environnement

Ajouter dans `backend/.env` :
```
OLLAMA_URL=http://ollama-llm:11434
# OU
OLLAMA_URL=http://147.93.58.155:11434
```

## ✅ Tests à effectuer

1. **Test de connexion depuis le backend** :
```bash
curl http://ollama-llm:11434/api/tags
# OU
curl http://147.93.58.155:11434/api/tags
```

2. **Vérifier les logs Ollama** :
```bash
docker logs ollama-llm
```

3. **Vérifier le port mappé** :
```bash
docker ps | grep ollama
netstat -tlnp | grep 11434
```

