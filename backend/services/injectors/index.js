// Système de routing vers les injecteurs spécifiques par template
// Si aucun injecteur spécifique n'est trouvé, utilise l'injecteur générique

const genericInjector = require('../credentialInjector');

// Mapping des templates vers leurs injecteurs spécifiques
const TEMPLATE_INJECTORS = {
  // GMAIL Tri Automatique Boite Email
  '5114f297-e56e-4fec-be2b-1afbb5ea8619': require('./gmailTriInjector'),
  'GMAIL Tri Automatique Boite Email': require('./gmailTriInjector'),
  
  // Template fonctionnel résume email
  '6ff57a3c-c9a0-40ec-88c0-7e25ef031cb0': require('./resumeEmailInjector'),
  'Template fonctionnel résume email': require('./resumeEmailInjector'),
  
  // PDF Analysis Complete
  '132d04c8-e36a-4dbd-abac-21fa8280650e': require('./pdfAnalysisInjector'),
  'PDF Analysis Complete': require('./pdfAnalysisInjector'),
  
  // CV Analysis and Candidate Evaluation
  'aa3ba641-9bfb-429c-8b42-506d4f33ff40': require('./cvAnalysisInjector'),
  'CV Analysis and Candidate Evaluation': require('./cvAnalysisInjector'),
  'cv-analysis-evaluation': require('./cvAnalysisInjector'), // Alias pour le webhook path
  
  // IMAP Tri Automatique BAL
  'c1bd6bd6-8a2b-4beb-89ee-1cd734a907a2': require('./imapTriInjector'),
  'IMAP Tri Automatique BAL': require('./imapTriInjector'),
  
  // Microsoft Tri Automatique BAL (version Microsoft du template IMAP Tri)
  'a3b5ba35-aeea-48f4-83d7-34e964a6a8b6': require('./microsoftTriInjector'),
  'Microsoft Tri Automatique BAL': require('./microsoftTriInjector'),
};

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
  console.log('🔀 [InjectorRouter] Routing vers l\'injecteur approprié...');
  console.log('🔀 [InjectorRouter] Template ID:', templateId);
  console.log('🔀 [InjectorRouter] Template Name:', templateName);
  
  // Chercher l'injecteur spécifique par ID (priorité)
  let specificInjector = null;
  if (templateId && TEMPLATE_INJECTORS[templateId]) {
    specificInjector = TEMPLATE_INJECTORS[templateId];
    console.log('✅ [InjectorRouter] Injecteur spécifique trouvé par ID:', templateId);
  }
  
  // Si pas trouvé par ID, chercher par nom (fallback)
  if (!specificInjector && templateName && TEMPLATE_INJECTORS[templateName]) {
    specificInjector = TEMPLATE_INJECTORS[templateName];
    console.log('✅ [InjectorRouter] Injecteur spécifique trouvé par nom:', templateName);
  }
  
  // Si un injecteur spécifique est trouvé, l'utiliser
  if (specificInjector && specificInjector.injectUserCredentials) {
    console.log('🎯 [InjectorRouter] Utilisation de l\'injecteur spécifique');
    return await specificInjector.injectUserCredentials(workflow, userCredentials, userId, templateId, templateName);
  }
  
  // Sinon, utiliser l'injecteur générique
  console.log('🔧 [InjectorRouter] Aucun injecteur spécifique trouvé, utilisation de l\'injecteur générique');
  return await genericInjector.injectUserCredentials(workflow, userCredentials, userId, templateId);
}

module.exports = { injectUserCredentials };

