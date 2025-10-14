/**
 * Test de cron job corrigé
 * S'exécute une seule fois par jour à l'heure spécifiée
 */

import fetch from 'node-fetch';
import cron from 'node-cron';

async function testCronFixed() {
  try {
    console.log('🕐 Test de cron job corrigé (une seule fois par jour)');
    
    const webhookUrl = 'https://n8n.globalsaas.eu/webhook/email-summary-trigger';
    console.log(`🔗 URL webhook: ${webhookUrl}`);
    
    // Planifier pour 14h40 (dans 2 minutes)
    const now = new Date();
    const testTime = new Date(now.getTime() + 2 * 60000); // +2 minutes
    const schedule = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`🕐 Planification pour ${schedule} (dans 2 minutes)`);
    
    // Créer le cron job avec une exécution unique
    const [hours, minutes] = schedule.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;
    
    console.log(`🕐 Expression cron: ${cronExpression}`);
    
    let executed = false; // Flag pour éviter les exécutions multiples
    
    const job = cron.schedule(cronExpression, async () => {
      if (executed) {
        console.log('⚠️ Job déjà exécuté, ignoré');
        return;
      }
      
      executed = true;
      console.log(`🚀 DÉCLENCHEMENT UNIQUE À ${schedule} !`);
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triggeredBy: 'cron-scheduler-fixed',
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
    
    console.log('✅ Cron job créé et planifié (exécution unique)');
    console.log('⏰ Attendez le déclenchement à 14h40...');
    console.log('🔄 Script en attente... (Ctrl+C pour arrêter)');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testCronFixed();
