# 🔧 Résolution : Erreur de Variables d'Environnement dans Portainer

## ❌ Erreur

```
Failed to deploy a stack: failed to create compose project: failed to load the compose file options : 
failed to read /data/compose/216/stack.env: line 28: unexpected character "(" in variable name "Email Configuration (SMTP)="
```

## 🔍 Cause du Problème

Le fichier de variables d'environnement dans Portainer contient des **lignes de commentaires ou des sections** qui ne sont pas valides dans un fichier `.env`.

Les fichiers `.env` ont des règles strictes :
- ❌ Pas de commentaires sur la même ligne que les variables
- ❌ Pas de noms de variables avec des espaces ou des parenthèses
- ❌ Pas de sections avec des titres comme `# Email Configuration (SMTP)`
- ✅ Seulement des lignes au format : `VARIABLE_NAME=valeur`

## ✅ Solution

### Dans Portainer, dans la section Environment Variables :

**❌ NE COPIEZ PAS** les lignes comme :
```
# Email Configuration (SMTP)
Email Configuration (SMTP)=
SMTP_HOST=mail.heleam.com
```

**✅ COPIEZ SEULEMENT** les lignes de variables valides :
```
SMTP_HOST=mail.heleam.com
SMTP_PORT=587
SMTP_USER=admin@heleam.com
SMTP_PASSWORD=VotreMotDePasseSMTP
FROM_EMAIL=admin@heleam.com
```

## 📋 Liste Complète des Variables à Ajouter (Sans Commentaires)

Ajoutez **uniquement** ces lignes dans Portainer, une par une :

```env
NODE_ENV=production
PORT=3004
DB_HOST=147.93.58.155
DB_PORT=5432
DB_NAME=automivy
DB_USER=fethi
DB_PASSWORD=VotreMotDePassePostgreSQL
DB_SSL=false
JWT_SECRET=VotreSecretJWTTresSecurise
JWT_EXPIRES_IN=24h
N8N_URL=https://n8n.globalsaas.eu
N8N_API_KEY=VotreCleAPIn8n
NOCODB_BASE_URL=https://nocodb.globalsaas.eu
NOCODB_API_TOKEN=VotreTokenAPINocoDB
NOCODB_BASE_ID=VotreBaseIDNocoDB
OPENROUTER_API_KEY=VotreCleAPIOpenRouter
SMTP_HOST=mail.heleam.com
SMTP_PORT=587
SMTP_USER=admin@heleam.com
SMTP_PASSWORD=VotreMotDePasseSMTP
FROM_EMAIL=admin@heleam.com
GOOGLE_CLIENT_ID=VotreGoogleClientID
GOOGLE_CLIENT_SECRET=VotreGoogleClientSecret
MICROSOFT_CLIENT_ID=VotreMicrosoftClientID
MICROSOFT_CLIENT_SECRET=VotreMicrosoftClientSecret
FRONTEND_URL=https://automivy.com
BACKEND_URL=https://automivy.com
CORS_ORIGIN=https://automivy.com
```

## 🔧 Comment Ajouter les Variables dans Portainer

### Méthode 1 : Via l'Interface Portainer (Recommandé)

1. Allez dans **Stacks** > `automivy` > **Editor**
2. Trouvez la section **Environment variables** ou **Env**
3. **Supprimez toutes les lignes** qui contiennent :
   - Des commentaires (lignes commençant par `#`)
   - Des sections avec des titres
   - Des noms de variables avec des espaces ou des parenthèses
4. Ajoutez **uniquement** les variables au format `VARIABLE_NAME=valeur`
5. **Une variable par ligne**, sans commentaires

### Méthode 2 : Via le Compose Editor

Si vous utilisez le Compose Editor, assurez-vous que la section `environment` ne contient que des variables valides :

```yaml
environment:
  - NODE_ENV=production
  - PORT=3004
  - DB_HOST=147.93.58.155
  # ❌ NE PAS ajouter de commentaires ici
  - DB_PASSWORD=VotreMotDePasse
  # ❌ NE PAS ajouter de sections comme "# Email Configuration (SMTP)"
  - SMTP_HOST=mail.heleam.com
  - SMTP_PASSWORD=VotreMotDePasse
```

## ✅ Vérification

Après avoir corrigé les variables d'environnement :

1. **Sauvegardez** la stack dans Portainer
2. **Redéployez** la stack
3. Vérifiez les logs pour confirmer qu'il n'y a plus d'erreur

## 🐛 Si l'Erreur Persiste

1. **Vérifiez chaque ligne** du fichier de variables d'environnement :
   - Chaque ligne doit être au format : `VARIABLE_NAME=valeur`
   - Pas d'espaces autour du `=`
   - Pas de caractères spéciaux dans le nom de la variable

2. **Supprimez toutes les lignes problématiques** :
   - Lignes commençant par `#`
   - Lignes avec des parenthèses `()`
   - Lignes avec des espaces dans le nom de la variable

3. **Recréez le fichier de variables** en copiant uniquement les variables valides de la liste ci-dessus

---

*Guide créé le 2025-08-07*

