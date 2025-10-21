const nodemailer = require('nodemailer');

// Configuration SMTP avancée pour résoudre les problèmes de timeout
const smtpConfigs = {
  // Configuration Gmail avec paramètres optimisés
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
  },
  
  // Configuration alternative Gmail (port 465)
  gmailSecure: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  },
  
  // Configuration Outlook
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@outlook.com',
      pass: 'your-password'
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  },
  
  // Configuration SendGrid
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: 'your-sendgrid-api-key'
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  }
};

async function testSMTPConfiguration(configName, config) {
  console.log(`\n🔍 Test de configuration ${configName}...`);
  console.log(`📡 Host: ${config.host}:${config.port}`);
  console.log(`🔒 Secure: ${config.secure}`);
  
  try {
    const transporter = nodemailer.createTransporter(config);
    
    // Test de connexion avec timeout étendu
    console.log('📡 Vérification de la connexion...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');
    
    // Test d'envoi d'email
    console.log('📧 Test d\'envoi d\'email...');
    const testEmail = {
      from: config.auth.user,
      to: 'test@example.com',
      subject: `Test SMTP ${configName}`,
      html: `
        <h1>Test SMTP ${configName}</h1>
        <p>Configuration testée avec succès !</p>
        <ul>
          <li>Host: ${config.host}</li>
          <li>Port: ${config.port}</li>
          <li>Secure: ${config.secure}</li>
          <li>Connection Timeout: ${config.connectionTimeout}ms</li>
          <li>Greeting Timeout: ${config.greetingTimeout}ms</li>
          <li>Socket Timeout: ${config.socketTimeout}ms</li>
        </ul>
      `
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Email envoyé avec succès !');
    console.log('📧 Message ID:', info.messageId);
    
    return { success: true, config: configName };
    
  } catch (error) {
    console.error(`❌ Erreur avec ${configName}:`, error.message);
    
    // Diagnostic spécifique
    if (error.code === 'ETIMEDOUT') {
      console.log('💡 Solutions pour ETIMEDOUT:');
      console.log('   1. Augmentez les timeouts');
      console.log('   2. Vérifiez votre connexion internet');
      console.log('   3. Essayez un port différent');
      console.log('   4. Utilisez un serveur SMTP différent');
    }
    
    if (error.message.includes('Greeting never received')) {
      console.log('💡 Solutions pour "Greeting never received":');
      console.log('   1. Augmentez le greetingTimeout');
      console.log('   2. Essayez avec secure: false et requireTLS: true');
      console.log('   3. Vérifiez les paramètres de TLS');
      console.log('   4. Essayez un port différent (465 au lieu de 587)');
    }
    
    if (error.code === 'EAUTH') {
      console.log('💡 Solutions pour EAUTH:');
      console.log('   1. Vérifiez votre email et mot de passe');
      console.log('   2. Activez l\'authentification à 2 facteurs');
      console.log('   3. Utilisez un mot de passe d\'application');
    }
    
    return { success: false, config: configName, error: error.message };
  }
}

async function testAllConfigurations() {
  console.log('🚀 Test de toutes les configurations SMTP...');
  console.log('=' * 50);
  
  const results = [];
  
  for (const [configName, config] of Object.entries(smtpConfigs)) {
    const result = await testSMTPConfiguration(configName, config);
    results.push(result);
    
    // Pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 Résultats des tests:');
  console.log('=' * 50);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Configurations réussies: ${successful.length}`);
  successful.forEach(r => console.log(`   - ${r.config}`));
  
  console.log(`❌ Configurations échouées: ${failed.length}`);
  failed.forEach(r => console.log(`   - ${r.config}: ${r.error}`));
  
  if (successful.length > 0) {
    console.log('\n🎉 Recommandation: Utilisez une des configurations réussies dans n8n');
    console.log('📋 Paramètres recommandés pour n8n:');
    const workingConfig = successful[0];
    console.log(JSON.stringify(smtpConfigs[workingConfig.config], null, 2));
  } else {
    console.log('\n⚠️  Aucune configuration n\'a fonctionné. Vérifiez:');
    console.log('   1. Vos credentials SMTP');
    console.log('   2. Votre connexion internet');
    console.log('   3. Les paramètres de firewall');
    console.log('   4. Essayez un service SMTP différent (SendGrid, Mailgun, etc.)');
  }
}

// Configuration recommandée pour n8n
console.log('📋 Configuration recommandée pour n8n:');
console.log('   - Retry on Fail: Activé');
console.log('   - Retry Times: 5');
console.log('   - Retry Delay: 10000ms');
console.log('   - Timeout: 60000ms');
console.log('   - Secure: false (pour port 587)');
console.log('   - Require TLS: true');
console.log('   - Connection Timeout: 30000ms');
console.log('   - Greeting Timeout: 15000ms');
console.log('   - Socket Timeout: 30000ms');
console.log('   - Pool: true');
console.log('   - Max Connections: 5');
console.log('');

testAllConfigurations();
