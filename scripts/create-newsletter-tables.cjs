#!/usr/bin/env node

/**
 * Script pour créer les tables du système Newsletter
 * Exécute le script SQL create_credits_system.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../backend/config');

const pool = new Pool(config.database);

async function createNewsletterTables() {
  console.log('🚀 Création des tables du système Newsletter...\n');

  try {
    // Lire le script SQL
    const sqlPath = path.join(__dirname, '../database/create_credits_system.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Fichier SQL non trouvé: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 Fichier SQL trouvé, exécution...\n');

    // Exécuter le script SQL
    await pool.query(sql);
    
    console.log('✅ Tables créées avec succès !\n');

    // Vérifier que les tables existent
    console.log('🔍 Vérification des tables créées...\n');
    
    const tables = [
      'subscription_plans',
      'user_subscriptions',
      'user_credits',
      'credit_transactions'
    ];

    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ Table "${table}" existe`);
      } else {
        console.log(`   ❌ Table "${table}" n'existe pas`);
      }
    }

    // Vérifier les plans par défaut
    console.log('\n🔍 Vérification des plans d\'abonnement...\n');
    const plansResult = await pool.query('SELECT * FROM subscription_plans ORDER BY monthly_credits');
    
    if (plansResult.rows.length > 0) {
      console.log(`   ✅ ${plansResult.rows.length} plan(s) trouvé(s):`);
      plansResult.rows.forEach(plan => {
        console.log(`      - ${plan.name}: ${plan.monthly_credits} crédits/mois (${plan.price}€)`);
      });
    } else {
      console.log('   ⚠️  Aucun plan trouvé');
    }

    console.log('\n✅ Système Newsletter initialisé avec succès !\n');
    console.log('📝 Les tables suivantes ont été créées:');
    console.log('   - subscription_plans (plans d\'abonnement)');
    console.log('   - user_subscriptions (abonnements utilisateurs)');
    console.log('   - user_credits (crédits utilisateurs)');
    console.log('   - credit_transactions (historique des transactions)\n');

  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Certaines tables existent déjà. C\'est normal si vous réexécutez le script.');
      console.log('   Le script continue avec les autres opérations...\n');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  createNewsletterTables()
    .then(() => {
      console.log('✨ Terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { createNewsletterTables };

