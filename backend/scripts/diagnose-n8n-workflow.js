require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    console.log('🔍 Diagnostic du workflow Nextcloud...\n');
    
    // 1. Trouver le workflow
    const wfsRes = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    const ncWorkflow = workflows.find(w => w.name.toLowerCase().includes('nextcloud'));
    
    if (!ncWorkflow) {
      console.log('❌ Aucun workflow Nextcloud trouvé');
      return;
    }
    
    console.log(`📋 Workflow: ${ncWorkflow.name}`);
    console.log(`   ID: ${ncWorkflow.id}`);
    console.log(`   Active: ${ncWorkflow.active}`);
    
    // 2. Récupérer les détails
    const detailRes = await axios.get(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflow = detailRes.data;
    
    // 3. Analyser chaque noeud
    console.log('\n📦 Analyse des noeuds:\n');
    
    const issues = [];
    
    workflow.nodes?.forEach((node, i) => {
      console.log(`${i + 1}. ${node.name} (${node.type})`);
      
      // Vérifier les credentials
      if (node.type === 'n8n-nodes-base.nextCloud') {
        if (!node.credentials?.nextCloudApi) {
          console.log('   ❌ Pas de credential Nextcloud!');
          issues.push({ node: node.name, issue: 'Credential Nextcloud manquant' });
        } else {
          console.log(`   ✅ Credential: ${node.credentials.nextCloudApi.name}`);
        }
        
        // Vérifier les paramètres
        if (node.parameters?.operation === 'move') {
          console.log(`   Operation: move`);
          console.log(`   Path: ${node.parameters?.path || 'MANQUANT'}`);
          console.log(`   NewPath: ${node.parameters?.newPath || 'MANQUANT'}`);
          
          if (!node.parameters?.newPath) {
            issues.push({ node: node.name, issue: 'newPath manquant pour operation move' });
          }
        }
        
        if (node.parameters?.operation === 'list') {
          console.log(`   Operation: list`);
          console.log(`   Path: ${node.parameters?.path || 'MANQUANT'}`);
        }
        
        if (node.parameters?.operation === 'download') {
          console.log(`   Operation: download`);
          console.log(`   Path: ${node.parameters?.path || 'MANQUANT'}`);
        }
      }
      
      // Vérifier AI Agent
      if (node.type === '@n8n/n8n-nodes-langchain.agent') {
        console.log(`   ✅ AI Agent`);
      }
      
      // Vérifier OpenRouter
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter') {
        if (!node.credentials?.openRouterApi) {
          console.log('   ❌ Pas de credential OpenRouter!');
          issues.push({ node: node.name, issue: 'Credential OpenRouter manquant' });
        } else {
          console.log(`   ✅ Credential: ${node.credentials.openRouterApi.name}`);
        }
      }
      
      console.log('');
    });
    
    // 4. Afficher les connexions
    console.log('\n🔗 Connexions:');
    Object.entries(workflow.connections || {}).forEach(([nodeName, conns]) => {
      const targets = conns.main?.flatMap(arr => arr?.map(c => c.node) || []) || [];
      if (targets.length > 0) {
        console.log(`   ${nodeName} → ${targets.join(', ')}`);
      }
    });
    
    // 5. Résumé des problèmes
    if (issues.length > 0) {
      console.log('\n\n❌ PROBLÈMES DÉTECTÉS:');
      issues.forEach(issue => {
        console.log(`   - ${issue.node}: ${issue.issue}`);
      });
    } else {
      console.log('\n\n✅ Aucun problème détecté dans la configuration');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
})();

