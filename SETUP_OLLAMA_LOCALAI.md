# 🚀 Configuration Ollama (Local AI) - Conteneur Docker

## 📋 Configuration actuelle

**Conteneur Ollama** : `localai`  
**VPS** : `147.93.58.155`  
**Port** : `19080`

## 🎯 Configuration selon votre setup

### Option 1 : Backend AUSSI dans Docker (même réseau) ✅ RECOMMANDÉ

Si votre backend tourne aussi dans Docker et dans le même réseau que `localai` :

**1. Créer ou vérifier le réseau Docker partagé** :
```bash
# Sur le VPS
docker network create automivy-network
# OU utiliser un réseau existant (ex: proxy, bridge, etc.)
```

**2. Connecter les conteneurs au même réseau** :
```bash
# Connecter localai au réseau
docker network connect automivy-network localai

# Connecter le backend au réseau
docker network connect automivy-network automivy-backend
# OU le nom de votre conteneur backend
```

**3. Configuration** (`backend/.env`) :
```bash
OLLAMA_URL=http://localai:19080
```

**4. Redémarrer le backend** pour que les changements prennent effet.

### Option 2 : Backend HORS Docker

Si votre backend tourne directement sur le VPS (pas dans Docker) :

**1. Vérifier que le port est mappé** :
```bash
# Sur le VPS
docker ps | grep localai
# Cherchez : 0.0.0.0:11434->11434/tcp dans la colonne PORTS
```

**2. Configuration** (`backend/.env`) :
```bash
OLLAMA_URL=http://147.93.58.155:19080
# OU si backend sur localhost
OLLAMA_URL=http://localhost:19080
```

**3. Redémarrer le backend** pour que les changements prennent effet.

## ✅ Test de connexion

### Depuis le VPS :

```bash
# Si backend dans Docker (même réseau)
curl http://localai:19080/api/tags

# Si backend hors Docker
curl http://147.93.58.155:19080/api/tags
# OU
curl http://localhost:19080/api/tags
```

Si cela fonctionne, vous devriez voir une liste JSON de modèles Ollama.

## 🔧 Étapes de configuration

### 1. Créer/Modifier `backend/.env`

```bash
# Dans le répertoire backend/
nano .env
# OU
vi .env
```

Ajouter :
```bash
OLLAMA_URL=http://localai:11434
# OU
OLLAMA_URL=http://147.93.58.155:11434
```

### 2. Redémarrer le backend

```bash
# Si backend dans Docker
docker restart automivy-backend

# Si backend hors Docker
# Arrêter avec Ctrl+C puis relancer
npm start
```

### 3. Vérifier les logs

Regardez les logs du backend pour voir :
```
🔧 [Ollama] URL configurée: http://localai:19080
```

### 4. Tester depuis l'interface

1. Aller dans Admin → AI Generator
2. Sélectionner "Local AI (Ollama - Gratuit)"
3. Choisir un modèle (ex: Llama 3.1 8B)
4. Entrer une description de workflow
5. Cliquer sur "Generate with AI"

## 🔍 Dépannage

### Erreur : "Cannot connect to localai:11434"

**Problème** : Backend et Ollama pas dans le même réseau Docker

**Solution** :
1. Vérifier les réseaux : `docker network ls`
2. Connecter les deux conteneurs au même réseau
3. Utiliser l'IP VPS si backend hors Docker : `OLLAMA_URL=http://147.93.58.155:11434`

### Erreur : "Connection refused"

**Problème** : Port non mappé ou Ollama non accessible

**Solution** :
1. Vérifier que `localai` tourne : `docker ps | grep localai`
2. Vérifier le port mappé : `docker ps | grep localai` (colonne PORTS)
3. Utiliser l'IP VPS : `OLLAMA_URL=http://147.93.58.155:19080`

### Erreur : "Network unreachable"

**Problème** : Réseau Docker incorrect

**Solution** :
1. Vérifier le réseau : `docker network inspect <network_name>`
2. Créer un réseau partagé : `docker network create automivy-network`
3. Connecter les conteneurs : `docker network connect automivy-network localai`

## 📝 Résumé

**Conteneur** : `localai`  
**URL Docker** : `http://localai:19080`  
**URL VPS** : `http://147.93.58.155:19080`

**Configuration** (`backend/.env`) :
- Si backend dans Docker : `OLLAMA_URL=http://localai:19080`
- Si backend hors Docker : `OLLAMA_URL=http://147.93.58.155:19080`

**Action requise** : Créer/modifier `backend/.env` et redémarrer le backend.

