# Configuration Microsoft OAuth pour Outlook/Hotmail

Ce guide explique comment configurer l'authentification OAuth Microsoft pour permettre aux utilisateurs de se connecter à leur compte Outlook/Hotmail.

## Étapes de configuration

### 1. Créer une application Azure AD

1. Allez sur [Azure Portal](https://portal.azure.com/)
2. Naviguez vers **Azure Active Directory** > **App registrations** > **New registration**
3. Remplissez les informations :
   - **Name**: Automivy Microsoft OAuth
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: 
     - Type: **Web**
     - URI: `http://localhost:5173/oauth/callback` (pour le développement)
     - **IMPORTANT**: L'URI doit correspondre EXACTEMENT à celui utilisé dans le code (y compris le protocole http/https, le port, et le chemin)
     - Pour la production, utilisez votre URL de production
     - ⚠️ **Note**: Si vous utilisez un backend séparé, le redirect_uri doit pointer vers le frontend, qui redirigera ensuite vers le backend

### 2. Récupérer les credentials

1. Une fois l'application créée, allez dans **Overview**
2. Copiez le **Application (client) ID** → c'est votre `MICROSOFT_CLIENT_ID`
3. Allez dans **Certificates & secrets** > **New client secret**
4. Créez un secret et copiez-le immédiatement (il ne sera affiché qu'une fois) → c'est votre `MICROSOFT_CLIENT_SECRET`

### 3. Configurer les API permissions

1. Allez dans **API permissions**
2. Cliquez sur **Add a permission**
3. Sélectionnez **Microsoft Graph**
4. Choisissez **Delegated permissions**
5. Ajoutez les permissions suivantes :
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `MailboxSettings.Read`
   - `User.Read`
   - `offline_access`
6. Cliquez sur **Add permissions**
7. **Important**: Cliquez sur **Grant admin consent** pour votre organisation (si applicable)

### 4. Configurer le fichier .env

Ajoutez les variables suivantes dans `backend/.env`:

```env
MICROSOFT_CLIENT_ID=votre-client-id-ici
MICROSOFT_CLIENT_SECRET=votre-client-secret-ici
```

### 5. Redémarrer le serveur backend

Après avoir ajouté les variables, redémarrez le serveur backend pour que les changements prennent effet.

## Vérification

Une fois configuré, vous devriez pouvoir :
1. Cliquer sur "Connecter Microsoft Outlook" dans le modal
2. Être redirigé vers la page de connexion Microsoft
3. Autoriser l'application à accéder à votre compte
4. Être redirigé vers l'application avec un message de succès

## Production

Pour la production, n'oubliez pas de :
1. Ajouter l'URL de production dans les **Redirect URIs** de l'application Azure AD
2. Mettre à jour `FRONTEND_URL` dans `backend/.env` avec votre URL de production
3. Utiliser des secrets sécurisés et ne jamais les commiter dans Git

