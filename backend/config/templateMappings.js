/**
 * Configuration centralisée des mappings de templates
 * 
 * Ce fichier centralise tous les mappings entre templates et leurs déploiements/injecteurs.
 * Pour ajouter un nouveau template, ajoutez simplement une entrée dans TEMPLATE_CONFIGS.
 * 
 * Structure d'une configuration :
 * {
 *   templateIds: ['id1', 'id2', ...],        // IDs du template (peut avoir plusieurs)
 *   templateNames: ['Nom 1', 'Nom 2', ...],   // Noms exacts du template
 *   namePatterns: ['pattern1', 'pattern2'],    // Patterns pour matching (optionnel)
 *   deployment: './deployments/nomDeployment', // Chemin relatif vers le déploiement
 *   injector: './injectors/nomInjector',      // Chemin relatif vers l'injecteur
 *   modal: 'SmartDeployModal',                // Type de modal à utiliser
 *   description: 'Description du template'   // Description pour documentation
 * }
 */

const path = require('path');

// Configuration de tous les templates
const TEMPLATE_CONFIGS = [
  // GMAIL Tri Automatique Boite Email
  {
    templateIds: ['5114f297-e56e-4fec-be2b-1afbb5ea8619'],
    templateNames: ['GMAIL Tri Automatique Boite Email'],
    namePatterns: ['gmail', 'tri'],
    deployment: './gmailTriDeployment',
    injector: './gmailTriInjector',
    modal: 'SmartDeployModal',
    description: 'Tri automatique des emails Gmail avec OAuth'
  },
  
  // Template fonctionnel résume email
  {
    templateIds: ['6ff57a3c-c9a0-40ec-88c0-7e25ef031cb0'],
    templateNames: ['Template fonctionnel résume email'],
    namePatterns: ['résume email', 'resume email'],
    deployment: './resumeEmailDeployment',
    injector: './resumeEmailInjector',
    modal: 'SmartDeployModal',
    description: 'Résumé automatique des emails'
  },
  
  // PDF Analysis Complete
  {
    templateIds: ['132d04c8-e36a-4dbd-abac-21fa8280650e'],
    templateNames: ['PDF Analysis Complete'],
    namePatterns: ['pdf'],
    deployment: './pdfAnalysisDeployment',
    injector: './pdfAnalysisInjector',
    modal: 'SmartDeployModal',
    description: 'Analyse IA des PDFs avec webhook unique'
  },
  
  // CV Analysis and Candidate Evaluation
  {
    templateIds: ['aa3ba641-9bfb-429c-8b42-506d4f33ff40'],
    templateNames: ['CV Analysis and Candidate Evaluation'],
    namePatterns: ['cv', 'candidat'],
    deployment: './cvAnalysisDeployment',
    injector: './cvAnalysisInjector',
    modal: 'SmartDeployModal',
    description: 'Analyse IA des CVs avec stockage conditionnel'
  },
  
  // IMAP Tri Automatique BAL
  {
    templateIds: ['c1bd6bd6-8a2b-4beb-89ee-1cd734a907a2'],
    templateNames: ['IMAP Tri Automatique BAL'],
    namePatterns: ['imap', 'tri'],
    deployment: './imapTriDeployment',
    injector: './imapTriInjector',
    modal: 'SmartDeployModal',
    description: 'Tri automatique des emails IMAP'
  },
  
  // Microsoft Tri Automatique BAL
  {
    templateIds: ['a3b5ba35-aeea-48f4-83d7-34e964a6a8b6'],
    templateNames: ['Microsoft Tri Automatique BAL'],
    namePatterns: ['microsoft', 'outlook'],
    deployment: './microsoftTriDeployment',
    injector: './microsoftTriInjector',
    modal: 'SmartDeployModal',
    description: 'Tri automatique des emails Microsoft/Outlook avec OAuth'
  },
  
  // Production Vidéo IA
  {
    templateIds: ['ndkuzYMKt4nRyRXy', '6a60e84e-b5c1-414d-9f27-5770bc438a64'],
    templateNames: ['Production Vidéo IA'],
    namePatterns: ['vidéo', 'video'],
    deployment: './videoProductionDeployment',
    injector: './videoProductionInjector',
    modal: 'SmartDeployModal',
    description: 'Production vidéo IA avec Google Drive et OpenRouter'
  },
  
  // Nextcloud Templates
  {
    templateIds: [],
    templateNames: ['Nextcloud File Sorting Automation', 'Nextcloud Tri Automatique', 'Nextcloud Sync'],
    namePatterns: ['nextcloud'],
    deployment: './nextcloudDeployment',
    injector: './nextcloudInjector',
    modal: 'SmartDeployModal',
    description: 'Tri et synchronisation automatique Nextcloud'
  },
  
  // Test MCP (Model Context Protocol)
  {
    templateIds: ['5916c2c3-d2f8-4895-8165-5048b367d16a'],
    templateNames: ['test mcp'],
    namePatterns: ['mcp', 'test mcp'],
    deployment: './mcpTestDeployment',
    injector: './mcpTestInjector',
    modal: 'SmartDeployModal',
    description: 'Template MCP avec Google OAuth (Sheets, Docs, Drive, Gmail)'
  },
  
  // LinkedIn Post Generator - Workflows LinkedIn
  {
    templateIds: [],
    templateNames: [
      'LinkedIn Post Generator - Principal',
      'LinkedIn Token Monitor - Surveillance Expiration',
      'LinkedIn OAuth Handler - Inscription & Reconnexion'
    ],
    namePatterns: ['linkedin', 'post generator', 'token monitor', 'oauth handler'],
    deployment: './linkedinPostDeployment',
    injector: './linkedinPostInjector',
    modal: 'SmartDeployModal',
    description: 'Automatisation LinkedIn : génération de posts IA, surveillance des tokens, gestion OAuth'
  }
];

/**
 * Construit les mappings pour les déploiements
 * @returns {Object} Mapping templateId/templateName -> déploiement
 */
function buildDeploymentMappings() {
  const mappings = {};
  const deploymentsDir = path.join(__dirname, '../services/deployments');
  
  TEMPLATE_CONFIGS.forEach(config => {
    // Le chemin dans config.deployment est relatif à deployments/
    const deploymentFileName = config.deployment.replace('./', '');
    const deploymentPath = path.join(deploymentsDir, deploymentFileName);
    
    // Mapper par IDs
    config.templateIds.forEach(id => {
      mappings[id] = require(deploymentPath);
    });
    
    // Mapper par noms
    config.templateNames.forEach(name => {
      mappings[name] = require(deploymentPath);
    });
  });
  
  return mappings;
}

/**
 * Construit les mappings pour les injecteurs
 * @returns {Object} Mapping templateId/templateName -> injecteur
 */
function buildInjectorMappings() {
  const mappings = {};
  const injectorsDir = path.join(__dirname, '../services/injectors');
  
  TEMPLATE_CONFIGS.forEach(config => {
    // Le chemin dans config.injector est relatif à injectors/
    const injectorFileName = config.injector.replace('./', '');
    const injectorPath = path.join(injectorsDir, injectorFileName);
    
    // Mapper par IDs
    config.templateIds.forEach(id => {
      mappings[id] = require(injectorPath);
    });
    
    // Mapper par noms
    config.templateNames.forEach(name => {
      mappings[name] = require(injectorPath);
    });
  });
  
  return mappings;
}

/**
 * Trouve la configuration d'un template par ID ou nom
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object|null} Configuration du template ou null
 */
function findTemplateConfig(templateId, templateName) {
  // Recherche par ID
  if (templateId) {
    const configById = TEMPLATE_CONFIGS.find(config => 
      config.templateIds.includes(templateId)
    );
    if (configById) return configById;
  }
  
  // Recherche par nom exact
  if (templateName) {
    const configByName = TEMPLATE_CONFIGS.find(config => 
      config.templateNames.includes(templateName)
    );
    if (configByName) return configByName;
  }
  
  // Recherche par pattern
  if (templateName) {
    const templateNameLower = templateName.toLowerCase();
    const configByPattern = TEMPLATE_CONFIGS.find(config => 
      config.namePatterns.some(pattern => 
        templateNameLower.includes(pattern.toLowerCase())
      )
    );
    if (configByPattern) return configByPattern;
  }
  
  return null;
}

/**
 * Obtient le type de modal pour un template
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {string} Type de modal ('SmartDeployModal' ou 'CreateAutomationModal')
 */
function getModalType(templateId, templateName) {
  const config = findTemplateConfig(templateId, templateName);
  return config ? config.modal : 'CreateAutomationModal';
}

/**
 * Vérifie si un template nécessite SmartDeployModal
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {boolean} true si SmartDeployModal est requis
 */
function requiresSmartDeployModal(templateId, templateName) {
  return getModalType(templateId, templateName) === 'SmartDeployModal';
}

/**
 * Valide que tous les fichiers de déploiement et injecteurs existent
 * @returns {Object} Résultat de la validation
 */
function validateMappings() {
  const errors = [];
  const warnings = [];
  const deploymentsDir = path.join(__dirname, '../services/deployments');
  const injectorsDir = path.join(__dirname, '../services/injectors');
  
  TEMPLATE_CONFIGS.forEach((config, index) => {
    // Vérifier le déploiement
    const deploymentFileName = config.deployment.replace('./', '');
    const deploymentPath = path.join(deploymentsDir, deploymentFileName + '.js');
    try {
      require.resolve(deploymentPath);
    } catch (err) {
      errors.push(`Template config #${index + 1}: Fichier de déploiement introuvable: ${deploymentPath}`);
    }
    
    // Vérifier l'injecteur
    const injectorFileName = config.injector.replace('./', '');
    const injectorPath = path.join(injectorsDir, injectorFileName + '.js');
    try {
      require.resolve(injectorPath);
    } catch (err) {
      errors.push(`Template config #${index + 1}: Fichier injecteur introuvable: ${injectorPath}`);
    }
    
    // Vérifier que le déploiement exporte deployWorkflow
    try {
      const deployment = require(deploymentPath);
      if (!deployment.deployWorkflow || typeof deployment.deployWorkflow !== 'function') {
        errors.push(`Template config #${index + 1}: Le déploiement doit exporter une fonction deployWorkflow`);
      }
    } catch (err) {
      // Déjà géré ci-dessus
    }
    
    // Vérifier que l'injecteur exporte injectUserCredentials
    try {
      const injector = require(injectorPath);
      if (!injector.injectUserCredentials || typeof injector.injectUserCredentials !== 'function') {
        errors.push(`Template config #${index + 1}: L'injecteur doit exporter une fonction injectUserCredentials`);
      }
    } catch (err) {
      // Déjà géré ci-dessus
    }
    
    // Avertissement si pas d'IDs ni de noms
    if (config.templateIds.length === 0 && config.templateNames.length === 0) {
      warnings.push(`Template config #${index + 1}: Aucun ID ni nom défini, seuls les patterns seront utilisés`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  TEMPLATE_CONFIGS,
  buildDeploymentMappings,
  buildInjectorMappings,
  findTemplateConfig,
  getModalType,
  requiresSmartDeployModal,
  validateMappings
};

