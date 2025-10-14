/**
 * Test final du système de planification
 * Teste directement le webhook n8n
 */

import fetch from 'node-fetch';

async function testScheduleFinal() {
  try {
    console.log('🔧 Test final du système de planification');
    
    const webhookUrl = 'https://n8n.globalsaas.eu/webhook/email-summary-trigger';
    console.log(`🔗 URL webhook: ${webhookUrl}`);
    
    // Vérifier l'heure actuelle
    const now = new Date();
    console.log(`🕐 Heure actuelle: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    
    // Planifier pour 15h00 (dans 1 minute si on est à 14h59)
    const schedule = '15:00';
    console.log(`🕐 Planification pour ${schedule}`);
    
    // Créer le cron job
    const [hours, minutes] = schedule.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;
    
    console.log(`🕐 Expression cron: ${cronExpression}`);
    
    let executed = false;
    
    const cron = await import('node-cron');
    
    const job = cron.default.schedule(cronExpression, async () => {
      if (executed) {
        console.log('⚠️ Job déjà exécuté, ignoré');
        return;
      }
      
      executed = true;
      console.log(`🚀 DÉCLENCHEMENT À ${schedule} !`);
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triggeredBy: 'cron-scheduler-final',
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
      console.log('🕐 Job arrêté après exécution unique');
      
    }, {
      scheduled: true,
      timezone: 'Europe/Paris'
    });
    
    console.log('✅ Cron job créé et planifié pour 15h00');
    console.log('⏰ Attendez le déclenchement à 15h00...');
    console.log('🔄 Script en attente... (Ctrl+C pour arrêter)');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testScheduleFinal();
