/**
 * Test direct de la connexion IMAP
 * Vérifie si les paramètres IMAP sont corrects
 */

const Imap = require('imap');

async function testImapDirect() {
  try {
    console.log('🔧 Test direct de la connexion IMAP');
    
    const imap = new Imap({
      user: 'user@heleam.com',
      password: 'User@2025',
      host: 'mail.cygne.o2switch.net',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    console.log('🔧 Configuration IMAP:');
    console.log('  - Host: mail.cygne.o2switch.net');
    console.log('  - Port: 993');
    console.log('  - User: user@heleam.com');
    console.log('  - SSL: true');
    
    imap.once('ready', function() {
      console.log('✅ Connexion IMAP réussie !');
      
      // Ouvrir la boîte de réception
      imap.openBox('INBOX', false, function(err, box) {
        if (err) {
          console.error('❌ Erreur ouverture INBOX:', err);
          return;
        }
        
        console.log('✅ INBOX ouverte');
        console.log(`📊 ${box.messages.total} messages dans la boîte`);
        
        // Rechercher les emails d'aujourd'hui
        const today = new Date();
        const searchCriteria = ['SINCE', today];
        
        imap.search(searchCriteria, function(err, results) {
          if (err) {
            console.error('❌ Erreur recherche emails:', err);
            return;
          }
          
          console.log(`📧 ${results.length} emails trouvés aujourd'hui`);
          
          if (results.length > 0) {
            console.log('📧 Emails trouvés:');
            results.slice(0, 5).forEach((uid, index) => {
              console.log(`  ${index + 1}. UID: ${uid}`);
            });
          }
          
          imap.end();
        });
      });
    });
    
    imap.once('error', function(err) {
      console.error('❌ Erreur IMAP:', err);
    });
    
    imap.once('end', function() {
      console.log('🔚 Connexion IMAP fermée');
    });
    
    console.log('🔧 Tentative de connexion...');
    imap.connect();
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testImapDirect();
