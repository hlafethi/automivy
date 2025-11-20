// Déploiement spécifique pour "Template fonctionnel résume email"
// Utilise la logique générique mais peut être étendu avec des vérifications spécifiques

const genericDeployment = require('./genericDeployment');

/**
 * Déploie le workflow "Résume Email" avec sa logique spécifique
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  console.log('🚀 [ResumeEmailDeployment] Déploiement spécifique du workflow Résume Email...');
  
  // Pour l'instant, utiliser le déploiement générique
  // Cette fonction peut être étendue avec des vérifications spécifiques au template Résume Email
  // Par exemple :
  // - Vérifier que les credentials IMAP et SMTP sont bien configurés
  // - Vérifier les connexions LangChain
  // - Ajouter des validations spécifiques
  
  return await genericDeployment.deployWorkflow(template, credentials, userId, userEmail);
}

module.exports = { deployWorkflow };

