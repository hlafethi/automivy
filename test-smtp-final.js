import nodemailer from 'nodemailer';

// Configuration SMTP exacte
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

async function testSMTPFinal() {
  try {
    console.log('🔧 Configuration SMTP finale:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.auth.user,
      passwordLength: smtpConfig.auth.pass.length,
      passwordType: typeof smtpConfig.auth.pass
    });

    console.log('📧 Test de connexion SMTP...');
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Test de connexion
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');
    
    // Test d'envoi d'email de réinitialisation
    const resetLink = 'http://localhost:5173/reset-password?token=test-token-123';
    const testEmail = {
      from: '"Automivy" <admin@heleam.com>',
      to: 'user@heleam.com',
      subject: '🔐 Réinitialisation de votre mot de passe - Automivy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Réinitialisation de mot de passe</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #007bff;">🔐 Réinitialisation de votre mot de passe</h1>
            <p>Bonjour,</p>
            <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
            <p>Pour réinitialiser votre mot de passe, veuillez cliquer sur le bouton ci-dessous :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Réinitialiser mon mot de passe</a>
            </div>
            <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">${resetLink}</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
            <p>Merci,<br>L'équipe Automivy</p>
          </div>
        </body>
        </html>
      `,
      text: `Bonjour,\n\nNous avons reçu une demande de réinitialisation de mot de passe pour votre compte.\n\nPour réinitialiser votre mot de passe, veuillez cliquer sur le lien suivant : ${resetLink}\n\nSi vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.\n\nMerci,\nL'équipe Automivy`
    };
    
    const result = await transporter.sendMail(testEmail);
    console.log('✅ Email de réinitialisation envoyé:', result.messageId);
    console.log('🎉 Test SMTP réussi ! L\'envoi d\'email fonctionne parfaitement.');
    
  } catch (error) {
    console.error('❌ Erreur SMTP:', error.message);
    console.error('Détails:', error);
  }
}

testSMTPFinal();
