const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialiser le transporteur email
  initializeTransporter() {
    try {
      console.log('🔧 [EmailService] Configuration SMTP:', {
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        user: config.email.smtpUser,
        passwordLength: config.email.smtpPassword ? config.email.smtpPassword.length : 0,
        fromEmail: config.email.fromEmail
      });

      this.transporter = nodemailer.createTransport({
        host: config.email.smtpHost || 'smtp.gmail.com',
        port: config.email.smtpPort || 587,
        secure: false, // true pour 465, false pour autres ports
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPassword
        },
        tls: {
          rejectUnauthorized: false // Pour les environnements de développement
        }
      });

      console.log('✅ [EmailService] Transporteur email initialisé');
    } catch (error) {
      console.error('❌ [EmailService] Erreur initialisation transporteur:', error);
    }
  }

  // Envoyer un email de réinitialisation de mot de passe
  async sendPasswordResetEmail(email, resetLink, userName = 'Utilisateur') {
    try {
      console.log('📧 [EmailService] Configuration SMTP:', {
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        user: config.email.smtpUser,
        fromEmail: config.email.fromEmail
      });

      const mailOptions = {
        from: `"${config.app.name || 'Automivy'}" <${config.email.fromEmail || config.email.smtpUser}>`,
        to: email,
        subject: '🔐 Réinitialisation de votre mot de passe - Automivy',
        html: this.generatePasswordResetEmailHTML(resetLink, userName),
        text: this.generatePasswordResetEmailText(resetLink, userName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] Email de réinitialisation envoyé:', {
        to: email,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('❌ [EmailService] Erreur envoi email:', error);
      throw error;
    }
  }

  // Générer le HTML de l'email de réinitialisation
  generatePasswordResetEmailHTML(resetLink, userName) {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation de mot de passe</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .title {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 30px;
        }
        .reset-button {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .reset-button:hover {
          transform: translateY(-2px);
        }
        .warning {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .link-fallback {
          word-break: break-all;
          background: #f3f4f6;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
          font-family: monospace;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚀 Automivy</div>
          <h1 class="title">Réinitialisation de mot de passe</h1>
        </div>
        
        <div class="content">
          <p>Bonjour <strong>${userName}</strong>,</p>
          
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Automivy.</p>
          
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="reset-button">
              🔐 Réinitialiser mon mot de passe
            </a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important :</strong>
            <ul>
              <li>Ce lien est valide pendant <strong>24 heures</strong></li>
              <li>Il ne peut être utilisé qu'<strong>une seule fois</strong></li>
              <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
            </ul>
          </div>
          
          <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
          <div class="link-fallback">${resetLink}</div>
        </div>
        
        <div class="footer">
          <p>Cet email a été envoyé automatiquement par Automivy</p>
          <p>Si vous avez des questions, contactez notre support</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Générer le texte de l'email de réinitialisation
  generatePasswordResetEmailText(resetLink, userName) {
    return `
Bonjour ${userName},

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Automivy.

Cliquez sur le lien suivant pour créer un nouveau mot de passe :
${resetLink}

IMPORTANT :
- Ce lien est valide pendant 24 heures
- Il ne peut être utilisé qu'une seule fois
- Si vous n'avez pas demandé cette réinitialisation, ignorez cet email

Si vous avez des questions, contactez notre support.

Cordialement,
L'équipe Automivy
    `;
  }

  // Envoyer un email de confirmation de changement de mot de passe
  async sendPasswordChangedConfirmation(email, userName = 'Utilisateur') {
    try {
      const mailOptions = {
        from: `"${config.app.name || 'Automivy'}" <${config.email.fromEmail || config.email.smtpUser}>`,
        to: email,
        subject: '✅ Mot de passe modifié avec succès - Automivy',
        html: this.generatePasswordChangedEmailHTML(userName),
        text: this.generatePasswordChangedEmailText(userName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] Email de confirmation envoyé:', {
        to: email,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('❌ [EmailService] Erreur envoi email confirmation:', error);
      throw error;
    }
  }

  // Générer le HTML de l'email de confirmation
  generatePasswordChangedEmailHTML(userName) {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mot de passe modifié</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .success-icon {
          font-size: 48px;
          color: #10b981;
          margin-bottom: 20px;
        }
        .title {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 30px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚀 Automivy</div>
          <div class="success-icon">✅</div>
          <h1 class="title">Mot de passe modifié avec succès</h1>
        </div>
        
        <div class="content">
          <p>Bonjour <strong>${userName}</strong>,</p>
          
          <p>Votre mot de passe a été modifié avec succès le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}.</p>
          
          <p>Si vous n'avez pas effectué cette modification, contactez immédiatement notre support.</p>
        </div>
        
        <div class="footer">
          <p>Cet email a été envoyé automatiquement par Automivy</p>
          <p>Si vous avez des questions, contactez notre support</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Générer le texte de l'email de confirmation
  generatePasswordChangedEmailText(userName) {
    return `
Bonjour ${userName},

Votre mot de passe a été modifié avec succès le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}.

Si vous n'avez pas effectué cette modification, contactez immédiatement notre support.

Cordialement,
L'équipe Automivy
    `;
  }
}

module.exports = new EmailService();
