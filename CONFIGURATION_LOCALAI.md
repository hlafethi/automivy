# 🔧 Configuration Local AI (Ollama) - Conteneur `localai`

## ✅ Configuration mise à jour

**Conteneur Ollama** : `localai`  
**Port** : `19080`  
**VPS** : `147.93.58.155`

## 🎯 Action requise

### 1. Créer/modifier `backend/.env`

Créer ou modifier le fichier `backend/.env` et ajouter :

**Si votre backend est AUSSI dans Docker** (même réseau que `localai`) :
```bash
OLLAMA_URL=http://localai:19080
```

**Si votre backend n'est PAS dans Docker** :
```bash
OLLAMA_URL=http://147.93.58.155:19080
```

### 2. Vérifier que les conteneurs sont dans le même réseau (si backend dans Docker)

```bash
# Sur le VPS
docker network ls
docker network inspect <network_name>

# Si besoin, connecter localai au même réseau que le backend
docker network connect <network_name> localai
```

### 3. Redémarrer le backend

```bash
# Si backend dans Docker
docker restart <nom_conteneur_backend>

# Si backend hors Docker
# Arrêter (Ctrl+C) et relancer
cd backend
npm start
```

### 4. Vérifier les logs

Dans les logs du backend, vous devriez voir :
```
🔧 [Ollama] URL configurée: http://localai:19080
```

### 5. Tester dans l'interface

1. Aller dans **Admin** → **AI Generator**
2. Sélectionner **"Local AI (Ollama - Gratuit)"**
3. Choisir un modèle (ex: **Llama 3.1 8B**)
4. Entrer une description de workflow
5. Cliquer sur **"Generate with AI"**

## 🔍 Dépannage

### Erreur : Cannot connect to localai:19080

**Solution** :
- Si backend dans Docker : Vérifier que `localai` et le backend sont dans le même réseau
- Si backend hors Docker : Utiliser `OLLAMA_URL=http://147.93.58.155:19080`

### Erreur : Connection refused

**Solution** :
- Vérifier que le conteneur `localai` tourne : `docker ps | grep localai`
- Vérifier que le port est mappé : `docker ps | grep localai` (colonne PORTS)

## 📝 Fichiers modifiés

- ✅ `env.example` : Ajout de `OLLAMA_URL=http://localai:19080`
- ✅ `backend/services/ollamaService.js` : URL par défaut mise à `http://localai:19080`
- ✅ `src/components/AIWorkflowGenerator.tsx` : Support Local AI ajouté

## ✅ Prochaines étapes

1. ✅ Créer `backend/.env` avec `OLLAMA_URL=http://localai:19080` (ou IP VPS)
2. ✅ Redémarrer le backend
3. ✅ Tester depuis l'interface Admin → AI Generator

