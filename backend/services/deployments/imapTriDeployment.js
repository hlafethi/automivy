// Déploiement spécifique pour "IMAP Tri Automatique BAL"
// Utilise la logique générique mais peut être étendu avec des vérifications spécifiques

const genericDeployment = require('./genericDeployment');

/**
 * Déploie le workflow "IMAP Tri" avec sa logique spécifique
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  console.log('🚀 [IMAPTriDeployment] Déploiement spécifique du workflow IMAP Tri...');
  
  // Pour l'instant, utiliser le déploiement générique
  // Cette fonction peut être étendue avec des vérifications spécifiques au template IMAP Tri
  // Par exemple :
  // - Vérifier que les credentials IMAP sont bien configurés
  // - Vérifier les connexions spécifiques au workflow IMAP
  // - Ajouter des validations spécifiques
  
  return await genericDeployment.deployWorkflow(template, credentials, userId, userEmail);
}

module.exports = { deployWorkflow };

