// Déploiement spécifique pour "CV Analysis and Candidate Evaluation"
// Utilise la logique générique mais peut être étendu avec des vérifications spécifiques

const genericDeployment = require('./genericDeployment');

/**
 * Déploie le workflow "CV Analysis" avec sa logique spécifique
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  console.log('🚀 [CVAnalysisDeployment] Déploiement spécifique du workflow CV Analysis...');
  
  // Pour l'instant, utiliser le déploiement générique
  // Cette fonction peut être étendue avec des vérifications spécifiques au template CV Analysis
  // Par exemple :
  // - Vérifier que le webhook est correctement configuré
  // - Vérifier les connexions LangChain spécifiques
  // - Ajouter des validations spécifiques
  
  return await genericDeployment.deployWorkflow(template, credentials, userId, userEmail);
}

module.exports = { deployWorkflow };

