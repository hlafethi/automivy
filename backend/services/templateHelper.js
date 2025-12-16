/**
 * Service d'aide pour faciliter l'ajout et la gestion de nouveaux templates
 * 
 * Ce service fournit des fonctions utilitaires pour :
 * - Vérifier si un template nécessite un déploiement/injecteur spécifique
 * - Obtenir le type de modal approprié
 * - Générer des configurations de template
 */

const { 
  findTemplateConfig, 
  getModalType, 
  requiresSmartDeployModal,
  TEMPLATE_CONFIGS 
} = require('../../config/templateMappings');
const logger = require('../utils/logger');

/**
 * Vérifie si un template nécessite SmartDeployModal
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {boolean} true si SmartDeployModal est requis
 */
function shouldUseSmartDeployModal(templateId, templateName) {
  return requiresSmartDeployModal(templateId, templateName);
}

/**
 * Obtient le type de modal pour un template
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {string} Type de modal
 */
function getTemplateModalType(templateId, templateName) {
  return getModalType(templateId, templateName);
}

/**
 * Obtient la configuration complète d'un template
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object|null} Configuration du template ou null
 */
function getTemplateConfig(templateId, templateName) {
  return findTemplateConfig(templateId, templateName);
}

/**
 * Liste tous les templates configurés
 * @returns {Array} Liste des configurations de templates
 */
function listConfiguredTemplates() {
  return TEMPLATE_CONFIGS.map((config, index) => ({
    index: index + 1,
    templateIds: config.templateIds,
    templateNames: config.templateNames,
    namePatterns: config.namePatterns,
    deployment: config.deployment,
    injector: config.injector,
    modal: config.modal,
    description: config.description
  }));
}

/**
 * Génère un template de configuration pour un nouveau template
 * @param {Object} options - Options pour le nouveau template
 * @returns {string} Code de configuration à ajouter dans templateMappings.js
 */
function generateTemplateConfig(options) {
  const {
    templateId,
    templateName,
    namePatterns = [],
    deploymentName,
    injectorName,
    useSmartDeploy = true,
    description = ''
  } = options;
  
  const templateIds = templateId ? [templateId] : [];
  const templateNames = templateName ? [templateName] : [];
  const modal = useSmartDeploy ? 'SmartDeployModal' : 'CreateAutomationModal';
  
  return `
  // ${description || templateName}
  {
    templateIds: ${JSON.stringify(templateIds)},
    templateNames: ${JSON.stringify(templateNames)},
    namePatterns: ${JSON.stringify(namePatterns)},
    deployment: './${deploymentName}',
    injector: './${injectorName}',
    modal: '${modal}',
    description: '${description || templateName}'
  },`;
}

/**
 * Vérifie si un template a une configuration spécifique
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {boolean} true si le template a une configuration spécifique
 */
function hasSpecificConfiguration(templateId, templateName) {
  return findTemplateConfig(templateId, templateName) !== null;
}

/**
 * Obtient des informations de débogage sur le routing d'un template
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Informations de débogage
 */
function getTemplateRoutingInfo(templateId, templateName) {
  const config = findTemplateConfig(templateId, templateName);
  
  return {
    templateId,
    templateName,
    hasSpecificConfig: config !== null,
    config: config ? {
      deployment: config.deployment,
      injector: config.injector,
      modal: config.modal,
      description: config.description
    } : null,
    modalType: getModalType(templateId, templateName),
    requiresSmartDeploy: requiresSmartDeployModal(templateId, templateName)
  };
}

module.exports = {
  shouldUseSmartDeployModal,
  getTemplateModalType,
  getTemplateConfig,
  listConfiguredTemplates,
  generateTemplateConfig,
  hasSpecificConfiguration,
  getTemplateRoutingInfo
};

