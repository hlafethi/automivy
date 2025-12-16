# ✅ Configuration du Template "test mcp"

## 📋 Résumé

Le template **"test mcp"** a été configuré avec succès dans le système de déploiement centralisé.

## 🔧 Configuration Ajoutée

### 1. Fichiers Créés

- **`backend/services/injectors/mcpTestInjector.js`**
  - Injecteur spécifique pour le template MCP
  - Gère l'injection de tous les credentials Google OAuth2
  - Supporte : Google Sheets, Google Docs, Google Drive, Gmail

- **`backend/services/deployments/mcpTestDeployment.js`**
  - Déploiement spécifique pour le template MCP
  - Utilise l'injecteur `mcpTestInjector`

### 2. Configuration Centralisée

Ajout dans `backend/config/templateMappings.js` :

```javascript
{
  templateIds: ['5916c2c3-d2f8-4895-8165-5048b367d16a'],
  templateNames: ['test mcp'],
  namePatterns: ['mcp', 'test mcp'],
  deployment: './mcpTestDeployment',
  injector: './mcpTestInjector',
  modal: 'SmartDeployModal',
  description: 'Template MCP avec Google OAuth (Sheets, Docs, Drive, Gmail)'
}
```

### 3. Support OAuth Google Docs

- Ajout du support OAuth pour `google_docs` dans `backend/routes/oauth.js`
- Fonction `createGoogleDocsCredentialInN8n()` créée
- Scopes configurés : `https://www.googleapis.com/auth/documents`

### 4. Détection des Credentials

- Détection automatique des nœuds Google Docs dans `workflowAnalyzer.js`
- Configuration ajoutée pour `googleDocsOAuth2Api` dans `getCredentialConfig()`

### 5. Frontend

- Détection automatique du template MCP dans `templateModalService.ts`
- Le modal `SmartDeployModal` sera utilisé automatiquement

## 📊 Credentials Détectés

Le système détecte automatiquement **4 credentials OAuth** :

1. **Google Sheets OAuth2**
   - Champ : `googleSheetsOAuth2` (OAuth)
   - Champ optionnel : `googleSheetsDocumentId` (text)

2. **Google Docs OAuth2**
   - Champ : `googleDocsOAuth2` (OAuth)

3. **Google Drive OAuth2**
   - Champ : `googleDriveOAuth2` (OAuth)
   - Champ optionnel : `googleDriveFolderId` (text)

4. **Gmail OAuth2**
   - Champ : `gmailOAuth2` (OAuth)

## ✅ Validation

Le script de vérification confirme :
- ✅ Tous les fichiers existent
- ✅ Toutes les fonctions sont exportées
- ✅ Configuration valide

## 🎯 Fonctionnement

### Pour l'Utilisateur

1. L'utilisateur sélectionne le template "test mcp"
2. Le système détecte automatiquement qu'il faut utiliser `SmartDeployModal`
3. Le modal affiche un formulaire avec **4 sections OAuth** :
   - Section 1 : Google Sheets (avec ID document)
   - Section 2 : Google Docs
   - Section 3 : Google Drive (avec ID dossier optionnel)
   - Section 4 : Gmail
4. L'utilisateur clique sur chaque bouton "Connecter" pour chaque service
5. Après connexion OAuth, le déploiement se fait automatiquement

### Backend

1. Le router détecte le template par ID ou nom
2. Utilise `mcpTestDeployment` pour le déploiement
3. Utilise `mcpTestInjector` pour injecter les credentials
4. L'injecteur récupère les credentials OAuth depuis la base de données
5. Injecte les credentials dans le workflow JSON
6. Déploie le workflow dans n8n

## 🔍 Test

Pour tester la détection des credentials :

```bash
node backend/scripts/test-mcp-template.js
```

Résultat attendu :
- ✅ 4 credentials détectés
- ✅ Formulaire généré avec 4 sections
- ✅ Tous les champs OAuth présents

## 📝 Notes

- Le template utilise **OpenRouter** pour l'IA (géré par l'admin, pas demandé à l'utilisateur)
- Tous les services Google nécessitent une connexion OAuth
- Le système gère automatiquement la création des credentials dans n8n
- Les tokens OAuth sont stockés de manière sécurisée dans la base de données

## 🚀 Prêt à l'Emploi

Le template "test mcp" est maintenant **entièrement configuré** et prêt à être utilisé par les utilisateurs. Le modal demandera automatiquement tous les credentials nécessaires lors du déploiement.

