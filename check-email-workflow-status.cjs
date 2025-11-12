/**
 * Script pour vérifier l'état du workflow "v2 Template fonctionnel resume email"
 * pour user@heleam.com
 */

const { Pool } = require('pg');
const https = require('https');
const http = require('http');

// Charger les variables d'environnement
try {
  require('dotenv').config({ path: './backend/.env' });
} catch (e) {
  // Si le fichier backend/.env n'existe pas, essayer .env à la racine
  try {
    require('dotenv').config({ path: './.env' });
  } catch (e2) {
    // Continuer sans fichier .env si les valeurs par défaut sont suffisantes
  }
}

const pool = new Pool({
  host: process.env.DB_HOST || process.env.VITE_DB_HOST || '147.93.58.155',
  port: process.env.DB_PORT || process.env.VITE_DB_PORT || 5432,
  database: process.env.DB_NAME || process.env.VITE_DB_NAME || 'automivy',
  user: process.env.DB_USER || process.env.VITE_DB_USER || 'fethi',
  password: process.env.DB_PASSWORD || process.env.VITE_DB_PASSWORD || 'Fethi@2025!',
});

const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function checkWorkflowStatus() {
  console.log('🔍 Vérification du workflow "v2 Template fonctionnel resume email"...\n');

  try {
    // 1. Vérifier l'utilisateur
    console.log('📋 1. Vérification de l\'utilisateur user@heleam.com...');
    const userResult = await pool.query('SELECT id, email, role FROM users WHERE email = $1', ['user@heleam.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé !');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ Utilisateur trouvé: ${user.email} (ID: ${user.id})\n`);

    // 2. Vérifier le template dans la base de données
    console.log('📋 2. Vérification du template dans la base de données...');
    const templateResult = await pool.query(
      `SELECT id, name, description, json, created_by 
       FROM templates 
       WHERE name LIKE '%v2%Template%fonctionnel%resume%email%' 
       OR name LIKE '%résumé%email%' 
       ORDER BY created_at DESC LIMIT 1`
    );
    
    if (templateResult.rows.length > 0) {
      const template = templateResult.rows[0];
      console.log(`✅ Template trouvé: ${template.name} (ID: ${template.id})`);
      console.log(`   Description: ${template.description}`);
      
      // Vérifier le JSON du template pour voir la configuration du schedule
      if (template.json && typeof template.json === 'object') {
        const templateJson = template.json;
        console.log(`   Nombre de nœuds: ${templateJson.nodes?.length || 0}`);
        
        // Chercher le nœud schedule
        const scheduleNode = templateJson.nodes?.find((n) => 
          n.type === 'n8n-nodes-base.scheduleTrigger' || 
          n.type === 'n8n-nodes-base.cron' ||
          (n.name && n.name.toLowerCase().includes('schedule')) ||
          (n.name && n.name.toLowerCase().includes('cron'))
        );
        
        if (scheduleNode) {
          console.log(`   ✅ Nœud schedule trouvé: ${scheduleNode.name}`);
          console.log(`   Configuration:`, JSON.stringify(scheduleNode.parameters, null, 2));
        } else {
          console.log(`   ⚠️  Aucun nœud schedule trouvé dans le template`);
        }
      }
    } else {
      console.log('❌ Template non trouvé dans la base de données');
    }
    console.log('');

    // 3. Vérifier les workflows déployés pour cet utilisateur
    console.log('📋 3. Vérification des workflows déployés pour cet utilisateur...');
    const workflowsResult = await pool.query(
      `SELECT w.id, w.name, w.is_active, w.n8n_workflow_id, w.params as json, w.created_at, w.updated_at
       FROM workflows w
       WHERE w.user_id = $1
       AND (w.name LIKE '%v2%Template%fonctionnel%resume%email%' 
            OR w.name LIKE '%résumé%email%'
            OR w.name LIKE '%resume%email%')
       ORDER BY w.created_at DESC`,
      [user.id]
    );
    
    // Vérifier aussi dans user_workflows qui a une colonne description
    const userWorkflowsResult = await pool.query(
      `SELECT uw.id, uw.name, uw.description, uw.is_active, uw.n8n_workflow_id, uw.schedule, uw.created_at, uw.updated_at
       FROM user_workflows uw
       WHERE uw.user_id = $1
       AND (uw.name LIKE '%v2%Template%fonctionnel%resume%email%' 
            OR uw.name LIKE '%résumé%email%'
            OR uw.name LIKE '%resume%email%'
            OR uw.description LIKE '%résumé%email%'
            OR uw.description LIKE '%resume%email%')
       ORDER BY uw.created_at DESC`,
      [user.id]
    );
    
    if (workflowsResult.rows.length === 0) {
      console.log('❌ Aucun workflow déployé pour cet utilisateur');
      console.log('   💡 Le workflow n\'a peut-être pas été déployé depuis le template\n');
    } else {
      workflowsResult.rows.forEach((workflow, index) => {
        console.log(`\n📦 Workflow #${index + 1}:`);
        console.log(`   ID: ${workflow.id}`);
        console.log(`   Nom: ${workflow.name}`);
        console.log(`   Actif: ${workflow.is_active ? '✅ OUI' : '❌ NON'}`);
        console.log(`   N8N Workflow ID: ${workflow.n8n_workflow_id || 'Non défini'}`);
        console.log(`   Créé le: ${workflow.created_at}`);
        console.log(`   Modifié le: ${workflow.updated_at}`);
        
        // Vérifier le JSON du workflow pour voir la configuration
        if (workflow.json && typeof workflow.json === 'object') {
          const workflowJson = workflow.json;
          
          // Chercher le nœud schedule
          const scheduleNode = workflowJson.nodes?.find((n) => 
            n.type === 'n8n-nodes-base.scheduleTrigger' || 
            n.type === 'n8n-nodes-base.cron' ||
            (n.name && n.name.toLowerCase().includes('schedule')) ||
            (n.name && n.name.toLowerCase().includes('cron')) ||
            (n.name && n.name.toLowerCase().includes('trigger')) ||
            (n.name && n.name.toLowerCase().includes('webhook'))
          );
          
          if (scheduleNode) {
            console.log(`   ✅ Nœud schedule trouvé: ${scheduleNode.name} (${scheduleNode.type})`);
            if (scheduleNode.parameters) {
              console.log(`   Configuration schedule:`, JSON.stringify(scheduleNode.parameters, null, 2));
            }
          }
          
          // Vérifier si le workflow est activé dans le JSON
          if (workflowJson.active !== undefined) {
            console.log(`   Workflow actif dans JSON: ${workflowJson.active ? '✅ OUI' : '❌ NON'}`);
          }
        }
      });
      console.log('');
    }

    // 4. Vérifier dans n8n si le workflow existe et est actif (optionnel)
    if (N8N_API_KEY && workflowsResult.rows.length > 0) {
      console.log('📋 4. Vérification dans n8n...');
      console.log('   ⚠️  Vérification n8n désactivée (axios non disponible)');
      console.log('   💡 Pour vérifier manuellement, utilisez l\'interface n8n\n');
    }

    // 5. Afficher les résultats de user_workflows si trouvés
    console.log('📋 5. Vérification des workflows dans user_workflows...');
    if (userWorkflowsResult && userWorkflowsResult.rows && userWorkflowsResult.rows.length > 0) {
      console.log(`\n✅ ${userWorkflowsResult.rows.length} workflow(s) trouvé(s) dans user_workflows:`);
      userWorkflowsResult.rows.forEach((uw, index) => {
        console.log(`\n📦 Workflow user_workflows #${index + 1}:`);
        console.log(`   ID: ${uw.id}`);
        console.log(`   Nom: ${uw.name}`);
        console.log(`   Description: ${uw.description || 'N/A'}`);
        console.log(`   Actif: ${uw.is_active ? '✅ OUI' : '❌ NON'}`);
        console.log(`   Schedule: ${uw.schedule || 'Non défini'}`);
        console.log(`   N8N Workflow ID: ${uw.n8n_workflow_id || 'Non défini'}`);
        console.log(`   Créé le: ${uw.created_at}`);
        console.log(`   Modifié le: ${uw.updated_at}`);
        
        if (uw.schedule) {
          if (uw.schedule === '14:25' || uw.schedule === '14h25') {
            console.log(`   ✅ Configuration correcte: ${uw.schedule}`);
          } else {
            console.log(`   ⚠️  Schedule: ${uw.schedule} (devrait être 14:25)`);
          }
        }
      });
    } else {
      console.log('❌ Aucun workflow trouvé dans user_workflows');
    }
    console.log('');

    // 6. Vérifier la table user_workflows pour toutes les planifications
    console.log('📋 6. Vérification de toutes les planifications dans user_workflows...');
    const allUserWorkflowsResult = await pool.query(
      `SELECT id, user_id, n8n_workflow_id, schedule, is_active, created_at
       FROM user_workflows
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    );
    
    if (allUserWorkflowsResult.rows.length === 0) {
      console.log('❌ Aucune planification trouvée dans user_workflows');
    } else {
      console.log(`✅ ${allUserWorkflowsResult.rows.length} planification(s) trouvée(s):`);
      allUserWorkflowsResult.rows.forEach((uw, index) => {
        console.log(`\n📅 Planification #${index + 1}:`);
        console.log(`   Schedule: ${uw.schedule || 'Non défini'}`);
        console.log(`   Actif: ${uw.is_active ? '✅ OUI' : '❌ NON'}`);
        console.log(`   N8N Workflow ID: ${uw.n8n_workflow_id || 'Non défini'}`);
        console.log(`   Créé le: ${uw.created_at}`);
        
        if (uw.schedule) {
          const [hours, minutes] = uw.schedule.split(':').map(Number);
          console.log(`   ⏰ Heure programmée: ${hours}:${minutes}`);
          if (hours === 14 && minutes === 25) {
            console.log(`   ✅ Configuration correcte: 14h25`);
          } else {
            console.log(`   ⚠️  Configuration différente de 14h25: ${uw.schedule}`);
          }
        }
      });
    }
    console.log('');

    // 7. Résumé des problèmes potentiels
    console.log('\n📊 RÉSUMÉ DES PROBLÈMES POTENTIELS:');
    console.log('═'.repeat(60));
    
    const allWorkflowsCount = (workflowsResult.rows.length || 0) + ((userWorkflowsResult && userWorkflowsResult.rows) ? userWorkflowsResult.rows.length : 0);
    
    if (allWorkflowsCount === 0) {
      console.log('❌ PROBLÈME 1: Aucun workflow déployé');
      console.log('   Solution: Déployer le template "v2 Template fonctionnel resume email" depuis le catalogue');
    }
    
    if (workflowsResult.rows.length > 0) {
      const inactiveWorkflows = workflowsResult.rows.filter(w => !w.is_active);
      if (inactiveWorkflows.length > 0) {
        console.log('❌ PROBLÈME 2: Workflow(s) inactif(s) dans la table workflows');
        console.log(`   ${inactiveWorkflows.length} workflow(s) non actif(s)`);
        console.log('   Solution: Activer le workflow');
      }
      
      const workflowsWithoutN8nId = workflowsResult.rows.filter(w => !w.n8n_workflow_id);
      if (workflowsWithoutN8nId.length > 0) {
        console.log('❌ PROBLÈME 3: Workflow(s) sans ID n8n dans la table workflows');
        console.log('   Solution: Redéployer le workflow dans n8n');
      }
    }
    
    if (userWorkflowsResult && userWorkflowsResult.rows && userWorkflowsResult.rows.length > 0) {
      const inactiveUserWorkflows = userWorkflowsResult.rows.filter(uw => !uw.is_active);
      if (inactiveUserWorkflows.length > 0) {
        console.log('❌ PROBLÈME 4: Workflow(s) inactif(s) dans la table user_workflows');
        console.log(`   ${inactiveUserWorkflows.length} workflow(s) non actif(s)`);
        console.log('   Solution: Activer le workflow dans user_workflows');
      }
      
      const wrongSchedules = userWorkflowsResult.rows.filter(uw => 
        uw.schedule && uw.schedule !== '14:25' && uw.schedule !== '14h25' && uw.schedule !== '25 14 * * *'
      );
      if (wrongSchedules.length > 0) {
        console.log('❌ PROBLÈME 5: Schedule incorrect dans user_workflows');
        wrongSchedules.forEach(uw => {
          console.log(`   Schedule actuel: ${uw.schedule} (devrait être 14:25 ou 25 14 * * *)`);
        });
        console.log('   Solution: Modifier le schedule à 14:25');
      }
      
      const workflowsWithoutSchedule = userWorkflowsResult.rows.filter(uw => !uw.schedule || uw.schedule === 'daily');
      if (workflowsWithoutSchedule.length > 0) {
        console.log('❌ PROBLÈME 6: Workflow(s) sans schedule spécifique');
        workflowsWithoutSchedule.forEach(uw => {
          console.log(`   Workflow: ${uw.name}, Schedule actuel: ${uw.schedule || 'Non défini'}`);
        });
        console.log('   Solution: Configurer le schedule à 14:25');
      }
    } else {
      console.log('❌ PROBLÈME 7: Aucune entrée trouvée dans user_workflows');
      console.log('   Solution: Déployer le template et configurer le schedule à 14:25');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

checkWorkflowStatus();
