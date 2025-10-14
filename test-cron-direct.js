/**
 * Test direct du cron job avec l'URL webhook correcte
 * Simule le système de planification sans passer par le backend
 */

import fetch from 'node-fetch';
import cron from 'node-cron';

async function testCronDirect() {
  try {
    console.log('🕐 Test direct du cron job');
    
    const webhookUrl = 'https://n8n.globalsaas.eu/webhook/email-summary-trigger';
    console.log(`🔗 URL webhook: ${webhookUrl}`);
    
    // Planifier dans 1 minute
    const now = new Date();
    const testTime = new Date(now.getTime() + 1 * 60000); // +1 minute
    const schedule = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`🕐 Planification à ${schedule} (dans 1 minute)`);
    
    // Créer le cron job
    const [hours, minutes] = schedule.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;
    
    console.log(`🕐 Expression cron: ${cronExpression}`);
    
    const job = cron.schedule(cronExpression, async () => {
      console.log(`🚀 Déclenchement du webhook à ${schedule}`);
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triggeredBy: 'cron-scheduler',
            timestamp: new Date().toISOString(),
            schedule: schedule
          })
        });
        
        if (response.ok) {
          const result = await response.text();
          console.log(`✅ Webhook déclenché avec succès: ${result}`);
        } else {
          console.log(`❌ Webhook échoué: ${response.status}`);
        }
        
      } catch (error) {
        console.error('❌ Erreur webhook:', error);
      }
      
      // Arrêter le job après exécution
      job.destroy();
      console.log('🕐 Job arrêté');
      
    }, {
      scheduled: true,
      timezone: 'Europe/Paris'
    });
    
    console.log('✅ Cron job créé et planifié');
    console.log('⏰ Attendez 1 minute pour voir le déclenchement automatique...');
    console.log('   (Le job s\'arrêtera automatiquement après exécution)');
    
  } catch (error) {
    console.error('❌ Erreur lors du test cron:', error);
  }
}

testCronDirect();
