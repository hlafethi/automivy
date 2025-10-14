/**
 * Test du système de schedule simple
 * Vérifie que l'heure choisie par l'utilisateur est correctement appliquée au workflow n8n
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3004';

async function testScheduleSimple() {
  try {
    console.log('🧪 Test du système de schedule simple');
    
    // 1. Connexion admin
    console.log('\n1. Connexion admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@automivy.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const { token } = await loginResponse.json();
    console.log('✅ Connexion admin réussie');
    
    // 2. Récupérer les workflows utilisateur
    console.log('\n2. Récupération des workflows utilisateur...');
    const workflowsResponse = await fetch(`${BASE_URL}/api/user-workflows`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!workflowsResponse.ok) {
      throw new Error(`Get workflows failed: ${workflowsResponse.status}`);
    }
    
    const workflows = await workflowsResponse.json();
    console.log(`✅ ${workflows.length} workflows trouvés`);
    
    if (workflows.length === 0) {
      console.log('⚠️ Aucun workflow utilisateur trouvé pour tester');
      return;
    }
    
    // 3. Tester la mise à jour du schedule
    const testWorkflow = workflows[0];
    console.log(`\n3. Test mise à jour schedule pour workflow: ${testWorkflow.name}`);
    console.log(`   - ID: ${testWorkflow.id}`);
    console.log(`   - n8n ID: ${testWorkflow.n8n_workflow_id}`);
    console.log(`   - Schedule actuel: ${testWorkflow.schedule}`);
    
    // Nouvelle heure de test
    const newSchedule = '14:30';
    console.log(`   - Nouveau schedule: ${newSchedule}`);
    
    // 4. Mettre à jour le schedule
    console.log('\n4. Mise à jour du schedule...');
    const updateResponse = await fetch(`${BASE_URL}/api/user-workflows/${testWorkflow.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: testWorkflow.name,
        description: testWorkflow.description,
        schedule: newSchedule
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Update failed: ${updateResponse.status} - ${error}`);
    }
    
    const updatedWorkflow = await updateResponse.json();
    console.log('✅ Schedule mis à jour en base de données');
    console.log(`   - Nouveau schedule: ${updatedWorkflow.schedule}`);
    
    // 5. Vérifier le workflow n8n
    if (testWorkflow.n8n_workflow_id) {
      console.log('\n5. Vérification du workflow n8n...');
      const n8nResponse = await fetch(`${BASE_URL}/api/n8n/workflows/${testWorkflow.n8n_workflow_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (n8nResponse.ok) {
        const n8nWorkflow = await n8nResponse.json();
        console.log('✅ Workflow n8n récupéré');
        
        // Chercher le nœud scheduleTrigger
        const scheduleNode = n8nWorkflow.nodes?.find(node => 
          node.type === 'n8n-nodes-base.scheduleTrigger'
        );
        
        if (scheduleNode) {
          console.log('✅ Nœud scheduleTrigger trouvé');
          console.log('   - Paramètres:', JSON.stringify(scheduleNode.parameters, null, 2));
          
          // Vérifier l'expression cron
          const cronExpression = scheduleNode.parameters?.rule?.interval?.[0]?.cronExpression;
          if (cronExpression) {
            console.log(`   - Expression cron: ${cronExpression}`);
            
            // Vérifier que c'est bien "30 14 * * *" pour 14:30
            const expectedCron = '30 14 * * *';
            if (cronExpression === expectedCron) {
              console.log('✅ Expression cron correcte !');
            } else {
              console.log(`❌ Expression cron incorrecte. Attendu: ${expectedCron}, Reçu: ${cronExpression}`);
            }
          } else {
            console.log('❌ Expression cron non trouvée');
          }
        } else {
          console.log('❌ Nœud scheduleTrigger non trouvé');
        }
      } else {
        console.log('⚠️ Impossible de récupérer le workflow n8n');
      }
    } else {
      console.log('⚠️ Pas d\'ID n8n pour ce workflow');
    }
    
    console.log('\n🎉 Test du schedule simple terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testScheduleSimple();
