// Système de routing vers les déploiements spécifiques par template
// Si aucun déploiement spécifique n'est trouvé, utilise le déploiement générique

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
 * @param {Object} template - Template de workflow
 * @param {Object} credentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} userEmail - Email de l'utilisateur
 * @returns {Object} Résultat du déploiement
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
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
    return await specificDeployment.deployWorkflow(template, credentials, userId, userEmail);
  }
  
  // Sinon, utiliser le déploiement générique
  console.log('🔧 [DeploymentRouter] Aucun déploiement spécifique trouvé, utilisation du déploiement générique');
  return await genericDeployment.deployWorkflow(template, credentials, userId, userEmail);
}

module.exports = { deployWorkflow };

