# 📝 Guide : Ajouter un Nouveau Template

Ce guide explique comment ajouter un nouveau template avec son propre mode de déploiement et injecteur, en utilisant le système centralisé de configuration.

## 🎯 Vue d'ensemble

Le système utilise une configuration centralisée dans `backend/config/templateMappings.js` qui mappe chaque template vers :
- Son **déploiement spécifique** (ou générique)
- Son **injecteur spécifique** (ou générique)
- Son **type de modal** (SmartDeployModal ou CreateAutomationModal)

## 📋 Étapes pour Ajouter un Nouveau Template

### 1. Créer le Déploiement Spécifique (si nécessaire)

Si votre template nécessite une logique de déploiement spécifique, créez un fichier dans `backend/services/deployments/` :

```javascript
// backend/services/deployments/monTemplateDeployment.js
const monTemplateInjector = require('../injectors/monTemplateInjector');
const db = require('../../database');
const deploymentUtils = require('./deploymentUtils');
const logger = require('../../utils/logger');

async function deployWorkflow(template, credentials, userId, userEmail) {
  logger.info('Déploiement spécifique du workflow Mon Template', {
    templateName: template.name,
    templateId: template.id,
    userEmail,
    userId
  });
  
  // 1. Parser le JSON du template
  let workflowJson;
  try {
    workflowJson = typeof template.json === 'string'
      ? JSON.parse(template.json)
      : template.json;
  } catch (parseErr) {
    throw new Error(`JSON du workflow invalide: ${parseErr.message}`);
  }
  
  if (!workflowJson) {
    throw new Error('Template JSON manquant');
  }
  
  // 2. Définir le nom du workflow
  const workflowName = `${template.name} - ${userEmail}`;
  
  // 3. Injecter les credentials avec l'injecteur spécifique
  logger.debug('Injection des credentials avec monTemplateInjector', { templateId: template.id });
  const injectionResult = await monTemplateInjector.injectUserCredentials(
    workflowJson, 
    credentials, 
    userId, 
    template.id, 
    template.name
  );
  
  if (!injectionResult || !injectionResult.workflow) {
    throw new Error('Injection échouée: injectionResult ou workflow manquant');
  }
  
  const injectedWorkflow = injectionResult.workflow;
  const webhookPath = injectionResult.webhookPath;
  injectedWorkflow.name = workflowName;
  
  // 4. Préparer le payload pour n8n
  const workflowPayload = {
    name: workflowName,
    nodes: injectedWorkflow.nodes,
    connections: injectedWorkflow.connections,
    settings: deploymentUtils.cleanSettings(injectedWorkflow.settings)
  };
  
  // 5. Vérifier qu'aucun placeholder n'est présent
  deploymentUtils.verifyNoPlaceholders(workflowPayload);
  
  // 6. Supprimer les workflows existants AVANT de créer le nouveau
  await deploymentUtils.cleanupExistingWorkflows(userId, template.id);
  
  // 7. Créer le workflow dans n8n
  const deployedWorkflow = await deploymentUtils.createWorkflowInN8n(workflowPayload);
  
  // 8. Mettre à jour le workflow avec les credentials
  const updatedWorkflow = await deploymentUtils.updateWorkflowInN8n(deployedWorkflow.id, injectedWorkflow);
  if (updatedWorkflow) {
    Object.assign(deployedWorkflow, updatedWorkflow);
  }
  
  // 9. Activer le workflow
  const workflowActivated = await deploymentUtils.activateWorkflow(deployedWorkflow.id);
  
  if (!workflowActivated) {
    logger.warn('Le workflow n\'a pas pu être activé automatiquement', {
      workflowId: deployedWorkflow.id,
      templateId: template.id
    });
  }
  
  // 10. Enregistrer dans user_workflows
  const userWorkflow = await db.createUserWorkflow({
    userId: userId,
    templateId: template.id,
    n8nWorkflowId: deployedWorkflow.id,
    n8nCredentialId: null,
    name: workflowName,
    isActive: true,
    webhookPath: webhookPath
  });
  
  // 11. Sauvegarder les credentials créés
  await deploymentUtils.saveWorkflowCredentials(userWorkflow.id, injectionResult, userEmail);
  
  logger.info('Workflow Mon Template déployé avec succès', {
    workflowId: userWorkflow.id,
    n8nWorkflowId: deployedWorkflow.id,
    templateId: template.id,
    userEmail
  });
  
  return {
    success: true,
    message: 'Workflow Mon Template déployé avec succès',
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

**Note** : Si votre template peut utiliser le déploiement générique, vous pouvez sauter cette étape.

### 2. Créer l'Injecteur Spécifique (si nécessaire)

Si votre template nécessite une logique d'injection de credentials spécifique, créez un fichier dans `backend/services/injectors/` :

```javascript
// backend/services/injectors/monTemplateInjector.js
const logger = require('../../utils/logger');

async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  logger.info('🔧 [MonTemplateInjector] Injection spécifique pour Mon Template...');
  
  // Votre logique d'injection spécifique ici
  // ...
  
  return {
    workflow: workflow,
    webhookPath: webhookPath, // Si applicable
    credentialsCreated: [] // Liste des credentials créés
  };
}

module.exports = { injectUserCredentials };
```

**Note** : Si votre template peut utiliser l'injecteur générique, vous pouvez sauter cette étape.

### 3. Ajouter la Configuration dans templateMappings.js

Modifiez `backend/config/templateMappings.js` et ajoutez votre configuration dans le tableau `TEMPLATE_CONFIGS` :

```javascript
// Ajouter cette entrée dans TEMPLATE_CONFIGS
{
  templateIds: ['votre-template-id-uuid'],           // ID(s) du template
  templateNames: ['Nom Exact du Template'],         // Nom(s) exact(s)
  namePatterns: ['pattern1', 'pattern2'],              // Patterns pour matching (optionnel)
  deployment: './monTemplateDeployment',             // Chemin vers le déploiement
  injector: './monTemplateInjector',                 // Chemin vers l'injecteur
  modal: 'SmartDeployModal',                         // Type de modal
  description: 'Description de votre template'       // Description
}
```

**Exemple complet** :

```javascript
// Mon Nouveau Template
{
  templateIds: ['12345678-1234-1234-1234-123456789abc'],
  templateNames: ['Mon Nouveau Template'],
  namePatterns: ['mon template', 'nouveau'],
  deployment: './monTemplateDeployment',
  injector: './monTemplateInjector',
  modal: 'SmartDeployModal',
  description: 'Template pour faire quelque chose de spécifique'
}
```

### 4. Mettre à Jour le Frontend (si nécessaire)

Si votre template nécessite `SmartDeployModal`, mettez à jour `src/services/templateModalService.ts` pour ajouter la détection :

```typescript
// Dans shouldUseSmartDeployModal()
const isMonTemplate = template.id === 'votre-template-id' ||
                      templateNameLower.includes('mon template') ||
                      templateDescLower.includes('mon template');

return isCV || isEmailWorkflow || ... || isMonTemplate;
```

**Note** : Cette étape est optionnelle si vous utilisez uniquement les patterns dans la configuration.

### 5. Vérifier la Configuration

Au démarrage du serveur, la validation automatique vérifiera que :
- Les fichiers de déploiement existent
- Les fichiers d'injecteur existent
- Les fonctions requises sont exportées

Si des erreurs apparaissent, corrigez-les avant de continuer.

## 🔍 Exemples de Configurations

### Template avec Déploiement et Injecteur Spécifiques

```javascript
{
  templateIds: ['abc-123'],
  templateNames: ['Template Complexe'],
  namePatterns: ['complexe'],
  deployment: './complexeDeployment',
  injector: './complexeInjector',
  modal: 'SmartDeployModal',
  description: 'Template avec logique complexe'
}
```

### Template Utilisant le Déploiement Générique

```javascript
{
  templateIds: ['def-456'],
  templateNames: ['Template Simple'],
  namePatterns: ['simple'],
  deployment: './genericDeployment',  // Utilise le générique
  injector: './genericInjector',     // Utilise le générique
  modal: 'CreateAutomationModal',
  description: 'Template simple sans logique spécifique'
}
```

### Template avec Pattern Matching

```javascript
{
  templateIds: [],
  templateNames: [],
  namePatterns: ['mon pattern'],  // Seuls les patterns sont utilisés
  deployment: './patternDeployment',
  injector: './patternInjector',
  modal: 'SmartDeployModal',
  description: 'Template détecté uniquement par pattern'
}
```

## ✅ Checklist

Avant de considérer votre nouveau template comme terminé :

- [ ] Fichier de déploiement créé (si nécessaire)
- [ ] Fichier d'injecteur créé (si nécessaire)
- [ ] Configuration ajoutée dans `templateMappings.js`
- [ ] Frontend mis à jour (si nécessaire)
- [ ] Validation au démarrage réussie
- [ ] Test du déploiement réussi
- [ ] Documentation mise à jour

## 🚨 Points d'Attention

1. **Cohérence des Noms** : Assurez-vous que les noms dans `templateNames` correspondent exactement aux noms dans la base de données.

2. **Patterns Sensibles à la Casse** : Les patterns sont convertis en minuscules pour la comparaison, mais soyez prudent avec les accents.

3. **Ordre de Priorité** : Le système cherche dans cet ordre :
   - Template ID
   - Template Name exact
   - Pattern matching
   - Déploiement/Injecteur générique

4. **Validation** : La validation au démarrage vérifie l'existence des fichiers, mais pas leur logique. Testez toujours manuellement.

## 📚 Ressources

- Configuration centralisée : `backend/config/templateMappings.js`
- Service d'aide : `backend/services/templateHelper.js`
- Service frontend : `src/services/templateModalService.ts`
- Documentation complète : `ANALYSE_MODES_DEPLOIEMENT_TEMPLATES.md`

