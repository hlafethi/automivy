# 🚀 Guide de Déploiement LinkedIn - Étapes à Suivre

## 📋 Vue d'ensemble

Les 3 workflows LinkedIn fonctionnent **ensemble** et partagent les mêmes credentials. Lorsqu'un utilisateur déploie un workflow LinkedIn, les 3 sont automatiquement déployés ensemble.

## ✅ Étapes à Suivre

### 1. Créer les 3 Templates dans la Base de Données

Exécutez le script de création :

```bash
node backend/scripts/create-linkedin-templates.js
```

Ce script va :
- ✅ Lire les 3 fichiers JSON depuis `Downloads/`
- ✅ Créer les templates dans la BDD avec les noms exacts :
  - `LinkedIn Post Generator - Principal`
  - `LinkedIn Token Monitor - Surveillance Expiration`
  - `LinkedIn OAuth Handler - Inscription & Reconnexion`
- ✅ Les rendre visibles pour les utilisateurs

**⚠️ Important** : Assurez-vous que les fichiers JSON sont dans le dossier `Downloads/` :
- `workflow-1-linkedin-post-generator.json`
- `workflow-2-token-monitor.json`
- `workflow-3-oauth-handler.json`

### 2. Vérifier les Placeholders dans les Workflows JSON

Les workflows doivent contenir ces placeholders qui seront remplacés automatiquement :

- `YOUR_NOCODB_CREDENTIAL_ID` → Credential NocoDB
- `YOUR_LINKEDIN_CREDENTIAL_ID` → Credential LinkedIn OAuth2
- `YOUR_SMTP_CREDENTIAL_ID` → Credential SMTP (admin)
- `YOUR_OPENROUTER_CREDENTIAL_ID` → Credential OpenRouter (admin)

**Note** : Si les placeholders ne sont pas présents, l'injecteur les ajoutera automatiquement lors du déploiement.

### 3. Configurer les Variables d'Environnement dans n8n

Dans n8n, allez dans **Settings > Environment Variables** et ajoutez :

```env
LINKEDIN_CLIENT_ID=votre_client_id
LINKEDIN_CLIENT_SECRET=votre_client_secret
LINKEDIN_REDIRECT_URI=https://votre-domaine.com/oauth/linkedin/callback
NOCODB_USERS_TABLE=votre_table_id_users
NOCODB_POSTS_TABLE=votre_table_id_posts
APP_URL=https://votre-domaine.com
SMTP_FROM_EMAIL=admin@heleam.com
```

**⚠️ Critique** : Ces variables sont utilisées dans les workflows via `$env.VARIABLE_NAME`

### 4. Configurer LinkedIn OAuth dans le Backend

Assurez-vous que le système OAuth LinkedIn est configuré dans `backend/routes/oauth.js` :

- Route `/api/oauth/initiate/linkedin` pour initier le flux OAuth
- Route `/api/oauth/callback` pour gérer le callback LinkedIn
- Stockage des tokens dans `oauth_credentials` avec `provider = 'linkedin'`

### 5. Tester le Déploiement

1. **Connectez-vous** à l'application
2. **Ouvrez SmartDeployModal** (via le bouton de création d'automatisation)
3. **Sélectionnez** un des workflows LinkedIn (n'importe lequel, les 3 seront déployés)
4. **Remplissez le formulaire** avec :
   - LinkedIn OAuth2 : Cliquez sur "Connecter LinkedIn"
   - NocoDB API Token : Votre token NocoDB
   - NocoDB Base URL : URL de votre instance NocoDB (optionnel)
   - NocoDB Users Table : ID de la table users (optionnel, utilise env)
   - NocoDB Posts Table : ID de la table posts (optionnel, utilise env)
5. **Déployez** : Les 3 workflows seront créés ensemble

### 6. Vérifier le Déploiement

Après le déploiement, vérifiez dans n8n :

- ✅ 3 workflows créés avec les noms : `[Nom Workflow] - user@email.com`
- ✅ Tous les workflows sont **actifs**
- ✅ Les credentials sont assignés correctement :
  - LinkedIn OAuth2 dans les nœuds LinkedIn
  - NocoDB dans les nœuds NocoDB
  - SMTP dans les nœuds Email Send
  - OpenRouter dans les nœuds AI/LangChain

## 🔍 Dépannage

### Problème : Un seul workflow est déployé au lieu de 3

**Solution** : Vérifiez que les 3 templates existent dans la BDD avec les noms exacts :
```sql
SELECT name, id FROM templates WHERE name LIKE '%LinkedIn%';
```

### Problème : Erreur "Credential NocoDB manquant"

**Solution** : Assurez-vous de fournir le token NocoDB dans le formulaire de déploiement.

### Problème : Erreur "LinkedIn OAuth2 non trouvé"

**Solution** : L'utilisateur doit d'abord se connecter via OAuth LinkedIn avant de déployer.

### Problème : Variables d'environnement non trouvées dans n8n

**Solution** : Configurez les variables dans n8n (Settings > Environment Variables).

## 📊 Structure des Workflows

### Workflow 1 : LinkedIn Post Generator
- **Déclencheur** : Webhook POST `/generate-linkedin-post`
- **Fonction** : Génère un post LinkedIn avec IA et le publie
- **Credentials** : LinkedIn OAuth2, NocoDB, OpenRouter, SMTP

### Workflow 2 : LinkedIn Token Monitor
- **Déclencheur** : Cron quotidien (9h)
- **Fonction** : Surveille l'expiration des tokens et envoie des notifications
- **Credentials** : NocoDB, SMTP

### Workflow 3 : LinkedIn OAuth Handler
- **Déclencheur** : Webhook GET `/linkedin-callback`
- **Fonction** : Gère le flux OAuth (inscription et reconnexion)
- **Credentials** : NocoDB, SMTP

## 🎯 Résultat Attendu

Après un déploiement réussi, vous devriez avoir :

```json
{
  "success": true,
  "message": "Workflows LinkedIn déployés: 3/3 réussis",
  "workflows": [
    {
      "id": "...",
      "name": "LinkedIn Post Generator - Principal - user@email.com",
      "n8n_workflow_id": "...",
      "templateName": "LinkedIn Post Generator - Principal"
    },
    {
      "id": "...",
      "name": "LinkedIn Token Monitor - Surveillance Expiration - user@email.com",
      "n8n_workflow_id": "...",
      "templateName": "LinkedIn Token Monitor - Surveillance Expiration"
    },
    {
      "id": "...",
      "name": "LinkedIn OAuth Handler - Inscription & Reconnexion - user@email.com",
      "n8n_workflow_id": "...",
      "templateName": "LinkedIn OAuth Handler - Inscription & Reconnexion"
    }
  ],
  "isGroupDeployment": true
}
```

## ✅ Checklist Finale

- [ ] Script de création exécuté avec succès
- [ ] 3 templates créés dans la BDD
- [ ] Variables d'environnement configurées dans n8n
- [ ] OAuth LinkedIn configuré dans le backend
- [ ] Test de déploiement réussi
- [ ] 3 workflows visibles dans n8n
- [ ] Tous les workflows actifs
- [ ] Credentials assignés correctement

---

**🎉 Une fois ces étapes terminées, le système LinkedIn est prêt à être utilisé !**

