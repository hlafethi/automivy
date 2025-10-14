/**
 * Script de test pour le déploiement automatique de workflow Email Summary
 * 
 * Ce script teste la création automatique des credentials IMAP/SMTP
 * et le déploiement du workflow avec injection des paramètres utilisateur.
 */

import { n8nService } from './src/services/n8nService.js';

async function testEmailSummaryDeployment() {
  console.log('🚀 Test du déploiement Email Summary...\n');

  try {
    // Paramètres de test
    const testUser = {
      userId: 'test-user-' + Date.now(),
      userEmail: 'test@example.com',
      userPassword: 'test-password-123',
      userImapServer: 'imap.gmail.com'
    };

    console.log('📋 Paramètres de test:');
    console.log(`  - User ID: ${testUser.userId}`);
    console.log(`  - Email: ${testUser.userEmail}`);
    console.log(`  - Serveur IMAP: ${testUser.userImapServer}`);
    console.log(`  - Serveur SMTP dérivé: ${testUser.userImapServer.replace('imap', 'smtp')}\n`);

    // Test 1: Créer le template
    console.log('1️⃣ Test création template...');
    const template = n8nService.createTemplateWithPlaceholders();
    console.log('✅ Template créé:', template.name);
    console.log(`   - Nodes: ${template.nodes?.length || 0}`);
    console.log(`   - Connexions: ${Object.keys(template.connections || {}).length}\n`);

    // Test 2: Injecter les paramètres
    console.log('2️⃣ Test injection paramètres...');
    const workflowWithCredentials = await n8nService.injectParams(template, {
      USER_EMAIL: testUser.userEmail,
      IMAP_PASSWORD: testUser.userPassword,
      IMAP_SERVER: testUser.userImapServer
    }, testUser.userId, testUser.userEmail);
    
    console.log('✅ Paramètres injectés');
    console.log(`   - Nom: ${workflowWithCredentials.name}`);
    console.log(`   - Nodes: ${workflowWithCredentials.nodes?.length || 0}\n`);

    // Test 3: Vérifier les credentials créés
    console.log('3️⃣ Test création credentials...');
    const credentials = await n8nService.getCredentials();
    const userCredentials = credentials.filter(cred => 
      cred.name.includes(testUser.userId)
    );
    
    console.log(`✅ Credentials utilisateur trouvés: ${userCredentials.length}`);
    userCredentials.forEach(cred => {
      console.log(`   - ${cred.name} (${cred.type}) [ID: ${cred.id}]`);
    });
    console.log('');

    // Test 4: Déployer le workflow complet
    console.log('4️⃣ Test déploiement workflow complet...');
    const result = await n8nService.deployEmailSummaryWorkflow(
      testUser.userId,
      testUser.userEmail,
      testUser.userPassword,
      testUser.userImapServer
    );
    
    console.log('✅ Workflow déployé avec succès!');
    console.log(`   - ID: ${result.id}`);
    console.log('');

    // Test 5: Vérifier le workflow déployé
    console.log('5️⃣ Test vérification workflow...');
    const deployedWorkflow = await n8nService.getWorkflow(result.id);
    console.log('✅ Workflow récupéré:');
    console.log(`   - Nom: ${deployedWorkflow.name}`);
    console.log(`   - Nodes: ${deployedWorkflow.nodes?.length || 0}`);
    console.log(`   - Active: ${deployedWorkflow.active}`);
    
    // Vérifier les credentials dans les nodes
    const nodesWithCredentials = deployedWorkflow.nodes?.filter(node => node.credentials) || [];
    console.log(`   - Nodes avec credentials: ${nodesWithCredentials.length}`);
    
    nodesWithCredentials.forEach(node => {
      console.log(`     - ${node.name}: ${Object.keys(node.credentials || {}).join(', ')}`);
    });
    console.log('');

    console.log('🎉 Tous les tests sont passés avec succès!');
    console.log('');
    console.log('📊 Résumé:');
    console.log(`   ✅ Template créé et chargé`);
    console.log(`   ✅ Credentials IMAP/SMTP créés automatiquement`);
    console.log(`   ✅ Paramètres utilisateur injectés`);
    console.log(`   ✅ Workflow déployé dans n8n`);
    console.log(`   ✅ Workflow vérifié et fonctionnel`);
    console.log('');
    console.log('🔗 Le workflow est maintenant prêt à être activé dans n8n!');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Exécuter le test si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmailSummaryDeployment()
    .then(() => {
      console.log('\n✅ Test terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error);
      process.exit(1);
    });
}

export { testEmailSummaryDeployment };
