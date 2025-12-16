/**
 * Script pour créer les 3 templates LinkedIn dans la base de données
 * 
 * Usage: node backend/scripts/create-linkedin-templates.js
 * 
 * Ce script crée les 3 workflows LinkedIn qui fonctionnent ensemble :
 * 1. LinkedIn Post Generator - Principal
 * 2. LinkedIn Token Monitor - Surveillance Expiration
 * 3. LinkedIn OAuth Handler - Inscription & Reconnexion
 */

const db = require('../database');
const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers JSON des workflows
// Les fichiers sont dans C:\Users\direc\Downloads\ (hors du projet)
const userHomeDir = process.env.USERPROFILE || process.env.HOME || '';
const downloadsDir = path.join(userHomeDir, 'Downloads');

const WORKFLOW_FILES = {
  postGenerator: path.join(downloadsDir, 'workflow-1-linkedin-post-generator.json'),
  tokenMonitor: path.join(downloadsDir, 'workflow-2-token-monitor.json'),
  oauthHandler: path.join(downloadsDir, 'workflow-3-oauth-handler.json')
};

// Configuration des templates
const TEMPLATES_CONFIG = [
  {
    name: 'LinkedIn Post Generator - Principal',
    description: 'Génère et publie automatiquement des posts LinkedIn avec IA. Vérifie la validité du token avant publication.',
    fileKey: 'postGenerator',
    visible: true
  },
  {
    name: 'LinkedIn Token Monitor - Surveillance Expiration',
    description: 'Surveille l\'expiration des tokens LinkedIn et envoie des notifications aux utilisateurs. S\'exécute quotidiennement.',
    fileKey: 'tokenMonitor',
    visible: true
  },
  {
    name: 'LinkedIn OAuth Handler - Inscription & Reconnexion',
    description: 'Gère le flux OAuth LinkedIn pour l\'inscription et la reconnexion des utilisateurs. Met à jour les tokens dans NocoDB.',
    fileKey: 'oauthHandler',
    visible: true
  }
];

async function createLinkedInTemplates() {
  console.log('🚀 Création des templates LinkedIn...\n');
  
  try {
    // Récupérer un utilisateur admin (ou le premier utilisateur)
    const adminUsers = await db.query(
      'SELECT * FROM users WHERE role = $1 ORDER BY created_at LIMIT 1',
      ['admin']
    );
    
    if (adminUsers.rows.length === 0) {
      // Si pas d'admin, prendre le premier utilisateur
      const allUsers = await db.query('SELECT * FROM users ORDER BY created_at LIMIT 1');
      if (allUsers.rows.length === 0) {
        throw new Error('Aucun utilisateur trouvé dans la base de données. Créez d\'abord un utilisateur.');
      }
      var adminId = allUsers.rows[0].id;
      console.log('⚠️  Aucun admin trouvé, utilisation du premier utilisateur:', allUsers.rows[0].email);
    } else {
      var adminId = adminUsers.rows[0].id;
      console.log('✅ Utilisateur admin trouvé:', adminUsers.rows[0].email);
    }
    
    const createdTemplates = [];
    
    // Créer chaque template
    for (const templateConfig of TEMPLATES_CONFIG) {
      console.log(`\n📝 Création du template: ${templateConfig.name}`);
      
      // Vérifier si le template existe déjà
      const existing = await db.query(
        'SELECT * FROM templates WHERE name = $1',
        [templateConfig.name]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⚠️  Template "${templateConfig.name}" existe déjà (ID: ${existing.rows[0].id})`);
        console.log('   Suppression de l\'ancien template...');
        await db.query('DELETE FROM templates WHERE id = $1', [existing.rows[0].id]);
      }
      
      // Lire le fichier JSON du workflow
      const workflowFilePath = WORKFLOW_FILES[templateConfig.fileKey];
      if (!fs.existsSync(workflowFilePath)) {
        console.error(`❌ Fichier workflow introuvable: ${workflowFilePath}`);
        console.error('   Assurez-vous que les fichiers JSON sont dans le dossier Downloads/');
        continue;
      }
      
      let workflowJson;
      try {
        const workflowFileContent = fs.readFileSync(workflowFilePath, 'utf8');
        workflowJson = JSON.parse(workflowFileContent);
        console.log('   ✅ Fichier JSON lu avec succès');
      } catch (parseError) {
        console.error(`❌ Erreur parsing JSON pour ${templateConfig.name}:`, parseError.message);
        continue;
      }
      
      // Vérifier que le workflow a les placeholders corrects
      const workflowString = JSON.stringify(workflowJson);
      const hasPlaceholders = 
        workflowString.includes('YOUR_NOCODB_CREDENTIAL_ID') ||
        workflowString.includes('YOUR_LINKEDIN_CREDENTIAL_ID') ||
        workflowString.includes('YOUR_SMTP_CREDENTIAL_ID') ||
        workflowString.includes('YOUR_OPENROUTER_CREDENTIAL_ID');
      
      if (!hasPlaceholders) {
        console.log('   ⚠️  Aucun placeholder détecté - le workflow sera injecté avec les credentials lors du déploiement');
      } else {
        console.log('   ✅ Placeholders détectés dans le workflow');
      }
      
      // Créer le template
      try {
        const template = await db.createTemplate(
          adminId,
          templateConfig.name,
          templateConfig.description,
          workflowJson,
          null, // setup_time
          null  // execution_time
        );
        
        // Rendre le template visible (si la colonne existe)
        try {
          await db.updateTemplateVisibility(template.id, templateConfig.visible);
        } catch (visibilityError) {
          // La colonne visible n'existe peut-être pas, ce n'est pas bloquant
          console.log('   ⚠️  Colonne visible non disponible, template créé quand même');
        }
        
        createdTemplates.push({
          id: template.id,
          name: template.name,
          description: template.description
        });
        
        console.log(`   ✅ Template créé avec succès (ID: ${template.id})`);
      } catch (createError) {
        console.error(`❌ Erreur création template ${templateConfig.name}:`, createError.message);
        continue;
      }
    }
    
    // Résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`✅ Templates créés: ${createdTemplates.length}/${TEMPLATES_CONFIG.length}`);
    
    if (createdTemplates.length > 0) {
      console.log('\n📋 Templates créés:');
      createdTemplates.forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.name}`);
        console.log(`      ID: ${t.id}`);
        console.log(`      Description: ${t.description.substring(0, 60)}...`);
      });
    }
    
    if (createdTemplates.length < TEMPLATES_CONFIG.length) {
      console.log('\n⚠️  Certains templates n\'ont pas pu être créés. Vérifiez les erreurs ci-dessus.');
    } else {
      console.log('\n🎉 Tous les templates LinkedIn ont été créés avec succès !');
      console.log('\n📌 Prochaines étapes:');
      console.log('   1. Configurez les variables d\'environnement dans n8n:');
      console.log('      - LINKEDIN_CLIENT_ID');
      console.log('      - LINKEDIN_CLIENT_SECRET');
      console.log('      - LINKEDIN_REDIRECT_URI');
      console.log('      - NOCODB_USERS_TABLE');
      console.log('      - NOCODB_POSTS_TABLE');
      console.log('      - APP_URL');
      console.log('      - SMTP_FROM_EMAIL');
      console.log('   2. Testez le déploiement via SmartDeployModal');
      console.log('   3. Les 3 workflows seront déployés ensemble automatiquement');
    }
    
    process.exit(createdTemplates.length === TEMPLATES_CONFIG.length ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  createLinkedInTemplates()
    .then(() => {
      console.log('\n✅ Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { createLinkedInTemplates };

