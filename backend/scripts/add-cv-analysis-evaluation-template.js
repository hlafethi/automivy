require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../database');

async function addCvAnalysisEvaluationTemplate() {
  try {
    console.log('🔧 [AddCVAnalysis] Démarrage de l\'ajout du template CV Analysis and Candidate Evaluation...');
    
    // 1. Lire le JSON du template
    const templatePath = path.join(__dirname, '../../workflows/cv-analysis-evaluation-workflow.json');
    console.log('📖 [AddCVAnalysis] Lecture du fichier:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Fichier template non trouvé: ${templatePath}`);
    }
    
    const templateJson = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    console.log('✅ [AddCVAnalysis] Template JSON lu avec succès');
    console.log('  - Nom:', templateJson.name);
    console.log('  - Nombre de nœuds:', templateJson.nodes?.length);
    
    // Vérifier les nœuds importants
    const webhookNode = templateJson.nodes?.find(node => 
      node.type === 'n8n-nodes-base.webhook'
    );
    if (webhookNode) {
      console.log('✅ [AddCVAnalysis] Nœud Webhook trouvé');
      console.log('  - Path:', webhookNode.parameters?.path);
    }
    
    const sendEmailNode = templateJson.nodes?.find(node => 
      node.name === 'Send Email' || node.type === 'n8n-nodes-base.emailSend'
    );
    if (sendEmailNode) {
      console.log('✅ [AddCVAnalysis] Nœud "Send Email" trouvé');
      console.log('  - Credentials SMTP:', sendEmailNode.credentials?.smtp?.id || 'NON DÉFINI');
    }
    
    const openRouterNode = templateJson.nodes?.find(node => 
      node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter'
    );
    if (openRouterNode) {
      console.log('✅ [AddCVAnalysis] Nœud OpenRouter trouvé');
      console.log('  - Credentials:', openRouterNode.credentials?.openRouterApi?.id || 'NON DÉFINI');
    }
    
    // 2. Vérifier si le template existe déjà
    console.log('🔍 [AddCVAnalysis] Vérification si le template existe déjà...');
    const existingTemplates = await db.query(
      "SELECT * FROM templates WHERE name ILIKE '%CV Analysis%' OR name ILIKE '%cv analysis%' OR description ILIKE '%CV Analysis%'"
    );
    
    if (existingTemplates.rows.length > 0) {
      console.log(`⚠️ [AddCVAnalysis] ${existingTemplates.rows.length} template(s) existant(s) trouvé(s)`);
      
      for (const template of existingTemplates.rows) {
        console.log(`\n🔄 [AddCVAnalysis] Mise à jour du template existant: ${template.name} (ID: ${template.id})`);
        
        const updateResult = await db.query(
          'UPDATE templates SET json = $1, description = $2 WHERE id = $3 RETURNING *',
          [
            JSON.stringify(templateJson),
            'Analyse et évaluation automatisée de CV avec IA. Extrait les qualifications, l\'historique professionnel et les compétences, puis évalue la correspondance avec le profil recherché.',
            template.id
          ]
        );
        
        if (updateResult.rows.length > 0) {
          console.log('✅ [AddCVAnalysis] Template mis à jour avec succès!');
          console.log('  - ID:', updateResult.rows[0].id);
          console.log('  - Nom:', updateResult.rows[0].name);
        }
      }
    } else {
      // 3. Créer le nouveau template
      console.log('📝 [AddCVAnalysis] Création du nouveau template...');
      
      // Récupérer l'ID de l'admin (premier utilisateur admin ou utilisateur système)
      const adminResult = await db.query(
        "SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1"
      );
      
      let createdBy = null;
      if (adminResult.rows.length > 0) {
        createdBy = adminResult.rows[0].id;
        console.log('✅ [AddCVAnalysis] Admin trouvé:', createdBy);
      } else {
        // Si pas d'admin, utiliser le premier utilisateur ou null
        const userResult = await db.query('SELECT id FROM user_profiles LIMIT 1');
        if (userResult.rows.length > 0) {
          createdBy = userResult.rows[0].id;
          console.log('⚠️ [AddCVAnalysis] Aucun admin trouvé, utilisation du premier utilisateur:', createdBy);
        } else {
          console.log('⚠️ [AddCVAnalysis] Aucun utilisateur trouvé, created_by sera null');
        }
      }
      
      const insertResult = await db.query(
        `INSERT INTO templates (created_by, name, description, json, setup_time, execution_time) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          createdBy,
          'CV Analysis and Candidate Evaluation',
          'Analyse et évaluation automatisée de CV avec IA. Extrait les qualifications, l\'historique professionnel et les compétences, puis évalue la correspondance avec le profil recherché. Génère un score de 1 à 10 et envoie un rapport par email.',
          JSON.stringify(templateJson),
          5, // setup_time en minutes
          3  // execution_time en minutes
        ]
      );
      
      if (insertResult.rows.length > 0) {
        const newTemplate = insertResult.rows[0];
        console.log('✅ [AddCVAnalysis] Template créé avec succès!');
        console.log('  - ID:', newTemplate.id);
        console.log('  - Nom:', newTemplate.name);
        console.log('  - Description:', newTemplate.description);
      } else {
        throw new Error('Échec de la création du template');
      }
    }
    
    console.log('\n✅ [AddCVAnalysis] Opération terminée avec succès!');
    console.log('📝 [AddCVAnalysis] Le template "CV Analysis and Candidate Evaluation" est maintenant disponible dans le catalogue');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ [AddCVAnalysis] Erreur:', error);
    console.error('❌ [AddCVAnalysis] Stack:', error.stack);
    process.exit(1);
  }
}

addCvAnalysisEvaluationTemplate();

