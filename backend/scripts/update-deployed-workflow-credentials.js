// Script pour mettre à jour les credentials d'un workflow déjà déployé
// Usage: node update-deployed-workflow-credentials.js "test mcp - user@heleam.com"

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mcpTestInjector = require('../services/injectors/mcpTestInjector');
const db = require('../database');
const config = require('../config');
const logger = require('../utils/logger');

const workflowName = process.argv[2] || 'test mcp - user@heleam.com';

async function updateWorkflowCredentials() {
  console.log(`🔧 Mise à jour des credentials pour le workflow: ${workflowName}\n`);
  
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    // 1. Chercher le workflow directement dans n8n par nom
    console.log('📥 Recherche du workflow dans n8n...');
    const workflowsResponse = await fetch(`${n8nUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    if (!workflowsResponse.ok) {
      const errorText = await workflowsResponse.text();
      console.log('❌ Erreur lors de la récupération des workflows:', errorText);
      process.exit(1);
    }
    
    const workflowsData = await workflowsResponse.json();
    // L'API n8n peut retourner un tableau ou un objet avec une propriété data
    const workflows = Array.isArray(workflowsData) ? workflowsData : (workflowsData.data || workflowsData.workflows || []);
    const n8nWorkflow = workflows.find(w => w.name === workflowName);
    
    if (!n8nWorkflow) {
      console.log('❌ Workflow non trouvé dans n8n');
      console.log('Workflows disponibles:');
      workflows.forEach(w => console.log(`  - ${w.name}`));
      process.exit(1);
    }
    
    console.log('✅ Workflow trouvé dans n8n:');
    console.log('   ID:', n8nWorkflow.id);
    console.log('   Nom:', n8nWorkflow.name);
    console.log('   Nœuds:', n8nWorkflow.nodes?.length || 0);
    
    // 2. Récupérer le workflow complet depuis n8n
    console.log('\n📥 Récupération du workflow complet...');
    const n8nResponse = await fetch(`${n8nUrl}/api/v1/workflows/${n8nWorkflow.id}`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.log('❌ Erreur lors de la récupération du workflow:', errorText);
      process.exit(1);
    }
    
    const fullWorkflow = await n8nResponse.json();
    
    // 3. Récupérer l'utilisateur depuis la base de données (par email extrait du nom)
    const emailMatch = workflowName.match(/- (.+@.+)$/);
    const userEmail = emailMatch ? emailMatch[1] : 'user@heleam.com';
    
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé:', userEmail);
      process.exit(1);
    }
    
    const userId = userResult.rows[0].id;
    console.log('✅ Utilisateur trouvé:', userEmail, '(ID:', userId + ')');
    
    // 4. Récupérer le template "test mcp"
    const templateResult = await db.query(
      "SELECT * FROM templates WHERE name ILIKE '%test mcp%' ORDER BY created_at DESC LIMIT 1"
    );
    
    if (templateResult.rows.length === 0) {
      console.log('❌ Template "test mcp" non trouvé');
      process.exit(1);
    }
    
    const template = templateResult.rows[0];
    console.log('\n📋 Template:', template.name);
    
    // 5. Récupérer les credentials de l'utilisateur (simuler un objet credentials avec googleUnified connecté)
    // L'injecteur récupère les credentials depuis la DB, mais il vérifie aussi userCredentials.googleUnified
    const credentials = { googleUnified: 'connected' };
    
    // 6. Appliquer l'injecteur pour mettre à jour les credentials
    console.log('\n🔧 Application de l\'injecteur...');
    const injectionResult = await mcpTestInjector.injectUserCredentials(
      fullWorkflow,
      credentials,
      userId,
      template.id,
      template.name
    );
    
    if (!injectionResult || !injectionResult.workflow) {
      console.log('❌ Échec de l\'injection');
      process.exit(1);
    }
    
    const injectedWorkflow = injectionResult.workflow;
    console.log('✅ Injection terminée');
    
    // 6. Vérifier les credentials assignés
    console.log('\n📊 Credentials assignés:');
    injectedWorkflow.nodes.forEach(node => {
      if (node.credentials && Object.keys(node.credentials).length > 0) {
        console.log(`   ${node.name}:`, Object.keys(node.credentials).join(', '));
        Object.entries(node.credentials).forEach(([type, cred]) => {
          console.log(`      - ${type}: ${cred.id} (${cred.name})`);
        });
      }
    });
    
    // 7. Mettre à jour le workflow dans n8n
    console.log('\n📤 Mise à jour du workflow dans n8n...');
    const updateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${n8nWorkflow.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify({
        name: injectedWorkflow.name,
        nodes: injectedWorkflow.nodes,
        connections: injectedWorkflow.connections,
        settings: injectedWorkflow.settings
      }),
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log('❌ Erreur lors de la mise à jour:', errorText);
      process.exit(1);
    }
    
    const updatedWorkflow = await updateResponse.json();
    console.log('✅ Workflow mis à jour dans n8n');
    console.log('   ID:', updatedWorkflow.id);
    console.log('   Nom:', updatedWorkflow.name);
    
    console.log('\n✅ Mise à jour terminée avec succès!');
    console.log('\n📝 Vérifiez maintenant le workflow dans n8n pour confirmer que les credentials sont bien assignés.');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error(error.stack);
  }
  
  process.exit();
}

updateWorkflowCredentials();

