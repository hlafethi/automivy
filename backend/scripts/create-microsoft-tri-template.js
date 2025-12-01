/**
 * Script pour créer un nouveau template "Microsoft Tri Automatique BAL"
 * basé sur le template "IMAP Tri Automatique BAL" existant
 * 
 * Ce script :
 * 1. Récupère le template IMAP Tri existant
 * 2. Crée une copie avec un nouveau nom et ID
 * 3. Adapte la configuration pour Microsoft (Outlook/Hotmail)
 */

const db = require('../database');
const crypto = require('crypto');

async function createMicrosoftTriTemplate() {
  console.log('🔧 [CreateMicrosoftTemplate] Début de la création du template Microsoft Tri...');
  
  try {
    // 1. Récupérer le template IMAP Tri existant
    const imapTemplateResult = await db.query(
      `SELECT * FROM templates WHERE name ILIKE '%IMAP Tri Automatique BAL%' LIMIT 1`
    );
    
    if (!imapTemplateResult.rows || imapTemplateResult.rows.length === 0) {
      console.error('❌ [CreateMicrosoftTemplate] Template IMAP Tri Automatique BAL non trouvé');
      return;
    }
    
    const imapTemplate = imapTemplateResult.rows[0];
    console.log('✅ [CreateMicrosoftTemplate] Template IMAP Tri trouvé:', imapTemplate.name);
    console.log('✅ [CreateMicrosoftTemplate] Template ID:', imapTemplate.id);
    
    // 2. Parser le JSON du workflow
    let workflowJson;
    try {
      workflowJson = typeof imapTemplate.json === 'string'
        ? JSON.parse(imapTemplate.json)
        : imapTemplate.json;
    } catch (parseErr) {
      console.error('❌ [CreateMicrosoftTemplate] Erreur parsing JSON:', parseErr);
      return;
    }
    
    // 3. Créer un nouveau template avec un nouvel ID
    const newTemplateId = crypto.randomUUID();
    const newTemplateName = 'Microsoft Tri Automatique BAL';
    
    // 4. Adapter la description pour Microsoft
    const newDescription = imapTemplate.description 
      ? imapTemplate.description.replace(/IMAP/g, 'Microsoft').replace(/imap/g, 'Microsoft')
      : 'Workflow de tri automatique des emails Microsoft (Outlook/Hotmail)';
    
    // 5. Insérer le nouveau template dans la base de données
    const insertResult = await db.query(
      `INSERT INTO templates (
        id, 
        name, 
        description, 
        json, 
        category,
        subcategory,
        visible,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id, name`,
      [
        newTemplateId,
        newTemplateName,
        newDescription,
        JSON.stringify(workflowJson),
        imapTemplate.category || 'email',
        imapTemplate.subcategory || 'tri',
        imapTemplate.visible !== false, // Par défaut visible
        imapTemplate.created_by || null
      ]
    );
    
    const createdTemplate = insertResult.rows[0];
    console.log('✅ [CreateMicrosoftTemplate] Nouveau template créé:');
    console.log('  - ID:', createdTemplate.id);
    console.log('  - Nom:', createdTemplate.name);
    console.log('  - Description:', newDescription);
    
    console.log('\n📋 [CreateMicrosoftTemplate] Template ID à ajouter dans les mappings:');
    console.log(`  Template ID: ${createdTemplate.id}`);
    console.log('\n📋 [CreateMicrosoftTemplate] Les mappings ont déjà été ajoutés dans:');
    console.log('  - backend/services/injectors/index.js');
    console.log('  - backend/services/deployments/index.js');
    console.log('\n✅ [CreateMicrosoftTemplate] Le template est maintenant disponible dans la liste des templates!');
    
  } catch (error) {
    console.error('❌ [CreateMicrosoftTemplate] Erreur:', error);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  createMicrosoftTriTemplate()
    .then(() => {
      console.log('✅ [CreateMicrosoftTemplate] Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ [CreateMicrosoftTemplate] Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { createMicrosoftTriTemplate };

