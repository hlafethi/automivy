// Système de routing vers les déploiements spécifiques par template
// Si aucun déploiement spécifique n'est trouvé, utilise le déploiement générique
// 
// ⚠️ IMPORTANT: Les mappings sont maintenant centralisés dans backend/config/templateMappings.js
// Pour ajouter un nouveau template, modifiez uniquement ce fichier de configuration.

const genericDeployment = require('./genericDeployment');
const logger = require('../../utils/logger');
const { buildDeploymentMappings, findTemplateConfig } = require('../../config/templateMappings');

// Construire les mappings depuis la configuration centralisée
const TEMPLATE_DEPLOYMENTS = buildDeploymentMappings();

/**
 * Route vers le déploiement approprié selon le template
 * @param {Object} template - Template de workflow
 * @param {Object} credentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} userEmail - Email de l'utilisateur
 * @returns {Object} Résultat du déploiement
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  logger.debug('Routing vers le déploiement approprié', { 
    templateId: template.id,
    templateName: template.name
  });
  
  // Chercher le déploiement spécifique par ID (priorité)
  let specificDeployment = null;
  if (template.id && TEMPLATE_DEPLOYMENTS[template.id]) {
    specificDeployment = TEMPLATE_DEPLOYMENTS[template.id];
    logger.debug('Déploiement spécifique trouvé par ID', { templateId: template.id });
  }
  
  // Si pas trouvé par ID, chercher par nom exact (fallback)
  if (!specificDeployment && template.name && TEMPLATE_DEPLOYMENTS[template.name]) {
    specificDeployment = TEMPLATE_DEPLOYMENTS[template.name];
    logger.debug('Déploiement spécifique trouvé par nom exact', { templateName: template.name });
  }
  
  // Si pas trouvé par nom exact, chercher par pattern via la configuration centralisée
  if (!specificDeployment && template.name) {
    const config = findTemplateConfig(template.id, template.name);
    if (config) {
      const path = require('path');
      const deploymentsDir = __dirname;
      const deploymentFileName = config.deployment.replace('./', '');
      const deploymentPath = path.join(deploymentsDir, deploymentFileName);
      try {
        specificDeployment = require(deploymentPath);
        logger.debug('Déploiement trouvé par pattern', { 
          templateName: template.name,
          deployment: config.deployment
        });
      } catch (err) {
        logger.warn('Erreur lors du chargement du déploiement par pattern', {
          templateName: template.name,
          deployment: config.deployment,
          error: err.message
        });
      }
    }
  }
  
  // Si un déploiement spécifique est trouvé, l'utiliser
  if (specificDeployment && specificDeployment.deployWorkflow) {
    logger.info('Utilisation du déploiement spécifique', { templateId: template.id });
    return await specificDeployment.deployWorkflow(template, credentials, userId, userEmail);
  }
  
  // Sinon, utiliser le déploiement générique
  logger.info('Aucun déploiement spécifique trouvé, utilisation du déploiement générique', { templateId: template.id });
  return await genericDeployment.deployWorkflow(template, credentials, userId, userEmail);
}

module.exports = { deployWorkflow };

