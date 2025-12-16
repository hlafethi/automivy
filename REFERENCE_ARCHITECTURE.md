# 📚 Référence Architecture Automivy

> **Document de référence pour comprendre l'architecture et le développement de l'application Automivy**
> 
> Ce document consolide les informations essentielles des multiples fichiers de documentation existants. Il doit être lu en premier lors d'un nouveau chat pour comprendre rapidement l'application.

---

## 🎯 Vue d'Ensemble

**Automivy** est une plateforme SaaS d'automatisation de workflows qui simplifie l'utilisation de n8n pour les utilisateurs finaux. L'application permet de créer, déployer et gérer des workflows n8n avec une interface transparente qui masque toute la complexité technique.

### Stack Technique

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS
- **Backend** : Node.js + Express + PostgreSQL
- **Intégrations** : n8n, OpenRouter, LocalAI/Ollama, NocoDB
- **Tests** : Jest (tests unitaires)

---

## 🏗️ Architecture Générale

### Systèmes Principaux

L'application utilise une **architecture modulaire** avec deux systèmes principaux :

1. **Système d'Injecteurs** (`backend/services/injectors/`) : Injecte les credentials utilisateur dans les workflows
2. **Système de Déploiements** (`backend/services/deployments/`) : Déploie les workflows dans n8n avec la logique appropriée

### Flux de Déploiement

```
Utilisateur → SmartDeployModal
  ↓
POST /api/smart-deploy/analyze
  ↓
Analyse du template (workflowAnalyzer.js)
  ↓
Génération du formulaire dynamique
  ↓
Utilisateur remplit les credentials
  ↓
POST /api/smart-deploy/deploy
  ↓
Router de Déploiements (deployments/index.js)
  ↓
Router d'Injecteurs (injectors/index.js)
  ↓
Injection des credentials
  ↓
Création du workflow dans n8n
  ↓
Activation automatique
  ↓
Enregistrement dans user_workflows
```

---

## 🔐 Système d'Injecteurs de Credentials

### Architecture

Le système d'injecteurs permet d'avoir des injecteurs spécifiques pour chaque template, tout en gardant un injecteur générique comme fallback.

### Structure

```
backend/services/
├── credentialInjector.js          # Injecteur générique (fallback)
└── injectors/
    ├── index.js                   # Router vers les injecteurs spécifiques
    ├── gmailTriInjector.js        # Injecteur pour "GMAIL Tri Automatique"
    ├── resumeEmailInjector.js     # Injecteur pour "Résume Email"
    ├── pdfAnalysisInjector.js     # Injecteur pour "PDF Analysis"
    ├── cvAnalysisInjector.js      # Injecteur pour "CV Analysis"
    ├── imapTriInjector.js         # Injecteur pour "IMAP Tri"
    ├── microsoftTriInjector.js    # Injecteur pour "Microsoft Tri"
    ├── linkedinPostInjector.js    # Injecteur pour "LinkedIn Post Generator"
    ├── nextcloudInjector.js       # Injecteur pour templates Nextcloud
    ├── newsletterInjector.js       # Injecteur pour newsletters
    └── videoProductionInjector.js # Injecteur pour "Production Vidéo IA"
```

### Routing Automatique

Le fichier `injectors/index.js` route automatiquement vers l'injecteur approprié selon :
1. **Template ID** (priorité maximale)
2. **Template Name** (fallback)
3. **Pattern matching** via configuration centralisée (`backend/config/templateMappings.js`)
4. **Injecteur générique** (fallback final)

**⚠️ IMPORTANT** : Les mappings sont centralisés dans `backend/config/templateMappings.js`. Pour ajouter un nouveau template, modifiez uniquement ce fichier.

### Format de Retour Standardisé

Tous les injecteurs doivent retourner :

```javascript
return {
  workflow: injectedWorkflow,        // Workflow avec credentials injectés
  webhookPath: uniqueWebhookPath,    // Path unique pour les webhooks
  createdCredentials: {
    imap: { id: '...', name: '...' },
    smtp: { id: '...', name: '...' },
    // ... autres credentials créés
  }
};
```

### Injecteurs Spécifiques Importants

#### LinkedIn Post Injector (`linkedinPostInjector.js`)

**Template** : "LinkedIn Post Generator - Principal"  
**Spécificités** :
- **Nœuds LinkedIn** : Utilisent le credential LinkedIn OAuth2 utilisateur
- **Nœuds NocoDB** : Création automatique de tables utilisateur (posts, users)
- **NocoDB Credential** : Le champ `host` DOIT inclure `https://` (ex: `https://nocodb.globalsaas.eu`)
- **Injection de paramètres** : `operation`, `baseNameOrId`, `tableNameOrId` sont injectés automatiquement
- **OpenRouter** : Utilise le credential OpenRouter admin

**Credentials requis** :
- LinkedIn OAuth2 (doit être connecté via OAuth avant le déploiement)
- NocoDB API Token (récupéré depuis `admin_api_keys` ou `.env`)

#### NocoDB Service (`nocoDbService.js`)

**Fonctionnalités** :
- Création automatique de tables NocoDB par utilisateur
- Tables créées : `posts_{userIdShort}` et `users_{userIdShort}`
- Gestion des erreurs `DUPLICATE_ALIAS` avec récupération de la table existante
- Types de colonnes supportés : `varchar`, `text`, `timestamp` (⚠️ `datetime` n'est PAS supporté)

---

## 🚀 Système de Déploiements

### Architecture

Le système de déploiements permet d'avoir des déploiements spécifiques pour chaque template, tout en gardant un déploiement générique comme fallback.

### Structure

```
backend/services/deployments/
├── index.js                    # Router vers les déploiements spécifiques
├── deploymentUtils.js           # Fonctions utilitaires partagées
├── genericDeployment.js         # Déploiement générique (fallback)
├── gmailTriDeployment.js        # Déploiement pour "GMAIL Tri"
├── cvAnalysisDeployment.js      # Déploiement pour "CV Analysis"
├── pdfAnalysisDeployment.js     # Déploiement pour "PDF Analysis"
├── resumeEmailDeployment.js     # Déploiement pour "Résume Email"
├── imapTriDeployment.js         # Déploiement pour "IMAP Tri"
├── linkedinPostDeployment.js    # Déploiement pour "LinkedIn Post Generator"
├── nextcloudDeployment.js       # Déploiement pour templates Nextcloud
└── microsoftTriDeployment.js   # Déploiement pour "Microsoft Tri"
```

### Routing Automatique

Le fichier `deployments/index.js` route automatiquement vers le déploiement approprié selon :
1. **Template ID** (priorité maximale)
2. **Template Name** (fallback)
3. **Pattern matching** via configuration centralisée
4. **Déploiement générique** (fallback final)

### Processus de Déploiement Standard

Chaque déploiement suit ce processus :

1. **Parser le JSON du template**
2. **Définir le nom du workflow** (`{template.name} - {userEmail}`)
3. **Injecter les credentials** (via le router d'injecteurs)
4. **Préparer le payload pour n8n**
5. **Vérifier qu'aucun placeholder n'est présent**
6. **Vérifier que tous les nœuds référencés dans les connections existent**
7. **Supprimer les workflows existants** (AVANT de créer le nouveau)
8. **Créer le workflow dans n8n**
9. **Mettre à jour le workflow** avec les credentials (si nécessaire)
10. **Activer le workflow** automatiquement
11. **Enregistrer dans user_workflows**
12. **Sauvegarder les credentials créés**

### Fonctions Utilitaires (`deploymentUtils.js`)

#### `cleanSettings(settings)`
Nettoie l'objet settings pour n8n (n'accepte que `{}` lors de la création).

#### `verifyNoPlaceholders(workflowPayload)`
Vérifie qu'aucun placeholder n'est présent dans le payload avant l'envoi à n8n.

#### `createWorkflowInN8n(workflowPayload)`
Crée le workflow dans n8n via l'API. Vérifie que les credentials sont présents avant et après la création.

#### `updateWorkflowInN8n(workflowId, injectedWorkflow)`
Met à jour le workflow dans n8n avec les credentials. Réinjecte automatiquement les credentials si n8n les supprime.

#### `activateWorkflow(workflowId)`
Active le workflow dans n8n avec validation et retry intelligent.

#### `cleanupExistingWorkflows(userId, templateId)`
Supprime les workflows existants pour cet utilisateur et ce template (AVANT la création du nouveau).

#### `saveWorkflowCredentials(userWorkflowId, injectionResult, userEmail)`
Sauvegarde les credentials créés dans `workflow_credentials` pour permettre le nettoyage.

---

## 🗄️ Base de Données PostgreSQL

### Tables Principales

#### `users`
- `id` (uuid, PK) - Identifiant unique
- `email` (text, unique) - Email pour authentification
- `password_hash` (text) - Mot de passe hashé avec bcrypt
- `role` (text) - 'user' ou 'admin'
- `created_at` (timestamptz)

#### `templates`
- `id` (uuid, PK) - Identifiant unique
- `name` (text) - Nom du template
- `description` (text) - Description
- `json` (jsonb) - Définition complète du workflow n8n
- `created_by` (uuid, FK) - Admin qui a créé le template
- `created_at` (timestamptz)

#### `user_workflows`
- `id` (uuid, PK) - Identifiant unique
- `user_id` (uuid, FK) - Utilisateur propriétaire
- `template_id` (uuid, FK) - Template source
- `n8n_workflow_id` (text) - ID retourné par l'API n8n
- `name` (text) - Nom du workflow (format: `{templateName} - {userEmail}`)
- `is_active` (boolean) - Si le workflow est actif dans n8n
- `webhook_path` (text) - Path unique du webhook
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `admin_api_keys`
- `id` (uuid, PK)
- `service_name` (text) - Nom du service (ex: 'openrouter', 'nocodb')
- `api_key` (text) - Clé API chiffrée
- `description` (text)
- `is_active` (boolean)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `oauth_credentials`
- `id` (uuid, PK)
- `user_id` (uuid, FK) - Utilisateur propriétaire
- `provider` (text) - 'gmail', 'google_sheets', 'linkedin', 'microsoft', etc.
- `encrypted_data` (jsonb) - access_token, refresh_token, etc.
- `n8n_credential_id` (text) - ID du credential dans n8n
- `email` (text) - Email de l'utilisateur pour ce provider
- `expires_at` (timestamptz) - Expiration du token
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `email_credentials`
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `email_address` (text)
- `imap_host`, `imap_port`, `imap_user`, `imap_password` (chiffré)
- `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password` (chiffré)
- `n8n_imap_credential_id` (text)
- `n8n_smtp_credential_id` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `workflow_credentials`
- `id` (uuid, PK)
- `user_workflow_id` (uuid, FK) - Workflow associé
- `credential_type` (text) - Type de credential (imap, smtp, etc.)
- `n8n_credential_id` (text) - ID dans n8n
- `created_at` (timestamptz)

### Sécurité

- **Row Level Security (RLS)** : Isolation par utilisateur
- **Filtrage** : Les requêtes filtrent par `user_id`
- **Credentials** : Jamais stockés en clair, toujours injectés dynamiquement

---

## 📋 Bonnes Pratiques de Développement

### Logging

✅ **Utiliser le logger structuré** (`backend/utils/logger.js`) :

```javascript
const logger = require('../../utils/logger');

logger.info('Message informatif', { context: 'data' });
logger.debug('Message de debug', { context: 'data' });
logger.warn('Message d\'avertissement', { context: 'data' });
logger.error('Message d\'erreur', { error: error.message, stack: error.stack });
```

❌ **Ne pas utiliser** `console.log`, `console.error`, etc.

### Gestion des URLs

✅ **Utiliser la configuration** :

```javascript
const config = require('../config');
const backendUrl = config.app.backendUrl;
const n8nUrl = config.n8n.url;
```

❌ **Ne pas hardcoder** les URLs (`localhost:3004`, etc.)

### Gestion des Secrets

✅ **Utiliser des variables d'environnement** :

```javascript
const password = getEnvWithDevFallback('DB_PASSWORD', 'dev-fallback', 'Description');
```

❌ **Ne pas hardcoder** les secrets en production

### Format des Credentials dans n8n

Les credentials dans n8n doivent être au format objet :

```javascript
{
  imap: { id: 'credential-id', name: 'Credential Name' }
}
```

❌ **Ne pas utiliser** de strings :

```javascript
{
  imap: 'credential-id' // ❌ Incorrect
}
```

### Settings n8n

Les `settings` doivent être un objet vide `{}` lors de la création du workflow dans n8n.

### Connexions n8n

Les connexions utilisent les **noms** des nœuds, pas les IDs :

```javascript
connections: {
  "Node Name": {
    main: [[{"node": "Next Node", "type": "main", "index": 0}]]
  }
}
```

### Ordre des Opérations

⚠️ **IMPORTANT** : Les workflows existants doivent être supprimés **AVANT** de créer le nouveau workflow. Sinon, il y a un risque de supprimer le nouveau workflow.

---

## 🔧 Ajouter un Nouveau Template

### Étape 1 : Configuration Centralisée

Ajouter le mapping dans `backend/config/templateMappings.js` :

```javascript
{
  templateId: 'nouveau-template-id',
  templateName: 'Nouveau Template',
  injector: './nouveauTemplateInjector',
  deployment: './nouveauTemplateDeployment'
}
```

### Étape 2 : Créer l'Injecteur (si nécessaire)

1. **Créer le fichier injecteur** dans `backend/services/injectors/` :

```javascript
// backend/services/injectors/nouveauTemplateInjector.js
const logger = require('../../utils/logger');

async function injectUserCredentials(workflow, userCredentials, userId, templateId, templateName) {
  logger.info('Injection des credentials pour nouveau template', { templateId, userId });
  
  // Logique spécifique du template
  // ...
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: {
      // Credentials créés
    }
  };
}

module.exports = { injectUserCredentials };
```

### Étape 3 : Créer le Déploiement (si nécessaire)

1. **Créer le fichier de déploiement** dans `backend/services/deployments/` :

```javascript
// backend/services/deployments/nouveauTemplateDeployment.js
const nouveauTemplateInjector = require('../injectors/nouveauTemplateInjector');
const db = require('../../database');
const deploymentUtils = require('./deploymentUtils');
const logger = require('../../utils/logger');

async function deployWorkflow(template, credentials, userId, userEmail) {
  logger.info('Déploiement spécifique du workflow', {
    templateName: template.name,
    templateId: template.id,
    userEmail,
    userId
  });
  
  // 1. Parser le JSON
  let workflowJson;
  try {
    workflowJson = typeof template.json === 'string'
      ? JSON.parse(template.json)
      : template.json;
  } catch (parseErr) {
    throw new Error(`JSON du workflow invalide: ${parseErr.message}`);
  }
  
  // 2. Définir le nom
  const workflowName = `${template.name} - ${userEmail}`;
  
  // 3. Injecter les credentials
  const injectionResult = await nouveauTemplateInjector.injectUserCredentials(
    workflowJson, credentials, userId, template.id, template.name
  );
  
  const injectedWorkflow = injectionResult.workflow;
  injectedWorkflow.name = workflowName;
  
  // 4. Préparer le payload
  const workflowPayload = {
    name: workflowName,
    nodes: injectedWorkflow.nodes,
    connections: injectedWorkflow.connections,
    settings: deploymentUtils.cleanSettings(injectedWorkflow.settings)
  };
  
  // 5. Vérifier les placeholders
  deploymentUtils.verifyNoPlaceholders(workflowPayload);
  
  // 6. Nettoyer les workflows existants
  await deploymentUtils.cleanupExistingWorkflows(userId, template.id);
  
  // 7. Créer dans n8n
  const deployedWorkflow = await deploymentUtils.createWorkflowInN8n(workflowPayload);
  
  // 8. Mettre à jour
  await new Promise(resolve => setTimeout(resolve, 1000));
  const updatedWorkflow = await deploymentUtils.updateWorkflowInN8n(
    deployedWorkflow.id, injectedWorkflow
  );
  if (updatedWorkflow) {
    Object.assign(deployedWorkflow, updatedWorkflow);
  }
  
  // 9. Activer
  await new Promise(resolve => setTimeout(resolve, 2000));
  const workflowActivated = await deploymentUtils.activateWorkflow(deployedWorkflow.id);
  
  if (!workflowActivated) {
    logger.warn('Le workflow n\'a pas pu être activé automatiquement', {
      workflowId: deployedWorkflow.id,
      templateId: template.id
    });
  }
  
  // 10. Enregistrer
  const userWorkflow = await db.createUserWorkflow({
    userId: userId,
    templateId: template.id,
    n8nWorkflowId: deployedWorkflow.id,
    n8nCredentialId: null,
    name: workflowName,
    isActive: true,
    webhookPath: injectionResult.webhookPath
  });
  
  // 11. Sauvegarder les credentials
  await deploymentUtils.saveWorkflowCredentials(
    userWorkflow.id, injectionResult, userEmail
  );
  
  logger.info('Workflow déployé avec succès', {
    workflowId: userWorkflow.id,
    n8nWorkflowId: deployedWorkflow.id,
    templateId: template.id,
    userEmail
  });
  
  return {
    success: true,
    message: 'Workflow déployé avec succès',
    workflow: {
      id: userWorkflow.id,
      name: userWorkflow.name,
      n8n_workflow_id: deployedWorkflow.id,
      status: userWorkflow.status
    }
  };
}

module.exports = { deployWorkflow };
```

### Étape 4 : Tester

1. Tester l'injection des credentials
2. Tester le déploiement complet
3. Vérifier que le workflow est actif dans n8n
4. Vérifier que les credentials sont correctement injectés

---

## ⚠️ Points Critiques à Retenir

### NocoDB

1. **Host doit inclure `https://`** : Le champ `host` dans le credential NocoDB doit être l'URL complète avec le protocole (ex: `https://nocodb.globalsaas.eu`)
2. **Types de colonnes** : Utiliser `timestamp` au lieu de `datetime` (non supporté)
3. **Création automatique** : Les tables sont créées automatiquement pour chaque utilisateur
4. **Paramètres requis** : Les nœuds NocoDB nécessitent `operation`, `baseNameOrId`, `tableNameOrId`

### Credentials

1. **Format objet** : Les credentials doivent être des objets avec `id` et `name`, pas des strings
2. **Réinjection** : Si n8n supprime les credentials après création, ils sont automatiquement réinjectés
3. **Validation** : Vérifier que tous les nœuds référencés dans les connections existent dans le workflow

### Workflows

1. **Ordre de suppression** : Supprimer les workflows existants AVANT de créer le nouveau
2. **Vérification des nœuds** : Vérifier que tous les nœuds référencés dans les connections existent
3. **Placeholders** : Vérifier qu'aucun placeholder n'est présent avant l'envoi à n8n

---

## 🐛 Troubleshooting

### Problème : Placeholders non remplacés

**Symptôme** : Le workflow contient encore des placeholders (`USER_IMAP_CREDENTIAL_ID`, etc.)

**Solution** :
1. Vérifier que l'injecteur remplace bien tous les placeholders
2. Utiliser `deploymentUtils.verifyNoPlaceholders()` avant l'envoi à n8n
3. Vérifier les logs pour identifier le placeholder manquant

### Problème : Workflow non activé

**Symptôme** : Le workflow est créé mais reste inactif

**Solution** :
1. Vérifier que `deploymentUtils.activateWorkflow()` est appelé
2. Vérifier les logs pour les erreurs d'activation
3. Vérifier que le workflow est valide dans n8n (credentials, connexions, etc.)

### Problème : Credentials non trouvés

**Symptôme** : Erreur lors de la récupération des credentials OAuth2

**Solution** :
1. Vérifier que l'utilisateur a bien connecté son compte OAuth (Google/Microsoft/LinkedIn)
2. Vérifier que les credentials sont bien dans la table `oauth_credentials`
3. Vérifier les logs pour identifier le problème

### Problème : Nœuds manquants dans le workflow

**Symptôme** : Les connections référencent des nœuds qui n'existent pas

**Solution** :
1. Vérifier que tous les nœuds référencés dans les connections existent dans le workflow
2. Vérifier le template original dans la base de données
3. Corriger les connections ou ajouter les nœuds manquants

### Problème : NocoDB nodes sans credentials

**Symptôme** : Les nœuds NocoDB n'ont pas de credentials après déploiement

**Solution** :
1. Vérifier que le credential NocoDB est créé avec le champ `host` incluant `https://`
2. Vérifier que les paramètres `operation`, `baseNameOrId`, `tableNameOrId` sont injectés
3. Vérifier les logs pour voir si les credentials sont réinjectés après la création

---

## 📝 Notes Importantes

### Configuration Centralisée

Les mappings des templates sont centralisés dans `backend/config/templateMappings.js`. Pour ajouter un nouveau template, modifiez uniquement ce fichier.

### Isolation des Données

- Les utilisateurs ne peuvent accéder qu'à leurs propres workflows
- Les admins peuvent voir tous les workflows
- Les credentials sont injectés dynamiquement et jamais persistés dans n8n

### Gestion des Erreurs

- Utiliser `n8nErrorHandler.js` pour gérer les erreurs de l'API n8n
- Retries intelligents avec backoff exponentiel
- Logs structurés pour le debugging

---

*Document créé le 2025-08-07*  
*Dernière mise à jour : 2025-08-07*

