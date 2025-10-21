const nodemailer = require('nodemailer');

// Configuration SMTP de test
const smtpConfig = {
  host: 'smtp.gmail.com', // Remplacez par votre serveur SMTP
  port: 587,
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: 'your-email@gmail.com', // Remplacez par votre email
    pass: 'your-app-password' // Remplacez par votre mot de passe d'application
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000
};

async function testSMTPConnection() {
  console.log('🔍 Test de connexion SMTP...');
  
  try {
    // Créer le transporteur
    const transporter = nodemailer.createTransporter(smtpConfig);
    
    // Vérifier la connexion
    console.log('📡 Vérification de la connexion...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');
    
    // Test d'envoi d'email
    console.log('📧 Test d\'envoi d\'email...');
    const testEmail = {
      from: 'your-email@gmail.com',
      to: 'test@example.com',
      subject: 'Test SMTP Configuration',
      html: '<h1>Test réussi !</h1><p>La configuration SMTP fonctionne correctement.</p>'
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Email envoyé avec succès !');
    console.log('📧 Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Erreur SMTP:', error.message);
    
    if (error.code === 'ETIMEDOUT') {
      console.log('💡 Solutions pour ETIMEDOUT:');
      console.log('   1. Vérifiez votre connexion internet');
      console.log('   2. Vérifiez les paramètres de firewall');
      console.log('   3. Augmentez les timeouts dans n8n');
      console.log('   4. Utilisez un serveur SMTP différent');
    }
    
    if (error.code === 'EAUTH') {
      console.log('💡 Solutions pour EAUTH:');
      console.log('   1. Vérifiez votre email et mot de passe');
      console.log('   2. Activez l\'authentification à 2 facteurs');
      console.log('   3. Utilisez un mot de passe d\'application');
    }
  }
}

// Configuration recommandée pour n8n
console.log('📋 Configuration recommandée pour n8n:');
console.log('   - Retry on Fail: Activé');
console.log('   - Retry Times: 3');
console.log('   - Retry Delay: 5000ms');
console.log('   - Timeout: 30000ms');
console.log('   - Secure: true');
console.log('   - Require TLS: true');
console.log('   - Connection Timeout: 10000ms');
console.log('   - Greeting Timeout: 5000ms');
console.log('   - Socket Timeout: 10000ms');
console.log('');

testSMTPConnection();
