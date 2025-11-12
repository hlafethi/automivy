# 🔧 Configuration Ollama dans Docker

## 📋 Situation

Ollama est installé dans un conteneur Docker sur votre VPS (`147.93.58.155`).

## 🎯 Configuration

### Option 1 : Backend aussi dans Docker (même réseau)

Si votre backend est aussi dans Docker et dans le même réseau que Ollama :

**Variables d'environnement** (`backend/.env`) :
```bash
OLLAMA_URL=http://localai:19080
```

Où `localai` est le nom de votre conteneur Ollama.

### Option 2 : Backend hors Docker

Si votre backend n'est pas dans Docker, utilisez l'IP du VPS + port mappé :

**Variables d'environnement** (`backend/.env`) :
```bash
OLLAMA_URL=http://147.93.58.155:19080
```

## 🔍 Vérifications nécessaires

### 1. Nom du conteneur Ollama

```bash
# Sur le VPS
docker ps | grep localai
```

Notez le nom du conteneur (colonne NAME). Le conteneur devrait s'appeler `localai`.

### 2. Port mappé

```bash
# Sur le VPS
docker ps | grep localai
# Chercher dans la colonne PORTS (ex: 0.0.0.0:19080->19080/tcp)
```

Si le port est mappé `19080:19080`, utilisez l'IP VPS + port.

### 3. Réseau Docker

```bash
# Voir les réseaux
docker network ls

# Voir les conteneurs dans le réseau
docker network inspect <network_name>
```

### 4. Test de connexion

Depuis le backend (ou VPS) :
```bash
# Si backend dans Docker avec même réseau
curl http://localai:19080/api/tags

# Si backend hors Docker
curl http://147.93.58.155:19080/api/tags
```

## 🚀 Configuration recommandée

### Si backend dans Docker

1. **Créer ou utiliser un réseau Docker partagé** :
```bash
docker network create automivy-network
```

2. **Connecter Ollama au réseau** :
```bash
docker network connect automivy-network localai
```

3. **Connecter le backend au réseau** :
```bash
docker network connect automivy-network automivy-backend
```

4. **Configuration** (`backend/.env`) :
```bash
OLLAMA_URL=http://localai:19080
```

### Si backend hors Docker

1. **Vérifier que le port est mappé** :
```bash
docker ps | grep localai
# Doit afficher : 0.0.0.0:19080->19080/tcp
```

2. **Configuration** (`backend/.env`) :
```bash
OLLAMA_URL=http://147.93.58.155:19080
```

## ✅ Test de connexion

Après configuration, tester depuis le backend :

```bash
curl http://147.93.58.155:19080/api/tags
# OU
curl http://localai:19080/api/tags
```

Si cela fonctionne, vous devriez voir une liste de modèles JSON.

## 🔧 Dépannage

### Erreur : Connection refused

**Problème** : Ollama n'est pas accessible depuis le backend

**Solutions** :
1. Vérifier que le conteneur Ollama est lancé : `docker ps | grep localai`
2. Vérifier le port mappé : `docker ps | grep localai`
3. Vérifier le firewall : `ufw status` (doit permettre le port 19080)

### Erreur : Network unreachable

**Problème** : Backend et Ollama dans des réseaux Docker différents

**Solutions** :
1. Créer un réseau partagé : `docker network create automivy-network`
2. Connecter les deux conteneurs au réseau
3. Utiliser le nom du conteneur dans l'URL

### Erreur : Timeout

**Problème** : Ollama est lent ou surchargé

**Solutions** :
1. Vérifier les ressources : `docker stats localai`
2. Utiliser un modèle plus petit : `phi3:mini` au lieu de `llama3.1:8b`
3. Augmenter le timeout dans le code

