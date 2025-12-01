# 📚 Documentation Complète - Automivy

## Table des Matières

1. [Architecture Générale](#architecture-générale)
2. [Système d'Injecteurs de Credentials](#système-dinjecteurs-de-credentials)
3. [Système de Déploiements](#système-de-déploiements)
4. [Bonnes Pratiques](#bonnes-pratiques)
5. [Ajouter un Nouveau Template](#ajouter-un-nouveau-template)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Générale

### Vue d'Ensemble

Automivy utilise une architecture modulaire avec deux systèmes principaux :
- **Système d'Injecteurs** : Injecte les credentials utilisateur dans les workflows
- **Système de Déploiements** : Déploie les workflows dans n8n avec la logique appropriée

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

## Système d'Injecteurs de Credentials

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
    ├── microsoftTriInjector.js   # Injecteur pour "Microsoft Tri"
    └── newsletterInjector.js      # Injecteur pour "Newsletter"
```

### Fonctionnement

#### Routing Automatique

Le fichier `injectors/index.js` route automatiquement vers l'injecteur approprié selon :
1. **Template ID** (priorité)
2. **Template Name** (fallback)

Si aucun injecteur spécifique n'est trouvé, l'injecteur générique (`credentialInjector.js`) est utilisé.

#### Mapping des Templates

Les templates sont mappés dans `injectors/index.js` :

```javascript
const TEMPLATE_INJECTORS = {
  // GMAIL Tri Automatique Boite Email
  '5114f297-e56e-4fec-be2b-1afbb5ea8619': require('./gmailTriInjector'),
  'GMAIL Tri Automatique Boite Email': require('./gmailTriInjector'),
  
  // Template fonctionnel résume email
  '6ff57a3c-c9a0-40ec-88c0-7e25ef031cb0': require('./resumeEmailInjector'),
  'Template fonctionnel résume email': require('./resumeEmailInjector'),
  
  // PDF Analysis Complete
  '132d04c8-e36a-4dbd-abac-21fa8280650e': require('./pdfAnalysisInjector'),
  'PDF Analysis Complete': require('./pdfAnalysisInjector'),
  
  // CV Analysis and Candidate Evaluation
  'aa3ba641-9bfb-429c-8b42-506d4f33ff40': require('./cvAnalysisInjector'),
  'CV Analysis and Candidate Evaluation': require('./cvAnalysisInjector'),
  
  // IMAP Tri Automatique BAL
  'c1bd6bd6-8a2b-4beb-89ee-1cd734a907a2': require('./imapTriInjector'),
  'IMAP Tri Automatique BAL': require('./imapTriInjector'),
  
  // Microsoft Tri Automatique BAL
  'a3b5ba35-aeea-48f4-83d7-34e964a6a8b6': require('./microsoftTriInjector'),
  'Microsoft Tri Automatique BAL': require('./microsoftTriInjector'),
};
```

### Injecteurs Spécifiques

#### 1. Gmail Tri Injector (`gmailTriInjector.js`)

**Template** : "GMAIL Tri Automatique Boite Email"  
**ID** : `5114f297-e56e-4fec-be2b-1afbb5ea8619`

**Spécificités** :
- **Premier nœud IMAP** : Utilise le credential IMAP utilisateur
- **Autres nœuds Gmail** : Utilisent le credential Gmail OAuth2 utilisateur (récupéré depuis la BDD)
- **Récupération OAuth2** : Le credential Gmail OAuth2 est récupéré depuis `oauth_credentials` table

**Credentials requis** :
- IMAP (email, imapPassword, imapServer, imapPort)
- Gmail OAuth2 (doit être connecté via OAuth avant le déploiement)

---

#### 2. Resume Email Injector (`resumeEmailInjector.js`)

**Template** : "Template fonctionnel résume email"  
**ID** : `6ff57a3c-c9a0-40ec-88c0-7e25ef031cb0`

**Spécificités** :
- **Nœuds IMAP** : Utilisent le credential IMAP utilisateur
- **Nœuds SMTP** : Utilisent le credential SMTP utilisateur (pour l'envoi du résumé)
- **OpenRouter** : Utilise le credential OpenRouter admin

**Credentials requis** :
- IMAP (email, imapPassword, imapServer, imapPort)
- SMTP (dérivé automatiquement de IMAP)

---

#### 3. PDF Analysis Injector (`pdfAnalysisInjector.js`)

**Template** : "PDF Analysis Complete"  
**ID** : `132d04c8-e36a-4dbd-abac-21fa8280650e`

**Spécificités** :
- **OpenRouter** : Utilise le credential OpenRouter admin
- **SMTP** : Utilise le credential SMTP admin (pour l'envoi du rapport)
- **Pas de credentials utilisateur** : Ce template utilise uniquement des credentials admin

**Credentials requis** :
- Aucun credential utilisateur requis (tout est géré par les credentials admin)

---

#### 4. CV Analysis Injector (`cvAnalysisInjector.js`)

**Template** : "CV Analysis and Candidate Evaluation"  
**ID** : `aa3ba641-9bfb-429c-8b42-506d4f33ff40`

**Spécificités** :
- **OpenRouter** : Utilise le credential OpenRouter admin (pour l'extraction et l'évaluation des CVs)
- **SMTP** : Utilise le credential SMTP admin (pour l'envoi du rapport comparatif)
- **Pas de credentials utilisateur** : Ce template utilise uniquement des credentials admin
- **Webhook unique** : Génère un webhook unique par utilisateur (`workflow-{templateId}-{userId}`)

**Credentials requis** :
- Aucun credential utilisateur requis (tout est géré par les credentials admin)

---

#### 5. IMAP Tri Injector (`imapTriInjector.js`)

**Template** : "IMAP Tri Automatique BAL"  
**ID** : `c1bd6bd6-8a2b-4beb-89ee-1cd734a907a2`

**Spécificités** :
- **Nœuds IMAP** : Utilisent le credential IMAP utilisateur (pour la lecture, création de dossiers, déplacement d'emails)
- **SMTP** : Utilise le credential SMTP admin (pour l'envoi du rapport)
- **Récupération IMAP** : Le credential IMAP est créé automatiquement depuis les données utilisateur

**Credentials requis** :
- IMAP (email, imapPassword, imapServer, imapPort)

---

#### 6. Microsoft Tri Injector (`microsoftTriInjector.js`)

**Template** : "Microsoft Tri Automatique BAL"  
**ID** : `a3b5ba35-aeea-48f4-83d7-34e964a6a8b6`

**Spécificités** :
- **Nœuds Microsoft Outlook** : Utilisent le credential Microsoft Outlook OAuth2 utilisateur
- **SMTP** : Utilise le credential SMTP admin (pour l'envoi du rapport)
- **Récupération OAuth2** : Le credential Microsoft Outlook OAuth2 est récupéré depuis `oauth_credentials` table

**Credentials requis** :
- Microsoft Outlook OAuth2 (doit être connecté via OAuth avant le déploiement)

---

#### 7. Injecteur Générique (`credentialInjector.js`)

**Utilisation** : Fallback pour tous les templates sans injecteur spécifique

**Spécificités** :
- Injection automatique des credentials IMAP, SMTP, OpenRouter
- Support des credentials personnalisés (Airtable, Notion, PostgreSQL, etc.)
- Génération de webhooks uniques
- Gestion des Schedule Triggers

---

## Système de Déploiements

### Architecture

Le système de déploiements permet d'avoir des déploiements spécifiques pour chaque template, tout en gardant un déploiement générique comme fallback.

### Structure

```
backend/services/deployments/
├── index.js                    # Router vers les déploiements spécifiques
├── deploymentUtils.js          # Fonctions utilitaires partagées
├── genericDeployment.js        # Déploiement générique (fallback)
├── gmailTriDeployment.js       # Déploiement pour "GMAIL Tri"
├── cvAnalysisDeployment.js     # Déploiement pour "CV Analysis"
├── pdfAnalysisDeployment.js    # Déploiement pour "PDF Analysis"
├── resumeEmailDeployment.js    # Déploiement pour "Résume Email"
├── imapTriDeployment.js        # Déploiement pour "IMAP Tri"
└── microsoftTriDeployment.js   # Déploiement pour "Microsoft Tri"
```

### Fonctionnement

#### Routing Automatique

Le fichier `deployments/index.js` route automatiquement vers le déploiement approprié selon :
1. **Template ID** (priorité)
2. **Template Name** (fallback)

Si aucun déploiement spécifique n'est trouvé, le déploiement générique (`genericDeployment.js`) est utilisé.

#### Mapping des Templates

Les templates sont mappés dans `deployments/index.js` :

```javascript
const TEMPLATE_DEPLOYMENTS = {
  // GMAIL Tri Automatique Boite Email
  '5114f297-e56e-4fec-be2b-1afbb5ea8619': require('./gmailTriDeployment'),
  'GMAIL Tri Automatique Boite Email': require('./gmailTriDeployment'),
  
  // Template fonctionnel résume email
  '6ff57a3c-c9a0-40ec-88c0-7e25ef031cb0': require('./resumeEmailDeployment'),
  'Template fonctionnel résume email': require('./resumeEmailDeployment'),
  
  // PDF Analysis Complete
  '132d04c8-e36a-4dbd-abac-21fa8280650e': require('./pdfAnalysisDeployment'),
  'PDF Analysis Complete': require('./pdfAnalysisDeployment'),
  
  // CV Analysis and Candidate Evaluation
  'aa3ba641-9bfb-429c-8b42-506d4f33ff40': require('./cvAnalysisDeployment'),
  'CV Analysis and Candidate Evaluation': require('./cvAnalysisDeployment'),
  
  // IMAP Tri Automatique BAL
  'c1bd6bd6-8a2b-4beb-89ee-1cd734a907a2': require('./imapTriDeployment'),
  'IMAP Tri Automatique BAL': require('./imapTriDeployment'),
  
  // Microsoft Tri Automatique BAL
  'a3b5ba35-aeea-48f4-83d7-34e964a6a8b6': require('./microsoftTriDeployment'),
  'Microsoft Tri Automatique BAL': require('./microsoftTriDeployment'),
};
```

### Processus de Déploiement

Chaque déploiement suit ce processus :

1. **Parser le JSON du template**
2. **Définir le nom du workflow** (`{template.name} - {userEmail}`)
3. **Injecter les credentials** (via le router d'injecteurs)
4. **Préparer le payload pour n8n**
5. **Vérifier qu'aucun placeholder n'est présent**
6. **Supprimer les workflows existants** (AVANT de créer le nouveau)
7. **Créer le workflow dans n8n**
8. **Mettre à jour le workflow** avec les credentials (si nécessaire)
9. **Activer le workflow** automatiquement
10. **Enregistrer dans user_workflows**
11. **Sauvegarder les credentials créés**

### Fonctions Utilitaires (`deploymentUtils.js`)

#### `cleanSettings(settings)`
Nettoie l'objet settings pour n8n (n'accepte que `{}` lors de la création).

#### `verifyNoPlaceholders(workflowPayload)`
Vérifie qu'aucun placeholder n'est présent dans le payload avant l'envoi à n8n.

#### `createWorkflowInN8n(workflowPayload)`
Crée le workflow dans n8n via l'API.

#### `updateWorkflowInN8n(workflowId, injectedWorkflow)`
Met à jour le workflow dans n8n avec les credentials.

#### `activateWorkflow(workflowId)`
Active le workflow dans n8n avec validation et retry.

#### `cleanupExistingWorkflows(userId, templateId)`
Supprime les workflows existants pour cet utilisateur et ce template (AVANT la création du nouveau).

#### `saveWorkflowCredentials(userWorkflowId, injectionResult, userEmail)`
Sauvegarde les credentials créés dans `workflow_credentials` pour permettre le nettoyage.

---

## Bonnes Pratiques

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
const backendUrl = config.app.backendUrl; // Au lieu de 'http://localhost:3004'
const n8nUrl = config.n8n.url; // Au lieu de 'http://localhost:3004/api/n8n'
```

❌ **Ne pas hardcoder** les URLs (`localhost:3004`, etc.)

### Gestion des Secrets

✅ **Utiliser des variables d'environnement** :
```javascript
const password = getEnvWithDevFallback('DB_PASSWORD', 'dev-fallback', 'Description');
```

❌ **Ne pas hardcoder** les secrets en production

### Structure des Injecteurs

✅ **Format de retour standardisé** :
```javascript
return {
  workflow: injectedWorkflow,
  webhookPath: uniqueWebhookPath,
  createdCredentials: {
    imap: { id: '...', name: '...' },
    smtp: { id: '...', name: '...' }
  }
};
```

### Structure des Déploiements

✅ **Utiliser les fonctions utilitaires** :
```javascript
const deploymentUtils = require('./deploymentUtils');

// Au lieu de réimplémenter la logique
await deploymentUtils.cleanupExistingWorkflows(userId, template.id);
await deploymentUtils.createWorkflowInN8n(workflowPayload);
await deploymentUtils.activateWorkflow(deployedWorkflow.id);
```

---

## Ajouter un Nouveau Template

### Étape 1 : Créer l'Injecteur (si nécessaire)

1. **Créer le fichier injecteur** dans `backend/services/injectors/` :

```javascript
// backend/services/injectors/monTemplateInjector.js
const logger = require('../../utils/logger');
const { createImapCredential, createSmtpCredential } = require('../credentialInjector');

async function injectUserCredentials(workflow, userCredentials, userId, templateId, templateName) {
  logger.info('Injection des credentials pour mon template', { templateId, userId });
  
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

2. **Ajouter le mapping** dans `injectors/index.js` :

```javascript
const TEMPLATE_INJECTORS = {
  // ... mappings existants
  'nouveau-template-id': require('./monTemplateInjector'),
  'Nouveau Template Name': require('./monTemplateInjector'),
};
```

### Étape 2 : Créer le Déploiement (si nécessaire)

1. **Créer le fichier de déploiement** dans `backend/services/deployments/` :

```javascript
// backend/services/deployments/monTemplateDeployment.js
const monTemplateInjector = require('../injectors/monTemplateInjector');
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
  const injectionResult = await monTemplateInjector.injectUserCredentials(
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

2. **Ajouter le mapping** dans `deployments/index.js` :

```javascript
const TEMPLATE_DEPLOYMENTS = {
  // ... mappings existants
  'nouveau-template-id': require('./monTemplateDeployment'),
  'Nouveau Template Name': require('./monTemplateDeployment'),
};
```

### Étape 3 : Tester

1. **Tester l'injection** des credentials
2. **Tester le déploiement** complet
3. **Vérifier** que le workflow est actif dans n8n
4. **Vérifier** que les credentials sont correctement injectés

---

## Troubleshooting

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
1. Vérifier que l'utilisateur a bien connecté son compte OAuth (Google/Microsoft)
2. Vérifier que les credentials sont bien dans la table `oauth_credentials`
3. Vérifier les logs pour identifier le problème

### Problème : Workflow existant non supprimé

**Symptôme** : Plusieurs workflows pour le même template et utilisateur

**Solution** :
1. Vérifier que `cleanupExistingWorkflows()` est appelé AVANT la création
2. Vérifier que la fonction supprime bien les workflows dans n8n et la BDD
3. Vérifier les logs pour les erreurs de suppression

---

## Notes Importantes

### Ordre des Opérations

⚠️ **IMPORTANT** : Les workflows existants doivent être supprimés **AVANT** de créer le nouveau workflow. Sinon, il y a un risque de supprimer le nouveau workflow.

### Format des Credentials

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

---

*Documentation créée le 2025-01-XX*  
*Dernière mise à jour : 2025-01-XX*

