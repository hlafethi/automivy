# 🏗️ Architecture des Déploiements Spécifiques par Template

## 📊 État Actuel

### ✅ Ce qui existe déjà

**Système d'injecteurs spécifiques** (`backend/services/injectors/`) :
- ✅ `gmailTriInjector.js` - Injection pour "GMAIL Tri Automatique"
- ✅ `cvAnalysisInjector.js` - Injection pour "CV Analysis"
- ✅ `pdfAnalysisInjector.js` - Injection pour "PDF Analysis"
- ✅ `resumeEmailInjector.js` - Injection pour "Résume Email"
- ✅ `imapTriInjector.js` - Injection pour "IMAP Tri"
- ✅ `index.js` - Router vers le bon injecteur

**Problème** : Les injecteurs gèrent **seulement l'injection des credentials**, mais `smartDeploy.js` (1670 lignes) gère **tout le reste** :
- Création du workflow dans n8n
- Mise à jour du workflow
- Activation automatique
- Vérifications multiples (LangChain, webhooks, etc.)
- Suppression des workflows existants
- Sauvegarde dans `user_workflows`

---

## 🎯 Architecture Proposée

### Structure des Déploiements Spécifiques

```
backend/services/deployments/
├── index.js                    # Router vers les déploiements spécifiques
├── gmailTriDeployment.js       # Déploiement complet pour "GMAIL Tri Automatique"
├── cvAnalysisDeployment.js     # Déploiement complet pour "CV Analysis"
├── pdfAnalysisDeployment.js    # Déploiement complet pour "PDF Analysis"
├── resumeEmailDeployment.js    # Déploiement complet pour "Résume Email"
├── imapTriDeployment.js        # Déploiement complet pour "IMAP Tri"
├── genericDeployment.js        # Déploiement générique (fallback)
└── README.md                   # Documentation
```

### Fonctionnement

Chaque fichier de déploiement gère **tout le processus** pour son template :
1. Injection des credentials (via l'injecteur spécifique)
2. Création du workflow dans n8n
3. Mise à jour du workflow
4. Activation automatique
5. Vérifications spécifiques au template
6. Sauvegarde dans `user_workflows`

---

## 📝 Exemple : `gmailTriDeployment.js`

```javascript
const { injectUserCredentials } = require('../injectors');
const config = require('../../config');
const db = require('../../database');

/**
 * Déploie le workflow "GMAIL Tri Automatique" avec toute sa logique spécifique
 */
async function deployGmailTriWorkflow(template, credentials, userId) {
  console.log('🚀 [GmailTriDeployment] Déploiement du workflow Gmail Tri...');
  
  // 1. Injection des credentials (via l'injecteur spécifique)
  const injectionResult = await injectUserCredentials(
    template.json,
    credentials,
    userId,
    template.id,
    template.name
  );
  
  // 2. Préparation du workflow pour n8n
  const workflowName = `${template.name} - ${req.user.email}`;
  const workflowPayload = {
    name: workflowName,
    nodes: injectionResult.workflow.nodes,
    connections: injectionResult.workflow.connections,
    settings: {} // n8n n'accepte que {} lors de la création
  };
  
  // 3. Création du workflow dans n8n
  const deployResponse = await fetch(`${config.n8n.url}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': config.n8n.apiKey
    },
    body: JSON.stringify(workflowPayload)
  });
  
  if (!deployResponse.ok) {
    throw new Error(`Erreur création workflow: ${await deployResponse.text()}`);
  }
  
  const deployedWorkflow = await deployResponse.json();
  
  // 4. Mise à jour avec les credentials (si nécessaire)
  // ... logique spécifique au template Gmail Tri
  
  // 5. Activation automatique
  await activateWorkflow(deployedWorkflow.id);
  
  // 6. Vérifications spécifiques au template Gmail Tri
  await verifyGmailTriWorkflow(deployedWorkflow);
  
  // 7. Suppression des workflows existants (si nécessaire)
  await cleanupExistingWorkflows(userId, template.id);
  
  // 8. Sauvegarde dans user_workflows
  const userWorkflow = await db.createUserWorkflow({
    userId: userId,
    templateId: template.id,
    n8nWorkflowId: deployedWorkflow.id,
    name: workflowName,
    isActive: true,
    webhookPath: injectionResult.webhookPath
  });
  
  // 9. Sauvegarde des credentials créés
  if (injectionResult.createdCredentials) {
    await db.saveWorkflowCredentials(userWorkflow.id, injectionResult.createdCredentials);
  }
  
  return {
    success: true,
    workflow: {
      id: userWorkflow.id,
      name: userWorkflow.name,
      n8n_workflow_id: deployedWorkflow.id,
      status: userWorkflow.status
    }
  };
}

module.exports = { deployGmailTriWorkflow };
```

---

## 🔀 Router : `deployments/index.js`

```javascript
const genericDeployment = require('./genericDeployment');

// Mapping des templates vers leurs déploiements spécifiques
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
};

/**
 * Route vers le déploiement approprié selon le template
 */
async function deployWorkflow(template, credentials, userId) {
  console.log('🔀 [DeploymentRouter] Routing vers le déploiement approprié...');
  console.log('🔀 [DeploymentRouter] Template ID:', template.id);
  console.log('🔀 [DeploymentRouter] Template Name:', template.name);
  
  // Chercher le déploiement spécifique par ID (priorité)
  let specificDeployment = null;
  if (template.id && TEMPLATE_DEPLOYMENTS[template.id]) {
    specificDeployment = TEMPLATE_DEPLOYMENTS[template.id];
    console.log('✅ [DeploymentRouter] Déploiement spécifique trouvé par ID:', template.id);
  }
  
  // Si pas trouvé par ID, chercher par nom (fallback)
  if (!specificDeployment && template.name && TEMPLATE_DEPLOYMENTS[template.name]) {
    specificDeployment = TEMPLATE_DEPLOYMENTS[template.name];
    console.log('✅ [DeploymentRouter] Déploiement spécifique trouvé par nom:', template.name);
  }
  
  // Si un déploiement spécifique est trouvé, l'utiliser
  if (specificDeployment && specificDeployment.deployWorkflow) {
    console.log('🎯 [DeploymentRouter] Utilisation du déploiement spécifique');
    return await specificDeployment.deployWorkflow(template, credentials, userId);
  }
  
  // Sinon, utiliser le déploiement générique
  console.log('🔧 [DeploymentRouter] Aucun déploiement spécifique trouvé, utilisation du déploiement générique');
  return await genericDeployment.deployWorkflow(template, credentials, userId);
}

module.exports = { deployWorkflow };
```

---

## 🔄 Refactorisation de `smartDeploy.js`

**Avant** (1670 lignes) :
```javascript
router.post('/deploy', authenticateToken, async (req, res) => {
  // 1500+ lignes de logique de déploiement...
});
```

**Après** (50 lignes) :
```javascript
const { deployWorkflow } = require('../services/deployments');

router.post('/deploy', authenticateToken, async (req, res) => {
  try {
    const { workflowId, credentials } = req.body;
    
    if (!workflowId || !credentials) {
      return res.status(400).json({ error: 'Workflow ID et credentials requis' });
    }
    
    // Récupérer le template
    const template = await db.getTemplateByIdForUser(workflowId, req.user.id);
    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    // Déployer via le router (qui appelle le bon déploiement spécifique)
    const result = await deployWorkflow(template, credentials, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [SmartDeploy] Erreur déploiement:', error);
    res.status(500).json({ 
      error: 'Erreur lors du déploiement du workflow',
      details: error.message 
    });
  }
});
```

---

## ✅ Avantages

1. **Maintenabilité** : Chaque template a son propre fichier de déploiement
2. **Isolation** : Modifications d'un template n'affectent pas les autres
3. **Flexibilité** : Logique spécifique par template (vérifications, activation, etc.)
4. **Lisibilité** : Code beaucoup plus simple et clair
5. **Extensibilité** : Facile d'ajouter de nouveaux déploiements
6. **Testabilité** : Chaque déploiement peut être testé indépendamment

---

## 📋 Plan de Migration

### Étape 1 : Créer la structure
1. Créer `backend/services/deployments/`
2. Créer `index.js` (router)
3. Créer `genericDeployment.js` (fallback)

### Étape 2 : Migrer les déploiements
1. Extraire la logique de `smartDeploy.js` pour chaque template
2. Créer un fichier de déploiement spécifique par template
3. Tester chaque déploiement individuellement

### Étape 3 : Refactoriser `smartDeploy.js`
1. Simplifier `smartDeploy.js` pour qu'il utilise le router
2. Supprimer le code redondant
3. Tester le déploiement complet

### Étape 4 : Documentation
1. Documenter chaque déploiement spécifique
2. Mettre à jour le README
3. Ajouter des exemples

---

## 🎯 Prochaines Étapes

Souhaitez-vous que je :
1. ✅ Crée la structure `backend/services/deployments/` ?
2. ✅ Crée le router `index.js` ?
3. ✅ Crée le déploiement générique `genericDeployment.js` ?
4. ✅ Migre un premier template (ex: Gmail Tri) pour servir d'exemple ?
5. ✅ Refactorise `smartDeploy.js` pour utiliser le nouveau système ?

---

*Document créé le 2025-08-07*

