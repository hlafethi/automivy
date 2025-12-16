// Système de routing vers les injecteurs spécifiques par template
// Si aucun injecteur spécifique n'est trouvé, utilise l'injecteur générique
//
// ⚠️ IMPORTANT: Les mappings sont maintenant centralisés dans backend/config/templateMappings.js
// Pour ajouter un nouveau template, modifiez uniquement ce fichier de configuration.

const genericInjector = require('../credentialInjector');
const logger = require('../../utils/logger');
const { buildInjectorMappings, findTemplateConfig } = require('../../config/templateMappings');

// Construire les mappings depuis la configuration centralisée
const TEMPLATE_INJECTORS = buildInjectorMappings();

// Alias supplémentaire pour le webhook path CV Analysis
TEMPLATE_INJECTORS['cv-analysis-evaluation'] = require('./cvAnalysisInjector');

/**
 * Route vers l'injecteur approprié selon le template
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  logger.debug('Routing vers l\'injecteur approprié', {
    templateId,
    templateName,
    userId
  });
  
  // Chercher l'injecteur spécifique par ID (priorité)
  let specificInjector = null;
  if (templateId && TEMPLATE_INJECTORS[templateId]) {
    specificInjector = TEMPLATE_INJECTORS[templateId];
    logger.debug('Injecteur spécifique trouvé par ID', { templateId });
  }
  
  // Si pas trouvé par ID, chercher par nom exact (fallback)
  if (!specificInjector && templateName && TEMPLATE_INJECTORS[templateName]) {
    specificInjector = TEMPLATE_INJECTORS[templateName];
    logger.debug('Injecteur spécifique trouvé par nom exact', { templateName });
  }
  
  // Si pas trouvé par nom exact, chercher par pattern via la configuration centralisée
  if (!specificInjector && templateName) {
    const config = findTemplateConfig(templateId, templateName);
    if (config) {
      const path = require('path');
      const injectorsDir = __dirname;
      const injectorFileName = config.injector.replace('./', '');
      const injectorPath = path.join(injectorsDir, injectorFileName);
      try {
        specificInjector = require(injectorPath);
        logger.debug('Injecteur trouvé par pattern', { 
          templateName,
          injector: config.injector
        });
      } catch (err) {
        logger.warn('Erreur lors du chargement de l\'injecteur par pattern', {
          templateName,
          injector: config.injector,
          error: err.message
        });
      }
    }
  }
  
  // Si un injecteur spécifique est trouvé, l'utiliser
  if (specificInjector && specificInjector.injectUserCredentials) {
    logger.info('Utilisation de l\'injecteur spécifique', { templateId, templateName });
    return await specificInjector.injectUserCredentials(workflow, userCredentials, userId, templateId, templateName);
  }
  
  // Sinon, utiliser l'injecteur générique
  logger.info('Aucun injecteur spécifique trouvé, utilisation de l\'injecteur générique', { templateId, templateName });
  return await genericInjector.injectUserCredentials(workflow, userCredentials, userId, templateId);
}

module.exports = { injectUserCredentials };

