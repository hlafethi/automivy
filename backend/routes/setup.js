const express = require('express');
const router = express.Router();
const db = require('../database');

// Route pour exécuter du SQL directement
router.post('/execute-sql', async (req, res) => {
  try {
    const { sql, params } = req.body;
    console.log('🔧 [Setup] Exécution SQL:', sql.substring(0, 100) + '...');
    if (params) {
      console.log('🔧 [Setup] Paramètres:', params);
    }

    const result = await db.query(sql, params);
    console.log('✅ [Setup] SQL exécuté avec succès');

    res.json({ 
      success: true, 
      message: 'SQL exécuté avec succès',
      result: result.rows
    });

  } catch (error) {
    console.error('❌ [Setup] Erreur SQL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'exécution SQL',
      error: error.message
    });
  }
});

// Route de setup pour créer la table user_workflows
router.post('/create-user-workflows-table', async (req, res) => {
  try {
    console.log('🔧 [Setup] Création de la table user_workflows...');

    // Créer la table étape par étape
    const steps = [
      {
        name: 'Créer la table',
        sql: `CREATE TABLE IF NOT EXISTS user_workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          template_id UUID NOT NULL,
          n8n_workflow_id TEXT NOT NULL,
          n8n_credential_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          schedule TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      },
      {
        name: 'Créer les index',
        sql: `CREATE INDEX IF NOT EXISTS idx_user_workflows_user_id ON user_workflows(user_id);
              CREATE INDEX IF NOT EXISTS idx_user_workflows_template_id ON user_workflows(template_id);
              CREATE INDEX IF NOT EXISTS idx_user_workflows_n8n_workflow_id ON user_workflows(n8n_workflow_id);
              CREATE INDEX IF NOT EXISTS idx_user_workflows_is_active ON user_workflows(is_active);`
      },
      {
        name: 'Activer RLS',
        sql: `ALTER TABLE user_workflows ENABLE ROW LEVEL SECURITY;`
      }
    ];

    const results = [];
    for (const step of steps) {
      try {
        console.log(`🔧 [Setup] ${step.name}...`);
        const result = await db.query(step.sql);
        results.push({ step: step.name, success: true });
        console.log(`✅ [Setup] ${step.name} - Succès`);
      } catch (error) {
        console.log(`⚠️ [Setup] ${step.name} - ${error.message}`);
        results.push({ step: step.name, success: false, error: error.message });
      }
    }

    // Vérifier que la table existe
    const checkResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'user_workflows'
    `);

    const tableExists = checkResult.rows.length > 0;

    res.json({ 
      success: tableExists, 
      message: tableExists ? 'Table user_workflows créée avec succès' : 'Erreur lors de la création',
      tableExists,
      results
    });

  } catch (error) {
    console.error('❌ [Setup] Erreur lors de la création:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création de la table',
      error: error.message
    });
  }
});

// Route pour vérifier l'état de la table
router.get('/check-user-workflows-table', async (req, res) => {
  try {
    console.log('🔍 [Setup] Vérification de la table user_workflows...');

    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'user_workflows'
    `);

    const tableExists = result.rows.length > 0;
    
    if (tableExists) {
      console.log('✅ [Setup] Table user_workflows existe');
      
      // Vérifier les politiques RLS
      const policiesResult = await db.query(`
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_workflows'
      `);
      
      console.log(`📊 [Setup] ${policiesResult.rows.length} politiques RLS trouvées`);
      
      res.json({ 
        success: true, 
        tableExists: true,
        policiesCount: policiesResult.rows.length,
        message: 'Table user_workflows prête'
      });
    } else {
      console.log('❌ [Setup] Table user_workflows n\'existe pas');
      res.json({ 
        success: false, 
        tableExists: false,
        message: 'Table user_workflows manquante'
      });
    }

  } catch (error) {
    console.error('❌ [Setup] Erreur lors de la vérification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la vérification',
      error: error.message
    });
  }
});

module.exports = router;
