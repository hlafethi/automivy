# 🚀 Développement vs Production - Planification des Workflows

## 📋 Réponse à votre question

**OUI, c'est normal** que le workflow ne fonctionne pas si l'application n'est pas lancée en développement.

## 🔍 Pourquoi ?

### En Développement
- **n8n doit être lancé** pour que les Schedule Triggers fonctionnent
- Le Schedule Trigger s'exécute **dans n8n**, pas dans votre backend
- Si n8n n'est pas lancé → pas d'exécution du workflow

### En Production
- n8n tourne en continu (service système, Docker, etc.)
- Les workflows s'exécutent automatiquement selon leur schedule
- Pas besoin de lancer manuellement

## 🎯 Deux Systèmes de Planification

### 1. **Schedule Trigger n8n** (Votre workflow utilise probablement ça)
- ✅ **Avantage** : Fonctionne même si votre backend est arrêté
- ✅ **Avantage** : Géré directement par n8n (plus fiable)
- ❌ **Inconvénient en dev** : n8n doit être lancé
- 📍 **Où vérifier** : Interface n8n → Workflow → Nœud Schedule Trigger

### 2. **Scheduler Backend** (`backend/scripts/schedule-workflows.js`)
- ✅ **Avantage** : Contrôle depuis votre application
- ❌ **Inconvénient** : Backend doit être lancé
- ❌ **Inconvénient** : Plus complexe à maintenir
- 📍 **Où vérifier** : Backend logs

## ✅ Solution pour le Développement

### Option 1 : Lancer n8n en continu (Recommandé)
```bash
# Si n8n est en Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  n8nio/n8n

# Ou si n8n est installé localement
n8n start
```

### Option 2 : Tester manuellement le workflow
- Ouvrir n8n
- Trouver votre workflow
- Cliquer sur "Execute Workflow" pour tester sans attendre le schedule

### Option 3 : Utiliser une heure proche pour tester
- Changer temporairement l'heure à 1-2 minutes dans le futur
- Lancer n8n
- Attendre l'exécution
- Remettre l'heure à 14:25 après les tests

## 🎯 Votre Situation Actuelle

D'après le diagnostic :
- ✅ Votre workflow utilise probablement le **Schedule Trigger de n8n**
- ✅ Quand n8n est lancé → ça fonctionne (vous avez reçu l'email)
- ❌ Quand n8n est arrêté → ça ne fonctionne pas (normal)

## 📋 Checklist Développement

- [ ] n8n doit être lancé pour que les workflows s'exécutent
- [ ] Le backend n'a pas besoin d'être lancé (si vous utilisez Schedule Trigger n8n)
- [ ] En production, tout tourne automatiquement 24/7

## 🚀 Pour la Production

Assurez-vous que :
1. ✅ n8n est configuré comme **service système** ou dans **Docker avec restart: always**
2. ✅ Votre backend est configuré comme **service système** ou dans **Docker**
3. ✅ Les deux tournent 24/7

## 💡 Conseil

**En développement**, utilisez le Schedule Trigger de n8n (comme maintenant). C'est plus simple et plus fiable que le scheduler backend.

**Pour tester**, lancez n8n avant de tester les workflows planifiés, ou testez manuellement via l'interface n8n.

