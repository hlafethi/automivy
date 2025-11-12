# 🔐 Configuration Google OAuth pour Gmail

## 📋 Étapes de Configuration

### 1. Créer un Projet dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Notez le nom du projet

### 2. Activer l'API Gmail

1. Dans le menu latéral, allez dans **APIs & Services** > **Library**
2. Recherchez "Gmail API"
3. Cliquez sur **Enable** pour activer l'API Gmail

### 3. Créer des Identifiants OAuth 2.0

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - Choisissez **External** (ou Internal si vous avez Google Workspace)
   - Remplissez les informations requises
   - Ajoutez votre email comme test user
4. Pour le type d'application, choisissez **Web application**
5. Configurez les **Authorized redirect URIs** :
   **IMPORTANT** : Google OAuth **n'accepte PAS les IPs privées** (192.168.x.x, 10.x.x.x) comme redirect URIs.
   
   **Pour le développement local**, utilisez uniquement :
   ```
   http://localhost:5173/oauth/callback
   http://127.0.0.1:5173/oauth/callback
   ```
   
   **⚠️ Ne pas ajouter d'IPs privées** comme `http://192.168.18.32:5173/oauth/callback` - Google les rejettera.
   
   **Pour la production**, ajoutez :
   ```
   https://votre-domaine.com/oauth/callback
   ```
   
   **Note** : Le système utilise automatiquement `localhost` pour OAuth, même si vous accédez à l'application via une IP privée. C'est normal et nécessaire car Google n'accepte que `localhost`, `127.0.0.1` ou des domaines publics.
6. Cliquez sur **Create**
7. **Copiez le Client ID et le Client Secret**

### 4. Configurer dans le Backend

Ajoutez les variables suivantes dans `backend/.env` :

```env
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
```

### 5. Redémarrer le Backend

Après avoir ajouté les variables, redémarrez le serveur backend pour que les changements prennent effet.

## ✅ Vérification

Une fois configuré, l'utilisateur pourra cliquer sur "Connecter Gmail" et sera redirigé vers Google pour autoriser l'accès à son compte Gmail.

## 🔒 Scopes Demandés

L'application demande les scopes suivants :
- `https://www.googleapis.com/auth/gmail.readonly` - Lire les emails
- `https://www.googleapis.com/auth/gmail.modify` - Modifier les emails (déplacer, marquer)
- `https://www.googleapis.com/auth/gmail.send` - Envoyer des emails

## 📝 Notes Importantes

- Les credentials OAuth sont stockés de manière sécurisée dans la base de données
- Le credential est automatiquement créé dans n8n après autorisation
- L'utilisateur n'a pas besoin de configurer quoi que ce soit dans n8n manuellement

