/**
 * Script pour vérifier les problèmes de validation d'un workflow n8n
 * Utilise la fonction validateWorkflow de deploymentUtils.js
 * Usage: node backend/scripts/check-workflow-issues.js <n8nWorkflowId>
 */

const { validateWorkflow } = require('../services/deployments/deploymentUtils');

async function checkWorkflowIssues(n8nWorkflowId) {
  console.log('🔍 Vérification des problèmes du workflow:', n8nWorkflowId);
  console.log('');

  try {
    await validateWorkflow(n8nWorkflowId);
    console.log('✅ Aucun problème détecté - Le workflow devrait pouvoir s\'exécuter');
  } catch (error) {
    console.log('❌ PROBLÈMES DÉTECTÉS:');
    console.log('');
    console.log(error.message);
    console.log('');
    console.log('💡 Corrigez ces problèmes dans n8n avant de réessayer');
  }
}

// Exécuter le script
const n8nWorkflowId = process.argv[2];

if (!n8nWorkflowId) {
  console.error('❌ Usage: node backend/scripts/check-workflow-issues.js <n8nWorkflowId>');
  process.exit(1);
}

checkWorkflowIssues(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

