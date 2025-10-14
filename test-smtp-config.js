import nodemailer from 'nodemailer';

// Configuration SMTP directe
const smtpConfig = {
  host: 'mail.heleam.com',
  port: 587,
  secure: false,
  auth: {
    user: 'admin@heleam.com',
    pass: 'Fethi@2025*'
  },
  tls: {
    rejectUnauthorized: false
  }
};

console.log('🔧 Configuration SMTP:', {
  host: smtpConfig.host,
  port: smtpConfig.port,
  user: smtpConfig.auth.user,
  passwordLength: smtpConfig.auth.pass.length,
  passwordType: typeof smtpConfig.auth.pass
});

async function testSMTP() {
  try {
    console.log('📧 Test de connexion SMTP...');
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Test de connexion
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');
    
    // Test d'envoi d'email
    const testEmail = {
      from: '"Automivy" <admin@heleam.com>',
      to: 'user@heleam.com',
      subject: 'Test SMTP - Automivy',
      text: 'Ceci est un test d\'envoi d\'email depuis Automivy.',
      html: '<h1>Test SMTP</h1><p>Ceci est un test d\'envoi d\'email depuis Automivy.</p>'
    };
    
    const result = await transporter.sendMail(testEmail);
    console.log('✅ Email de test envoyé:', result.messageId);
    
  } catch (error) {
    console.error('❌ Erreur SMTP:', error.message);
    console.error('Détails:', error);
  }
}

testSMTP();
