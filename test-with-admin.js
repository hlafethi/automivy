import fetch from 'node-fetch';

async function testWithAdmin() {
  console.log('🧪 [Test] Test avec admin...');
  
  try {
    // Connexion admin
    console.log('🔧 [Test] Connexion admin...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@heleam.com',
        password: 'admin_password'
      })
    });
    
    console.log('📋 [Test] Réponse admin:', loginResponse.status, loginResponse.statusText);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('❌ [Test] Erreur admin:', error);
      
      // Test avec d'autres mots de passe admin
      const adminPasswords = ['admin', 'password', 'heleam', 'admin123'];
      
      for (const password of adminPasswords) {
        console.log(`🔧 [Test] Test admin avec mot de passe: ${password}`);
        
        const adminLoginResponse = await fetch('http://localhost:3004/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'admin@heleam.com',
            password: password
          })
        });
        
        console.log(`📋 [Test] Réponse admin ${password}:`, adminLoginResponse.status, adminLoginResponse.statusText);
        
        if (adminLoginResponse.ok) {
          const adminData = await adminLoginResponse.json();
          console.log(`✅ [Test] Connexion admin réussie avec ${password}`);
          
          // Test déploiement avec admin
          console.log('🔧 [Test] Test déploiement avec admin...');
          const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminData.token}`
            },
            body: JSON.stringify({
              workflowId: '765e36b3-a363-47f9-94a8-8939519df8f3',
              credentials: {
                email: 'admin@heleam.com',
                smtpEmail: 'admin@heleam.com',
                smtpPassword: 'admin_password',
                smtpServer: 'smtp.gmail.com',
                smtpPort: '465',
                imapPassword: 'admin_password',
                imapServer: 'imap.gmail.com',
                imapPort: '993'
              }
            })
          });
          
          console.log('📋 [Test] Réponse déploiement:', deployResponse.status, deployResponse.statusText);
          
          if (!deployResponse.ok) {
            const error = await deployResponse.text();
            console.log('❌ [Test] Erreur déploiement:', error);
          } else {
            const result = await deployResponse.json();
            console.log('✅ [Test] Déploiement réussi:', result);
          }
          
          break;
        } else {
          const error = await adminLoginResponse.text();
          console.log(`❌ [Test] Erreur admin ${password}:`, error);
        }
      }
      
    } else {
      const adminData = await loginResponse.json();
      console.log('✅ [Test] Connexion admin réussie');
      
      // Test déploiement avec admin
      console.log('🔧 [Test] Test déploiement avec admin...');
      const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminData.token}`
        },
        body: JSON.stringify({
          workflowId: '765e36b3-a363-47f9-94a8-8939519df8f3',
          credentials: {
            email: 'admin@heleam.com',
            smtpEmail: 'admin@heleam.com',
            smtpPassword: 'admin_password',
            smtpServer: 'smtp.gmail.com',
            smtpPort: '465',
            imapPassword: 'admin_password',
            imapServer: 'imap.gmail.com',
            imapPort: '993'
          }
        })
      });
      
      console.log('📋 [Test] Réponse déploiement:', deployResponse.status, deployResponse.statusText);
      
      if (!deployResponse.ok) {
        const error = await deployResponse.text();
        console.log('❌ [Test] Erreur déploiement:', error);
      } else {
        const result = await deployResponse.json();
        console.log('✅ [Test] Déploiement réussi:', result);
      }
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

testWithAdmin();
