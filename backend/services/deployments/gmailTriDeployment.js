// Déploiement spécifique pour "GMAIL Tri Automatique Boite Email"
// Utilise la logique générique mais peut être étendu avec des vérifications spécifiques

const genericDeployment = require('./genericDeployment');

/**
 * Déploie le workflow "GMAIL Tri Automatique" avec sa logique spécifique
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  console.log('🚀 [GmailTriDeployment] Déploiement spécifique du workflow Gmail Tri...');
  
  // Pour l'instant, utiliser le déploiement générique
  // Cette fonction peut être étendue avec des vérifications spécifiques au template Gmail Tri
  // Par exemple :
  // - Vérifier que le credential Gmail OAuth2 est bien connecté
  // - Vérifier les connexions spécifiques au workflow Gmail
  // - Ajouter des validations spécifiques
  
  return await genericDeployment.deployWorkflow(template, credentials, userId, userEmail);
}

module.exports = { deployWorkflow };

