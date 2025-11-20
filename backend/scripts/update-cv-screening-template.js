require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../database');

async function updateCvScreeningTemplate() {
  try {
    console.log('🔧 [UpdateCVScreening] Démarrage de la mise à jour du template CV Screening...');
    
    // 1. Lire le nouveau JSON du template
    const templatePath = path.join(__dirname, '../../workflows/cv-screening-workflow.json');
    console.log('📖 [UpdateCVScreening] Lecture du fichier:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Fichier template non trouvé: ${templatePath}`);
    }
    
    const templateJson = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    console.log('✅ [UpdateCVScreening] Template JSON lu avec succès');
    console.log('  - Nom:', templateJson.name);
    console.log('  - Nombre de nœuds:', templateJson.nodes?.length);
    
    // Vérifier que le nœud "Send email" est présent
    const sendEmailNode = templateJson.nodes?.find(node => 
      node.name === 'Send email' || node.type === 'n8n-nodes-base.emailSend'
    );
    if (sendEmailNode) {
      console.log('✅ [UpdateCVScreening] Nœud "Send email" trouvé dans le template');
      console.log('  - ID:', sendEmailNode.id);
      console.log('  - Type:', sendEmailNode.type);
      console.log('  - Credentials SMTP:', sendEmailNode.credentials?.smtp?.id || 'NON DÉFINI');
    } else {
      console.warn('⚠️ [UpdateCVScreening] Nœud "Send email" NON trouvé dans le template!');
    }
    
    // Vérifier que le nœud "Webhook Response" est présent
    const webhookResponseNode = templateJson.nodes?.find(node => 
      node.name === 'Webhook Response' || node.type === 'n8n-nodes-base.respondToWebhook'
    );
    if (webhookResponseNode) {
      console.log('✅ [UpdateCVScreening] Nœud "Webhook Response" trouvé dans le template');
    } else {
      console.warn('⚠️ [UpdateCVScreening] Nœud "Webhook Response" NON trouvé dans le template!');
    }
    
    // 2. Rechercher le template "CV Screening" dans la base de données
    console.log('🔍 [UpdateCVScreening] Recherche du template dans la base de données...');
    const templatesResult = await db.query(
      "SELECT * FROM templates WHERE name ILIKE '%CV Screening%' OR name ILIKE '%cv screening%' OR description ILIKE '%CV Screening%'"
    );
    
    if (templatesResult.rows.length === 0) {
      throw new Error('Aucun template CV Screening trouvé dans la base de données');
    }
    
    console.log(`✅ [UpdateCVScreening] ${templatesResult.rows.length} template(s) trouvé(s)`);
    
    for (const template of templatesResult.rows) {
      console.log(`\n🔧 [UpdateCVScreening] Mise à jour du template: ${template.name} (ID: ${template.id})`);
      
      // 3. Mettre à jour le template avec le nouveau JSON
      const updateResult = await db.query(
        'UPDATE templates SET json = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(templateJson), template.id]
      );
      
      if (updateResult.rows.length > 0) {
        const updatedTemplate = updateResult.rows[0];
        console.log('✅ [UpdateCVScreening] Template mis à jour avec succès!');
        console.log('  - ID:', updatedTemplate.id);
        console.log('  - Nom:', updatedTemplate.name);
        
        // Vérifier que le JSON a bien été mis à jour
        const updatedJson = typeof updatedTemplate.json === 'string' 
          ? JSON.parse(updatedTemplate.json) 
          : updatedTemplate.json;
        
        const hasSendEmail = updatedJson.nodes?.some(node => 
          node.name === 'Send email' || node.type === 'n8n-nodes-base.emailSend'
        );
        const hasWebhookResponse = updatedJson.nodes?.some(node => 
          node.name === 'Webhook Response' || node.type === 'n8n-nodes-base.respondToWebhook'
        );
        
        console.log('  - Nœud "Send email" présent:', hasSendEmail ? '✅ OUI' : '❌ NON');
        console.log('  - Nœud "Webhook Response" présent:', hasWebhookResponse ? '✅ OUI' : '❌ NON');
        console.log('  - Nombre de nœuds:', updatedJson.nodes?.length);
      } else {
        console.error('❌ [UpdateCVScreening] Échec de la mise à jour du template');
      }
    }
    
    console.log('\n✅ [UpdateCVScreening] Mise à jour terminée avec succès!');
    console.log('📝 [UpdateCVScreening] Les prochains déploiements utiliseront le nouveau template avec le nœud "Send email"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ [UpdateCVScreening] Erreur:', error);
    console.error('❌ [UpdateCVScreening] Stack:', error.stack);
    process.exit(1);
  }
}

updateCvScreeningTemplate();

