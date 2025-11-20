# 🏗️ Système de Déploiements Spécifiques par Template

## Architecture

Ce système permet d'avoir des déploiements spécifiques pour chaque template, tout en gardant un déploiement générique comme fallback.

## Structure

```
backend/services/deployments/
├── index.js                    # Router vers les déploiements spécifiques
├── genericDeployment.js         # Déploiement générique (fallback)
├── gmailTriDeployment.js       # Déploiement pour "GMAIL Tri Automatique"
├── cvAnalysisDeployment.js     # Déploiement pour "CV Analysis"
├── pdfAnalysisDeployment.js    # Déploiement pour "PDF Analysis"
├── resumeEmailDeployment.js    # Déploiement pour "Résume Email"
├── imapTriDeployment.js        # Déploiement pour "IMAP Tri"
└── README.md                   # Cette documentation
```

## Fonctionnement

### Routing Automatique

Le fichier `index.js` route automatiquement vers le déploiement approprié selon :
- **Template ID** (priorité)
- **Template Name** (fallback)

Si aucun déploiement spécifique n'est trouvé, le déploiement générique (`genericDeployment.js`) est utilisé.

### Mapping des Templates

Les templates sont mappés dans `index.js` :

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
};
```

## Déploiement Générique

Le fichier `genericDeployment.js` contient toute la logique commune de déploiement :

1. **Injection des credentials** (via le router d'injecteurs)
2. **Création du workflow dans n8n**
3. **Mise à jour du workflow** (si nécessaire)
4. **Activation automatique**
5. **Nettoyage des workflows existants**
6. **Sauvegarde dans user_workflows**
7. **Sauvegarde des credentials créés**

### Fonctions Utilitaires

- `cleanSettings()` : Nettoie l'objet settings pour n8n
- `verifyNoPlaceholders()` : Vérifie qu'aucun placeholder n'est présent
- `createWorkflowInN8n()` : Crée le workflow dans n8n
- `updateWorkflowInN8n()` : Met à jour le workflow avec les credentials
- `activateWorkflow()` : Active le workflow dans n8n
- `cleanupExistingWorkflows()` : Supprime les workflows existants
- `saveWorkflowCredentials()` : Sauvegarde les credentials créés

## Déploiements Spécifiques

Chaque déploiement spécifique peut :
- Utiliser le déploiement générique (par défaut)
- Ajouter des vérifications spécifiques au template
- Personnaliser la logique de déploiement
- Ajouter des validations spécifiques

### Exemple : `gmailTriDeployment.js`

```javascript
const genericDeployment = require('./genericDeployment');

async function deployWorkflow(template, credentials, userId, userEmail) {
  console.log('🚀 [GmailTriDeployment] Déploiement spécifique...');
  
  // Vérifications spécifiques au template Gmail Tri
  // Par exemple : vérifier que le credential Gmail OAuth2 est connecté
  
  // Utiliser le déploiement générique
  return await genericDeployment.deployWorkflow(template, credentials, userId, userEmail);
}

module.exports = { deployWorkflow };
```

## Ajouter un Nouveau Déploiement

1. **Créer le fichier de déploiement** dans `backend/services/deployments/`
   ```javascript
   // backend/services/deployments/monTemplateDeployment.js
   const genericDeployment = require('./genericDeployment');
   
   async function deployWorkflow(template, credentials, userId, userEmail) {
     // Logique spécifique du template (optionnelle)
     return await genericDeployment.deployWorkflow(template, credentials, userId, userEmail);
   }
   
   module.exports = { deployWorkflow };
   ```

2. **Ajouter le mapping** dans `index.js`
   ```javascript
   const TEMPLATE_DEPLOYMENTS = {
     // ... mappings existants
     'nouveau-template-id': require('./monTemplateDeployment'),
     'Nouveau Template Name': require('./monTemplateDeployment'),
   };
   ```

3. **Tester le déploiement** du template

## Avantages

✅ **Isolation** : Chaque template a sa propre logique de déploiement  
✅ **Maintenabilité** : Modifications d'un template n'affectent pas les autres  
✅ **Flexibilité** : Logique spécifique par template (vérifications, validations, etc.)  
✅ **Fallback** : Déploiement générique pour les templates sans déploiement spécifique  
✅ **Extensibilité** : Facile d'ajouter de nouveaux déploiements  
✅ **Code simplifié** : `smartDeploy.js` est passé de 1670 lignes à ~50 lignes

## Intégration avec les Injecteurs

Le système de déploiements utilise le système d'injecteurs existant (`backend/services/injectors/`) :
- Chaque déploiement appelle `injectUserCredentials()` via le router d'injecteurs
- Le router d'injecteurs route vers l'injecteur spécifique ou générique
- Les deux systèmes fonctionnent ensemble de manière modulaire

## Notes Importantes

- Les déploiements spécifiques peuvent étendre ou remplacer complètement la logique générique
- Le déploiement générique utilise `config.n8n.url` au lieu de `localhost:3004` (correction importante)
- Les workflows existants sont supprimés **AVANT** la création du nouveau (logique corrigée)
- Les credentials sont sauvegardés dans `workflow_credentials` pour permettre le nettoyage

---

*Documentation créée le 2025-08-07*

