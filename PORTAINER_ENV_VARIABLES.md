# 🔐 Variables d'Environnement pour Portainer

## ⚠️ IMPORTANT

Toutes ces variables **DOIVENT** être définies dans Portainer lors de la création de la Stack, sinon le backend ne démarrera pas.

## 📋 Liste Complète des Variables

### Variables OBLIGATOIRES (sans elles, l'application ne démarrera pas)

```env
# Base de Données PostgreSQL (externe sur VPS)
DB_HOST=147.93.58.155
DB_PORT=5432
DB_NAME=automivy
DB_USER=fethi
DB_PASSWORD=VotreMotDePassePostgreSQL

# JWT
JWT_SECRET=VotreSecretJWTTresSecuriseChangezMoi

# n8n
N8N_URL=https://n8n.globalsaas.eu
N8N_API_KEY=VotreCleAPIn8n

# SMTP
SMTP_PASSWORD=VotreMotDePasseSMTP
```

### Variables RECOMMANDÉES (nécessaires pour certaines fonctionnalités)

```env
# NocoDB (pour LinkedIn workflows)
NOCODB_BASE_URL=https://nocodb.globalsaas.eu
NOCODB_API_TOKEN=VotreTokenAPINocoDB
NOCODB_BASE_ID=VotreBaseIDNocoDB

# OpenRouter (pour génération IA)
OPENROUTER_API_KEY=VotreCleAPIOpenRouter

# OAuth Google
GOOGLE_CLIENT_ID=VotreGoogleClientID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=VotreGoogleClientSecret

# OAuth Microsoft
MICROSOFT_CLIENT_ID=VotreMicrosoftClientID
MICROSOFT_CLIENT_SECRET=VotreMicrosoftClientSecret
```

### Variables OPTIONNELLES (avec valeurs par défaut)

```env
# Base de données (valeurs par défaut)
DB_SSL=false

# JWT
JWT_EXPIRES_IN=24h

# Email SMTP (valeurs par défaut)
SMTP_HOST=mail.heleam.com
SMTP_PORT=587
SMTP_USER=admin@heleam.com
FROM_EMAIL=admin@heleam.com

# URLs Application
FRONTEND_URL=https://automivy.com
BACKEND_URL=https://automivy.com
CORS_ORIGIN=https://automivy.com

# Ollama/LocalAI (optionnel)
OLLAMA_URL=
```

## 🔧 Comment Ajouter les Variables dans Portainer

### Méthode 1 : Via l'Interface Portainer (Recommandé)

1. **Créer/Éditer la Stack** dans Portainer
2. Allez dans la section **Environment variables** ou **Env**
3. Cliquez sur **Add environment variable**
4. Ajoutez chaque variable une par une :
   - **Name** : `DB_PASSWORD`
   - **Value** : `VotreMotDePasse`
5. Répétez pour toutes les variables obligatoires

### Méthode 2 : Via le Compose Editor

Dans l'éditeur de Stack, vous pouvez ajouter une section `env_file` ou définir les variables directement dans le `docker-compose.yml`.

## ✅ Vérification

Après avoir ajouté les variables, vérifiez dans les logs du conteneur `automivy-backend` qu'il n'y a plus d'erreur :

```bash
# Dans Portainer, allez dans Containers > automivy-backend > Logs
# Vous ne devriez plus voir l'erreur "Secrets manquants en production"
```

## 🐛 Si l'Erreur Persiste

1. **Vérifiez que les variables sont bien définies** :
   - Allez dans **Stacks** > `automivy` > **Editor**
   - Vérifiez la section **Environment variables**

2. **Vérifiez les noms des variables** :
   - Les noms doivent être **exactement** comme indiqué (sensible à la casse)
   - `DB_PASSWORD` et non `db_password` ou `Db_Password`

3. **Vérifiez que les valeurs ne sont pas vides** :
   - Assurez-vous qu'aucune variable obligatoire n'a une valeur vide

4. **Redémarrez le conteneur** :
   - Dans Portainer, allez dans **Containers** > `automivy-backend` > **Restart**

## 📝 Template de Variables pour Copier-Coller

Voici un template que vous pouvez copier et adapter dans Portainer :

```env
DB_HOST=147.93.58.155
DB_PORT=5432
DB_NAME=automivy
DB_USER=fethi
DB_PASSWORD=
DB_SSL=false
JWT_SECRET=
JWT_EXPIRES_IN=24h
N8N_URL=https://n8n.globalsaas.eu
N8N_API_KEY=
NOCODB_BASE_URL=https://nocodb.globalsaas.eu
NOCODB_API_TOKEN=
NOCODB_BASE_ID=
OPENROUTER_API_KEY=
SMTP_HOST=mail.heleam.com
SMTP_PORT=587
SMTP_USER=admin@heleam.com
SMTP_PASSWORD=
FROM_EMAIL=admin@heleam.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
FRONTEND_URL=https://automivy.com
BACKEND_URL=https://automivy.com
CORS_ORIGIN=https://automivy.com
```

⚠️ **Remplissez toutes les valeurs vides avec vos vraies données sensibles !**

---

*Guide créé le 2025-08-07*

