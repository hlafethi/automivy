const emailService = require('./services/emailService');

async function testEmailService() {
  try {
    console.log('📧 Test du service email...');
    
    const testLink = 'http://localhost:5173/reset-password?token=test-token-123';
    const result = await emailService.sendPasswordResetEmail('user@heleam.com', testLink, 'Test User');
    
    console.log('✅ Résultat:', result);
    
  } catch (error) {
    console.error('❌ Erreur service email:', error.message);
    console.error('Détails:', error);
  }
}

testEmailService();
