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
      SELECT section, content 
      FROM landing_sections 
      ORDER BY section
    `);
    
    // Organiser le contenu par section
    const content = {};
    result.rows.forEach(row => {
      content[row.section] = row.content;
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
      SELECT content 
      FROM landing_sections 
      WHERE section = $1
    `, [section]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    const sectionContent = result.rows[0].content;
    
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
    
    console.log(`🔍 [Landing PUT] Mise à jour de la section: ${section}`);
    console.log(`🔍 [Landing PUT] Updates reçus:`, JSON.stringify(updates, null, 2));
    
    // Récupérer le contenu existant de la section
    const existingResult = await db.query(`
      SELECT content FROM landing_sections WHERE section = $1
    `, [section]);
    
    let currentContent = {};
    if (existingResult.rows.length > 0) {
      currentContent = existingResult.rows[0].content || {};
    }
    
    // Fusionner les updates avec le contenu existant
    const mergedContent = { ...currentContent, ...updates };
    
    // Mettre à jour ou insérer la section
    await db.query(`
      INSERT INTO landing_sections (section, content, updated_at)
      VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (section)
      DO UPDATE SET 
        content = $2::jsonb,
        updated_at = CURRENT_TIMESTAMP
    `, [section, JSON.stringify(mergedContent)]);
    
    console.log(`✅ [Landing PUT] Section ${section} mise à jour avec succès`);
    res.json({ message: 'Section updated successfully' });
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
    
    // Récupérer le contenu existant de la section
    const existingResult = await db.query(`
      SELECT content FROM landing_sections WHERE section = $1
    `, [section]);
    
    let currentContent = {};
    if (existingResult.rows.length > 0) {
      currentContent = existingResult.rows[0].content || {};
    }
    
    // Mettre à jour le champ spécifique
    currentContent[field] = content;
    
    // Mettre à jour ou insérer la section
    await db.query(`
      INSERT INTO landing_sections (section, content, updated_at)
      VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (section)
      DO UPDATE SET 
        content = $2::jsonb,
        updated_at = CURRENT_TIMESTAMP
    `, [section, JSON.stringify(currentContent)]);
    
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
    
    await db.query('DELETE FROM landing_sections WHERE section = $1', [section]);
    
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
    
    // Récupérer les sections avec leur contenu
    const sectionsResult = await db.query(`
      SELECT section, updated_at as last_updated, content
      FROM landing_sections 
      ORDER BY section
    `);
    
    let totalFields = 0;
    const sections = sectionsResult.rows.map(row => {
      const fieldCount = row.content ? Object.keys(row.content).length : 0;
      totalFields += fieldCount;
      return {
        section: row.section,
        field_count: fieldCount,
        last_updated: row.last_updated
      };
    });
    
    console.log('✅ [Landing] Statistiques récupérées avec succès');
    res.json({
      sections: sections,
      totalFields: totalFields.toString()
    });
  } catch (error) {
    console.error('❌ [Landing] Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
