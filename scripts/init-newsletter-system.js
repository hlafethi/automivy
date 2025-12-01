#!/usr/bin/env node

/**
 * Script d'initialisation du système Newsletter
 * 
 * Ce script :
 * 1. Crée les tables de crédits dans la base de données
 * 2. Initialise les plans d'abonnement par défaut
 * 3. Vérifie que tout est configuré correctement
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../backend/config');

const pool = new Pool(config.database);

async function initNewsletterSystem() {
  console.log('🚀 Initialisation du système Newsletter...\n');

  try {
    // 1. Lire et exécuter le script SQL
    const sqlPath = path.join(__dirname, '../database/create_credits_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Exécution du script SQL...');
    await pool.query(sql);
    console.log('✅ Tables créées avec succès\n');

    // 2. Vérifier que les plans existent
    console.log('🔍 Vérification des plans d\'abonnement...');
    const plansResult = await pool.query('SELECT * FROM subscription_plans ORDER BY monthly_credits');
    
    if (plansResult.rows.length === 0) {
      console.log('⚠️  Aucun plan trouvé, création des plans par défaut...');
      await pool.query(`
        INSERT INTO subscription_plans (name, description, monthly_credits, price) VALUES
          ('free', 'Plan gratuit', 5, 0.00),
          ('starter', 'Plan starter', 30, 9.99),
          ('professional', 'Plan professionnel', 100, 29.99),
          ('enterprise', 'Plan entreprise', 500, 99.99)
        ON CONFLICT (name) DO NOTHING
      `);
      console.log('✅ Plans créés\n');
    } else {
      console.log(`✅ ${plansResult.rows.length} plan(s) trouvé(s):`);
      plansResult.rows.forEach(plan => {
        console.log(`   - ${plan.name}: ${plan.monthly_credits} crédits/mois (${plan.price}€)`);
      });
      console.log('');
    }

    // 3. Vérifier la configuration SMTP
    console.log('🔍 Vérification de la configuration SMTP...');
    if (config.email && config.email.smtpHost && config.email.smtpUser) {
      console.log(`✅ SMTP configuré: ${config.email.smtpUser}@${config.email.smtpHost}`);
    } else {
      console.log('⚠️  Configuration SMTP manquante dans config.js');
    }
    console.log('');

    // 4. Vérifier la configuration OpenRouter
    console.log('🔍 Vérification de la configuration OpenRouter...');
    const openRouterResult = await pool.query(
      "SELECT * FROM admin_api_keys WHERE service_name = 'openrouter' AND is_active = true"
    );
    
    if (openRouterResult.rows.length > 0) {
      console.log('✅ Clé API OpenRouter trouvée');
    } else {
      console.log('⚠️  Aucune clé API OpenRouter active trouvée');
      console.log('   Veuillez ajouter une clé API OpenRouter via l\'interface admin');
    }
    console.log('');

    // 5. Statistiques
    console.log('📊 Statistiques:');
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const workflowsResult = await pool.query('SELECT COUNT(*) as count FROM user_workflows');
    const creditsResult = await pool.query('SELECT COUNT(*) as count FROM user_credits');
    
    console.log(`   - Utilisateurs: ${usersResult.rows[0].count}`);
    console.log(`   - Workflows: ${workflowsResult.rows[0].count}`);
    console.log(`   - Utilisateurs avec crédits: ${creditsResult.rows[0].count}`);
    console.log('');

    console.log('✅ Système Newsletter initialisé avec succès !\n');
    console.log('📝 Prochaines étapes:');
    console.log('   1. Créer un workflow newsletter via POST /api/newsletter/create');
    console.log('   2. Utiliser le webhook pour générer des newsletters');
    console.log('   3. Gérer les crédits via GET /api/newsletter/credits\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  initNewsletterSystem()
    .then(() => {
      console.log('✨ Terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { initNewsletterSystem };

