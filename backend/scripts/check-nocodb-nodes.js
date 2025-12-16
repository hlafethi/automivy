/**
 * Script pour vérifier les nœuds NocoDB dans un workflow n8n
 * Usage: node backend/scripts/check-nocodb-nodes.js <n8nWorkflowId>
 */

require('dotenv').config();
const fetch = require('node-fetch');
const config = require('../config');

async function checkNocoDbNodes(n8nWorkflowId) {
  console.log('🔍 Vérification des nœuds NocoDB dans le workflow:', n8nWorkflowId);
  console.log('');

  try {
    // 1. Récupérer le workflow depuis n8n
    console.log('1️⃣ Récupération du workflow depuis n8n...');
    const workflowResponse = await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}`, {
      headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
    });

    if (!workflowResponse.ok) {
      console.error(`❌ Erreur ${workflowResponse.status}: Impossible de récupérer le workflow`);
      const errorText = await workflowResponse.text();
      console.error('Détails:', errorText);
      return;
    }

    const workflow = await workflowResponse.json();
    console.log(`✅ Workflow récupéré: "${workflow.name}"`);
    console.log(`   - Actif: ${workflow.active ? '✅ OUI' : '❌ NON'}`);
    console.log('');

    // 2. Trouver tous les nœuds NocoDB
    const nocoDbNodes = workflow.nodes?.filter(n => 
      n.type === 'n8n-nodes-base.nocoDb' || 
      n.type?.toLowerCase().includes('nocodb') ||
      n.name?.toLowerCase().includes('nocodb')
    ) || [];

    if (nocoDbNodes.length === 0) {
      console.log('⚠️  Aucun nœud NocoDB trouvé dans le workflow');
      return;
    }

    console.log(`2️⃣ ${nocoDbNodes.length} nœud(s) NocoDB trouvé(s):\n`);

    const issues = [];

    for (const node of nocoDbNodes) {
      console.log(`📋 Nœud: "${node.name}" (${node.type})`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Position: [${node.position?.[0]}, ${node.position?.[1]}]`);
      console.log('');

      // Vérifier les credentials
      console.log('   🔐 Credentials:');
      if (!node.credentials || Object.keys(node.credentials).length === 0) {
        console.log('      ❌ AUCUN CREDENTIAL ASSIGNÉ');
        issues.push({ node: node.name, issue: 'Credential manquant' });
      } else {
        for (const [credType, credData] of Object.entries(node.credentials)) {
          if (credData && credData.id) {
            console.log(`      ✅ ${credType}: ${credData.id} (${credData.name || 'sans nom'})`);
          } else {
            console.log(`      ❌ ${credType}: INVALIDE (pas d'ID)`);
            issues.push({ node: node.name, issue: `Credential ${credType} invalide` });
          }
        }
      }
      console.log('');

      // Vérifier les paramètres
      console.log('   ⚙️  Paramètres:');
      if (!node.parameters) {
        console.log('      ❌ AUCUN PARAMÈTRE');
        issues.push({ node: node.name, issue: 'Paramètres manquants' });
      } else {
        const params = node.parameters;
        
        // Vérifier operation
        if (!params.operation) {
          console.log('      ❌ operation: MANQUANT (requis)');
          issues.push({ node: node.name, issue: 'Paramètre operation manquant' });
        } else {
          console.log(`      ✅ operation: ${params.operation}`);
        }

        // Vérifier baseNameOrId / baseId
        if (!params.baseNameOrId && !params.baseId) {
          console.log('      ❌ baseNameOrId/baseId: MANQUANT (requis)');
          issues.push({ node: node.name, issue: 'Paramètre baseNameOrId/baseId manquant' });
        } else {
          console.log(`      ✅ baseNameOrId: ${params.baseNameOrId || 'N/A'}`);
          console.log(`      ✅ baseId: ${params.baseId || 'N/A'}`);
        }

        // Vérifier tableNameOrId / tableId
        if (!params.tableNameOrId && !params.tableId && !params.tableName) {
          console.log('      ❌ tableNameOrId/tableId/tableName: MANQUANT (requis)');
          issues.push({ node: node.name, issue: 'Paramètre tableNameOrId/tableId/tableName manquant' });
        } else {
          console.log(`      ✅ tableNameOrId: ${params.tableNameOrId || 'N/A'}`);
          console.log(`      ✅ tableId: ${params.tableId || 'N/A'}`);
          console.log(`      ✅ tableName: ${params.tableName || 'N/A'}`);
        }

        // Vérifier baseUrl (optionnel mais utile)
        if (params.baseUrl) {
          console.log(`      ✅ baseUrl: ${params.baseUrl}`);
        } else {
          console.log('      ⚠️  baseUrl: non défini (peut être dans le credential)');
        }

        // Afficher tous les autres paramètres
        const otherParams = Object.keys(params).filter(k => 
          !['operation', 'baseNameOrId', 'baseId', 'tableNameOrId', 'tableId', 'tableName', 'baseUrl'].includes(k)
        );
        if (otherParams.length > 0) {
          console.log(`      📝 Autres paramètres: ${otherParams.join(', ')}`);
          for (const key of otherParams) {
            const value = params[key];
            if (typeof value === 'string' && value.length > 50) {
              console.log(`         - ${key}: ${value.substring(0, 50)}...`);
            } else {
              console.log(`         - ${key}: ${JSON.stringify(value)}`);
            }
          }
        }
      }
      console.log('');
      console.log('   ' + '─'.repeat(60));
      console.log('');
    }

    // Résumé des problèmes
    if (issues.length > 0) {
      console.log('3️⃣ ❌ PROBLÈMES DÉTECTÉS:\n');
      for (const issue of issues) {
        console.log(`   - ${issue.node}: ${issue.issue}`);
      }
      console.log('');
      console.log('💡 CORRECTIONS NÉCESSAIRES:');
      console.log('   1. Vérifiez que tous les nœuds NocoDB ont un credential assigné');
      console.log('   2. Vérifiez que le paramètre "operation" est défini (create, list, get, update, delete)');
      console.log('   3. Vérifiez que le paramètre "baseNameOrId" ou "baseId" est défini');
      console.log('   4. Vérifiez que le paramètre "tableNameOrId" ou "tableId" est défini');
      console.log('');
    } else {
      console.log('3️⃣ ✅ Aucun problème détecté dans les nœuds NocoDB');
      console.log('');
      console.log('💡 Si le workflow ne démarre toujours pas, vérifiez:');
      console.log('   1. Que les IDs des tables sont valides dans NocoDB');
      console.log('   2. Que le credential NocoDB a le champ "host" correctement configuré');
      console.log('   3. Que les autres nœuds du workflow n\'ont pas de problèmes');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    console.error(error.stack);
  }
}

// Exécuter le script
const n8nWorkflowId = process.argv[2];

if (!n8nWorkflowId) {
  console.error('❌ Usage: node backend/scripts/check-nocodb-nodes.js <n8nWorkflowId>');
  console.error('');
  console.error('Exemple: node backend/scripts/check-nocodb-nodes.js VOHE9qDxDjzLJDdx');
  process.exit(1);
}

checkNocoDbNodes(n8nWorkflowId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

