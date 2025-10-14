import fetch from 'node-fetch';

async function testSmartDeploySystem() {
  try {
    console.log('🚀 Test du système de déploiement intelligent...');
    
    // Se connecter en tant qu'utilisateur
    console.log('1️⃣ Connexion utilisateur...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@automivy.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('   Status:', loginResponse.status);
    console.log('   User:', loginData.user?.email);
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Récupération des workflows disponibles...');
    
    const workflowsResponse = await fetch('http://localhost:3004/api/smart-deploy/workflows', {
      method: 'GET',
      headers
    });
    
    console.log('   Status:', workflowsResponse.status);
    
    if (workflowsResponse.ok) {
      const workflows = await workflowsResponse.json();
      console.log('✅ Workflows disponibles:', workflows.workflows.length);
      
      if (workflows.workflows.length > 0) {
        const workflow = workflows.workflows[0];
        console.log('   Workflow sélectionné:', workflow.name);
        console.log('   Workflow ID:', workflow.id);
        
        console.log('');
        console.log('3️⃣ Analyse du workflow...');
        
        const analyzeResponse = await fetch('http://localhost:3004/api/smart-deploy/analyze', {
          method: 'POST',
          headers,
          body: JSON.stringify({ workflowId: workflow.id })
        });
        
        console.log('   Status analyse:', analyzeResponse.status);
        
        if (analyzeResponse.ok) {
          const analysis = await analyzeResponse.json();
          console.log('✅ Analyse terminée !');
          console.log('   Workflow:', analysis.workflow.name);
          console.log('   Credentials requis:', analysis.requiredCredentials.length);
          console.log('   Sections du formulaire:', analysis.formConfig.sections.length);
          
          // Afficher les détails du formulaire
          analysis.formConfig.sections.forEach((section, index) => {
            console.log(`   Section ${index + 1}: ${section.title}`);
            console.log(`     Description: ${section.description}`);
            console.log(`     Champs: ${section.fields.length}`);
            section.fields.forEach(field => {
              console.log(`       - ${field.label} (${field.type}) ${field.required ? '[requis]' : '[optionnel]'}`);
            });
          });
          
          console.log('');
          console.log('4️⃣ Test de déploiement avec credentials fictifs...');
          
          // Préparer les credentials de test
          const testCredentials = {
            email: 'test@example.com',
            imapPassword: 'testpassword',
            imapServer: 'imap.gmail.com',
            imapPort: 993,
            smtpEmail: 'test@example.com',
            smtpPassword: 'testpassword',
            smtpServer: 'smtp.gmail.com',
            smtpPort: 587
          };
          
          const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
              workflowId: workflow.id, 
              credentials: testCredentials 
            })
          });
          
          console.log('   Status déploiement:', deployResponse.status);
          
          if (deployResponse.ok) {
            const deployResult = await deployResponse.json();
            console.log('✅ Déploiement réussi !');
            console.log('   Workflow déployé:', deployResult.workflow.name);
            console.log('   ID n8n:', deployResult.workflow.n8n_workflow_id);
            console.log('   Status:', deployResult.workflow.status);
          } else {
            const error = await deployResponse.text();
            console.log('❌ Erreur déploiement:', error);
          }
          
        } else {
          const error = await analyzeResponse.text();
          console.log('❌ Erreur analyse:', error);
        }
      } else {
        console.log('ℹ️ Aucun workflow disponible pour le test');
      }
    } else {
      const error = await workflowsResponse.text();
      console.log('❌ Erreur récupération workflows:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testSmartDeploySystem();
