const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Middleware pour vérifier l'authentification admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/landing - Récupérer tout le contenu de la landing page (public)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 [Landing] Récupération du contenu de la landing page');
    
    const result = await db.query(`
      SELECT section, field, content 
      FROM landing_content 
      ORDER BY section, field
    `);
    
    // Organiser le contenu par section
    const content = {};
    result.rows.forEach(row => {
      if (!content[row.section]) {
        content[row.section] = {};
      }
      content[row.section][row.field] = row.content;
    });
    
    console.log('✅ [Landing] Contenu récupéré avec succès');
    res.json(content);
  } catch (error) {
    console.error('❌ [Landing] Erreur lors de la récupération:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/landing/section/:section - Récupérer le contenu d'une section spécifique
router.get('/section/:section', async (req, res) => {
  try {
    const { section } = req.params;
    console.log(`🔍 [Landing] Récupération de la section: ${section}`);
    
    const result = await db.query(`
      SELECT field, content 
      FROM landing_content 
      WHERE section = $1
      ORDER BY field
    `, [section]);
    
    const sectionContent = {};
    result.rows.forEach(row => {
      sectionContent[row.field] = row.content;
    });
    
    console.log(`✅ [Landing] Section ${section} récupérée avec succès`);
    res.json(sectionContent);
  } catch (error) {
    console.error(`❌ [Landing] Erreur lors de la récupération de la section ${section}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/landing/section/:section - Mettre à jour le contenu d'une section (Admin seulement)
router.put('/section/:section', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { section } = req.params;
    const updates = req.body;
    
    console.log(`🚨🚨🚨 [Landing PUT] ===== DÉBUT MISE À JOUR =====`);
    console.log(`🚨🚨🚨 [Landing PUT] Section: ${section}`);
    console.log(`🚨🚨🚨 [Landing PUT] Headers:`, req.headers);
    console.log(`🚨🚨🚨 [Landing PUT] Body reçu:`, JSON.stringify(updates, null, 2));
    console.log(`🚨🚨🚨 [Landing PUT] User:`, req.user);
    
    // Mettre à jour chaque champ
    for (const [field, content] of Object.entries(updates)) {
      console.log(`🚨🚨🚨 [Landing PUT] Traitement du champ: ${field} = "${content}"`);
      
      if (content !== null && content !== undefined) {
        // Vérifier si l'enregistrement existe
        console.log(`🚨🚨🚨 [Landing PUT] Vérification existence: ${section}.${field}`);
        const existing = await db.query(`
          SELECT id, content FROM landing_content 
          WHERE section = $1 AND field = $2
        `, [section, field]);
        
        console.log(`🚨🚨🚨 [Landing PUT] Résultat vérification:`, existing.rows);
        
        if (existing.rows.length > 0) {
          console.log(`🚨🚨🚨 [Landing PUT] Mise à jour existant: ${section}.${field}`);
          console.log(`🚨🚨🚨 [Landing PUT] Ancien contenu: "${existing.rows[0].content}"`);
          console.log(`🚨🚨🚨 [Landing PUT] Nouveau contenu: "${content}"`);
          
          // Mettre à jour l'enregistrement existant
          const updateResult = await db.query(`
            UPDATE landing_content 
            SET content = $1, updated_at = CURRENT_TIMESTAMP
            WHERE section = $2 AND field = $3
          `, [content, section, field]);
          
          console.log(`🚨🚨🚨 [Landing PUT] Résultat UPDATE:`, updateResult.rowCount, 'lignes affectées');
          console.log(`✅ [Landing PUT] Champ ${section}.${field} mis à jour`);
        } else {
          console.log(`🚨🚨🚨 [Landing PUT] Création nouveau: ${section}.${field}`);
          
          // Créer un nouvel enregistrement
          const insertResult = await db.query(`
            INSERT INTO landing_content (section, field, content, created_at, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [section, field, content]);
          
          console.log(`🚨🚨🚨 [Landing PUT] Résultat INSERT:`, insertResult.rowCount, 'lignes affectées');
          console.log(`✅ [Landing PUT] Nouveau champ ${section}.${field} créé`);
        }
      } else {
        console.log(`🚨🚨🚨 [Landing PUT] Champ ${field} ignoré (null/undefined)`);
      }
    }
    
    // Vérification finale
    console.log(`🚨🚨🚨 [Landing PUT] Vérification finale de la section ${section}:`);
    const finalCheck = await db.query(`
      SELECT field, content FROM landing_content 
      WHERE section = $1
    `, [section]);
    
    console.log(`🚨🚨🚨 [Landing PUT] Contenu final:`, finalCheck.rows);
    
    console.log(`✅ [Landing PUT] Section ${section} mise à jour avec succès`);
    res.json({ message: 'Section updated successfully' });
    console.log(`🚨🚨🚨 [Landing PUT] ===== FIN MISE À JOUR =====`);
  } catch (error) {
    console.error(`❌ [Landing PUT] Erreur lors de la mise à jour de la section ${section}:`, error);
    console.error(`❌ [Landing PUT] Stack trace:`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/landing/field - Mettre à jour un champ spécifique (Admin seulement)
router.put('/field', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { section, field, content } = req.body;
    
    console.log(`🔍 [Landing] Mise à jour du champ: ${section}.${field}`);
    
    await db.query(`
      INSERT INTO landing_content (section, field, content, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (section, field)
      DO UPDATE SET 
        content = EXCLUDED.content,
        updated_at = CURRENT_TIMESTAMP
    `, [section, field, content]);
    
    console.log(`✅ [Landing] Champ ${section}.${field} mis à jour avec succès`);
    res.json({ message: 'Field updated successfully' });
  } catch (error) {
    console.error(`❌ [Landing] Erreur lors de la mise à jour du champ:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/landing/section/:section - Supprimer une section (Admin seulement)
router.delete('/section/:section', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { section } = req.params;
    
    console.log(`🔍 [Landing] Suppression de la section: ${section}`);
    
    await db.query('DELETE FROM landing_content WHERE section = $1', [section]);
    
    console.log(`✅ [Landing] Section ${section} supprimée avec succès`);
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error(`❌ [Landing] Erreur lors de la suppression de la section ${section}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/landing/stats - Statistiques du contenu (Admin seulement)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 [Landing] Récupération des statistiques');
    
    const result = await db.query(`
      SELECT 
        section,
        COUNT(*) as field_count,
        MAX(updated_at) as last_updated
      FROM landing_content 
      GROUP BY section
      ORDER BY section
    `);
    
    const totalFields = await db.query('SELECT COUNT(*) as total FROM landing_content');
    
    console.log('✅ [Landing] Statistiques récupérées avec succès');
    res.json({
      sections: result.rows,
      totalFields: totalFields.rows[0].total
    });
  } catch (error) {
    console.error('❌ [Landing] Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
