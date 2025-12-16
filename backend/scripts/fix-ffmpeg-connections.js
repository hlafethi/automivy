/**
 * Script pour corriger les connexions du workflow Production Vidéo
 * Assure que TTS → 5a. Écrire Audio est correctement connecté
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fixConnections() {
  console.log('='.repeat(60));
  console.log('🔧 Diagnostic et correction des connexions FFmpeg');
  console.log('='.repeat(60));
  
  try {
    // Récupérer les workflows
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const result = await response.json();
    const workflows = result.data || result.workflows || result;
    
    for (const workflow of workflows) {
      if (!workflow.name.includes('Production Vidéo')) continue;
      
      console.log(`\n📋 Workflow: "${workflow.name}"`);
      
      // Récupérer le workflow complet
      const fullResponse = await fetch(`${N8N_URL}/api/v1/workflows/${workflow.id}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      
      const fullWorkflow = await fullResponse.json();
      
      // Lister tous les nœuds
      console.log('\n📦 Nœuds:');
      for (const node of fullWorkflow.nodes) {
        console.log(`   - ${node.name} (${node.type})`);
      }
      
      // Lister toutes les connexions
      console.log('\n🔗 Connexions actuelles:');
      for (const [sourceName, conns] of Object.entries(fullWorkflow.connections || {})) {
        if (conns.main) {
          for (const outputArray of conns.main) {
            for (const conn of outputArray) {
              console.log(`   ${sourceName} → ${conn.node}`);
            }
          }
        }
      }
      
      // Trouver le nœud TTS
      const ttsNode = fullWorkflow.nodes.find(n => 
        n.name?.toLowerCase().includes('tts') || 
        n.name?.toLowerCase().includes('synthèse') ||
        n.name?.toLowerCase().includes('vocale')
      );
      
      if (!ttsNode) {
        console.log('\n⚠️ Nœud TTS non trouvé');
        continue;
      }
      
      console.log(`\n✅ Nœud TTS trouvé: "${ttsNode.name}"`);
      
      // Vérifier si le TTS est connecté à "5a. Écrire Audio"
      const ttsConnections = fullWorkflow.connections[ttsNode.name];
      console.log(`\n🔍 Connexions sortantes du TTS:`, JSON.stringify(ttsConnections, null, 2));
      
      // Corriger les connexions
      const newConnections = JSON.parse(JSON.stringify(fullWorkflow.connections));
      
      // S'assurer que TTS → 5a. Écrire Audio
      newConnections[ttsNode.name] = {
        main: [[{ node: '5a. Écrire Audio', type: 'main', index: 0 }]]
      };
      
      // S'assurer que 5a → 5b → 5c
      newConnections['5a. Écrire Audio'] = {
        main: [[{ node: '5b. FFmpeg Montage', type: 'main', index: 0 }]]
      };
      newConnections['5b. FFmpeg Montage'] = {
        main: [[{ node: '5c. Lire Vidéo', type: 'main', index: 0 }]]
      };
      
      // Trouver le nœud après FFmpeg (ex: Upload Google Drive)
      const uploadNode = fullWorkflow.nodes.find(n => 
        n.name?.toLowerCase().includes('drive') || 
        n.name?.toLowerCase().includes('upload') ||
        n.name?.toLowerCase().includes('6.')
      );
      
      if (uploadNode) {
        newConnections['5c. Lire Vidéo'] = {
          main: [[{ node: uploadNode.name, type: 'main', index: 0 }]]
        };
        console.log(`\n✅ Connexion vers: "${uploadNode.name}"`);
      }
      
      console.log('\n🔗 Nouvelles connexions:');
      for (const [sourceName, conns] of Object.entries(newConnections)) {
        if (conns.main) {
          for (const outputArray of conns.main) {
            for (const conn of outputArray) {
              console.log(`   ${sourceName} → ${conn.node}`);
            }
          }
        }
      }
      
      // Mettre à jour le workflow
      console.log('\n📝 Mise à jour du workflow...');
      
      const updateResponse = await fetch(`${N8N_URL}/api/v1/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fullWorkflow.name,
          nodes: fullWorkflow.nodes,
          connections: newConnections,
          settings: fullWorkflow.settings,
          staticData: fullWorkflow.staticData
        })
      });
      
      if (updateResponse.ok) {
        console.log('✅ Connexions mises à jour avec succès!');
      } else {
        const errorText = await updateResponse.text();
        console.log(`❌ Erreur: ${errorText}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

fixConnections();

