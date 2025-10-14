/**
 * Test de planification pour 14h37
 * Vérifie si le système de planification fonctionne
 */

import fetch from 'node-fetch';
import cron from 'node-cron';

async function testSchedule1437() {
  try {
    console.log('🕐 Test de planification pour 14h37');
    
    const webhookUrl = 'https://n8n.globalsaas.eu/webhook/email-summary-trigger';
    console.log(`🔗 URL webhook: ${webhookUrl}`);
    
    // Vérifier l'heure actuelle
    const now = new Date();
    console.log(`🕐 Heure actuelle: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    
    // Planifier pour 14h37 (dans 1 minute si on est à 14h36)
    const schedule = '14:37';
    console.log(`🕐 Planification pour ${schedule}`);
    
    // Créer le cron job
    const [hours, minutes] = schedule.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;
    
    console.log(`🕐 Expression cron: ${cronExpression}`);
    
    const job = cron.schedule(cronExpression, async () => {
      console.log(`🚀 DÉCLENCHEMENT À ${schedule} !`);
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triggeredBy: 'cron-scheduler-1437',
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
    
    console.log('✅ Cron job créé et planifié pour 14h37');
    console.log('⏰ Attendez le déclenchement à 14h37...');
    
    // Garder le script actif
    console.log('🔄 Script en attente... (Ctrl+C pour arrêter)');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testSchedule1437();
