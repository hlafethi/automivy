require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../database');

async function updateCVAnalysisEvaluationTemplate() {
  try {
    console.log('🔧 [UpdateCVAnalysis] Démarrage de la mise à jour du template CV Analysis and Candidate Evaluation...');

    const templatePath = path.join(__dirname, '../../workflows/cv-analysis-evaluation-workflow.json');
    console.log('📖 [UpdateCVAnalysis] Lecture du fichier:', templatePath);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Fichier template non trouvé: ${templatePath}`);
    }

    const templateJson = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    console.log('✅ [UpdateCVAnalysis] Template JSON lu avec succès');
    console.log('  - Nom:', templateJson.name);
    console.log('  - Nombre de nœuds:', templateJson.nodes?.length);

    const webhookNode = templateJson.nodes?.find(node =>
      node.type === 'n8n-nodes-base.webhook' && node.name === 'Webhook Trigger (AUTOMIVY)'
    );
    if (webhookNode) {
      console.log('✅ [UpdateCVAnalysis] Nœud Webhook trouvé');
      console.log('  - Path:', webhookNode.parameters?.path);
    } else {
      console.warn('⚠️ [UpdateCVAnalysis] Nœud Webhook NON trouvé!');
    }

    const sendEmailNode = templateJson.nodes?.find(node =>
      node.name === 'Send Email Report' || node.type === 'n8n-nodes-base.emailSend'
    );
    if (sendEmailNode) {
      console.log('✅ [UpdateCVAnalysis] Nœud "Send Email Report" trouvé');
      console.log('  - Credentials SMTP:', sendEmailNode.credentials?.smtp?.id || 'NON DÉFINI');
    } else {
      console.warn('⚠️ [UpdateCVAnalysis] Nœud "Send Email Report" NON trouvé!');
    }

    const extractNameEmailNode = templateJson.nodes?.find(node =>
      node.name === 'Extract Name and Email'
    );
    if (extractNameEmailNode) {
      console.log('✅ [UpdateCVAnalysis] Nœud "Extract Name and Email" trouvé');
    } else {
      console.warn('⚠️ [UpdateCVAnalysis] Nœud "Extract Name and Email" NON trouvé!');
    }

    const aggregateNode = templateJson.nodes?.find(node =>
      node.name === 'Aggregate Results'
    );
    if (aggregateNode) {
      console.log('✅ [UpdateCVAnalysis] Nœud "Aggregate Results" trouvé');
    } else {
      console.warn('⚠️ [UpdateCVAnalysis] Nœud "Aggregate Results" NON trouvé!');
    }

    console.log('🔍 [UpdateCVAnalysis] Vérification si le template existe déjà...');
    const existingTemplate = await db.query(
      "SELECT * FROM templates WHERE name = $1",
      [templateJson.name]
    );

    if (existingTemplate.rows.length > 0) {
      console.log(`⚠️ [UpdateCVAnalysis] Le template "${templateJson.name}" existe déjà (ID: ${existingTemplate.rows[0].id}). Mise à jour...`);
      const updateResult = await db.query(
        'UPDATE templates SET json = $1, description = $2 WHERE id = $3 RETURNING *',
        [
          JSON.stringify(templateJson),
          "Analyse et évaluation automatisée de CV avec IA. Traite plusieurs CVs, extrait automatiquement le nom et l'email de chaque candidat, évalue chaque CV avec un score de 1 à 10, et génère un rapport comparatif avec identification du meilleur candidat. Envoie un email avec tous les résultats.",
          existingTemplate.rows[0].id
        ]
      );
      console.log('✅ [UpdateCVAnalysis] Template mis à jour avec succès!');
      console.log('  - ID:', updateResult.rows[0].id);
    } else {
      console.log('📝 [UpdateCVAnalysis] Création du nouveau template...');
      const adminUserResult = await db.query("SELECT id FROM users WHERE email = 'admin@heleam.com'");
      const adminUserId = adminUserResult.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
      console.log('✅ [UpdateCVAnalysis] Admin trouvé:', adminUserId);

      const newTemplate = await db.createTemplate(
        adminUserId,
        templateJson.name,
        "Analyse et évaluation automatisée de CV avec IA. Traite plusieurs CVs, extrait automatiquement le nom et l'email de chaque candidat, évalue chaque CV avec un score de 1 à 10, et génère un rapport comparatif avec identification du meilleur candidat. Envoie un email avec tous les résultats.",
        templateJson
      );
      console.log('✅ [UpdateCVAnalysis] Template créé avec succès!');
      console.log('  - ID:', newTemplate.id);
    }

    console.log('\n✅ [UpdateCVAnalysis] Opération terminée avec succès!');
    console.log(`📝 [UpdateCVAnalysis] Le template "${templateJson.name}" est maintenant disponible dans le catalogue`);

    process.exit(0);
  } catch (error) {
    console.error('❌ [UpdateCVAnalysis] Erreur:', error);
    console.error('❌ [UpdateCVAnalysis] Stack:', error.stack);
    process.exit(1);
  }
}

updateCVAnalysisEvaluationTemplate();

