/**
 * Script de vérification des mappings de templates
 * 
 * Ce script vérifie que tous les mappings dans templateMappings.js sont valides :
 * - Les fichiers de déploiement existent
 * - Les fichiers d'injecteur existent
 * - Les fonctions requises sont exportées
 * 
 * Usage: node backend/scripts/verify-template-mappings.js
 */

require('dotenv').config();
const { validateMappings, TEMPLATE_CONFIGS } = require('../config/templateMappings');

console.log('🔍 Vérification des mappings de templates...\n');

const validation = validateMappings();

if (validation.valid) {
  console.log('✅ Tous les mappings sont valides !\n');
  
  console.log(`📊 Statistiques :`);
  console.log(`   - Templates configurés : ${TEMPLATE_CONFIGS.length}`);
  console.log(`   - Templates avec IDs : ${TEMPLATE_CONFIGS.filter(c => c.templateIds.length > 0).length}`);
  console.log(`   - Templates avec noms : ${TEMPLATE_CONFIGS.filter(c => c.templateNames.length > 0).length}`);
  console.log(`   - Templates avec patterns : ${TEMPLATE_CONFIGS.filter(c => c.namePatterns.length > 0).length}`);
  console.log(`   - Templates SmartDeployModal : ${TEMPLATE_CONFIGS.filter(c => c.modal === 'SmartDeployModal').length}`);
  console.log(`   - Templates CreateAutomationModal : ${TEMPLATE_CONFIGS.filter(c => c.modal === 'CreateAutomationModal').length}\n`);
  
  console.log('📋 Détails des templates :\n');
  TEMPLATE_CONFIGS.forEach((config, index) => {
    console.log(`${index + 1}. ${config.description || 'Template sans description'}`);
    if (config.templateIds.length > 0) {
      console.log(`   IDs: ${config.templateIds.join(', ')}`);
    }
    if (config.templateNames.length > 0) {
      console.log(`   Noms: ${config.templateNames.join(', ')}`);
    }
    if (config.namePatterns.length > 0) {
      console.log(`   Patterns: ${config.namePatterns.join(', ')}`);
    }
    console.log(`   Déploiement: ${config.deployment}`);
    console.log(`   Injecteur: ${config.injector}`);
    console.log(`   Modal: ${config.modal}\n`);
  });
  
  process.exit(0);
} else {
  console.error('❌ Erreurs de validation trouvées :\n');
  validation.errors.forEach(error => {
    console.error(`   - ${error}`);
  });
  
  if (validation.warnings.length > 0) {
    console.warn('\n⚠️ Avertissements :\n');
    validation.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }
  
  console.error('\n❌ Veuillez corriger les erreurs avant de continuer.');
  process.exit(1);
}

