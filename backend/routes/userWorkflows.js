const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Récupérer tous les workflows utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] GET /user-workflows - Récupération workflows utilisateur');
    console.log('🔧 [Backend] User ID:', req.user.id);
    
    const userWorkflows = await db.getUserWorkflows(req.user.id);
    console.log('✅ [Backend] User workflows trouvés:', userWorkflows.length);
    res.json(userWorkflows);
  } catch (error) {
    console.error('❌ [Backend] Get user workflows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Créer un workflow utilisateur
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] POST /user-workflows - Création workflow utilisateur');
    console.log('🔧 [Backend] User ID:', req.user.id);
    console.log('🔧 [Backend] Data:', req.body);

    const {
      userId,
      templateId,
      n8nWorkflowId,
      n8nCredentialId,
      name,
      description,
      schedule,
      isActive = true
    } = req.body;

    if (!userId || !templateId || !n8nWorkflowId || !n8nCredentialId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userWorkflow = await db.createUserWorkflow({
      userId,
      templateId,
      n8nWorkflowId,
      n8nCredentialId,
      name,
      description,
      schedule,
      isActive
    });

    console.log('✅ [Backend] Workflow utilisateur créé:', userWorkflow.id);
    res.status(201).json(userWorkflow);
  } catch (error) {
    console.error('❌ [Backend] Create user workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Récupérer tous les workflows d'un utilisateur
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] GET /user-workflows/user/:userId');
    console.log('🔧 [Backend] User ID:', req.user.id);
    console.log('🔧 [Backend] Requested User ID:', req.params.userId);

    // Vérifier que l'utilisateur ne peut accéder qu'à ses propres workflows
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const workflows = await db.getUserWorkflows(req.params.userId);
    console.log(`✅ [Backend] ${workflows.length} workflows trouvés pour l'utilisateur`);
    res.json(workflows);
  } catch (error) {
    console.error('❌ [Backend] Get user workflows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Récupérer un workflow utilisateur spécifique
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] GET /user-workflows/:id');
    console.log('🔧 [Backend] Workflow ID:', req.params.id);
    console.log('🔧 [Backend] User ID:', req.user.id);

    const workflow = await db.getUserWorkflowById(req.params.id, req.user.id);
    if (!workflow) {
      return res.status(404).json({ error: 'User workflow not found' });
    }

    console.log('✅ [Backend] Workflow utilisateur trouvé:', workflow.name);
    res.json(workflow);
  } catch (error) {
    console.error('❌ [Backend] Get user workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mettre à jour un workflow utilisateur
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] PUT /user-workflows/:id');
    console.log('🔧 [Backend] Workflow ID:', req.params.id);
    console.log('🔧 [Backend] User ID:', req.user.id);
    console.log('🔧 [Backend] Updates:', req.body);

    const updates = req.body;
    const workflow = await db.updateUserWorkflow(req.params.id, req.user.id, updates);
    
    if (!workflow) {
      return res.status(404).json({ error: 'User workflow not found' });
    }

    console.log('✅ [Backend] Workflow utilisateur mis à jour');
    res.json(workflow);
  } catch (error) {
    console.error('❌ [Backend] Update user workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activer/désactiver un workflow utilisateur
router.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] PATCH /user-workflows/:id/toggle');
    console.log('🔧 [Backend] Workflow ID:', req.params.id);
    console.log('🔧 [Backend] User ID:', req.user.id);
    console.log('🔧 [Backend] Active:', req.body.active);

    const { active } = req.body;
    const workflow = await db.toggleUserWorkflow(req.params.id, req.user.id, active);
    
    if (!workflow) {
      return res.status(404).json({ error: 'User workflow not found' });
    }

    console.log(`✅ [Backend] Workflow ${active ? 'activé' : 'désactivé'}`);
    res.json(workflow);
  } catch (error) {
    console.error('❌ [Backend] Toggle user workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supprimer un workflow utilisateur
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] DELETE /user-workflows/:id');
    console.log('🔧 [Backend] Workflow ID:', req.params.id);
    console.log('🔧 [Backend] User ID:', req.user.id);

    // Récupérer le workflow avant suppression pour obtenir les IDs n8n
    const workflow = await db.getUserWorkflowById(req.params.id, req.user.id);
    if (!workflow) {
      return res.status(404).json({ error: 'User workflow not found' });
    }

    console.log('🔧 [Backend] Workflow trouvé:', {
      id: workflow.id,
      name: workflow.name,
      n8n_workflow_id: workflow.n8n_workflow_id,
      n8n_credential_id: workflow.n8n_credential_id
    });

    // Supprimer de la base de données
    try {
      const deletedWorkflow = await db.deleteUserWorkflow(req.params.id, req.user.id);
      if (!deletedWorkflow) {
        console.warn('⚠️ [Backend] Aucun workflow supprimé (peut-être déjà supprimé)');
        return res.status(404).json({ error: 'User workflow not found or already deleted' });
      }
      console.log('✅ [Backend] Workflow supprimé de la base de données:', deletedWorkflow.id);
    } catch (dbError) {
      console.error('❌ [Backend] Erreur suppression BDD:', dbError);
      console.error('❌ [Backend] Stack:', dbError.stack);
      throw dbError;
    }

    // Note: La suppression des workflows et credentials n8n se fait côté frontend
    // via userWorkflowService.deleteUserWorkflow() pour une meilleure gestion des erreurs

    console.log('✅ [Backend] Suppression workflow utilisateur terminée');
    res.json({ message: 'User workflow deleted successfully' });
  } catch (error) {
    console.error('❌ [Backend] Delete user workflow error:', error);
    console.error('❌ [Backend] Error message:', error.message);
    console.error('❌ [Backend] Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Nettoyer les workflows orphelins (supprimés sur n8n mais encore en BDD)
router.post('/cleanup-orphaned', authenticateToken, async (req, res) => {
  try {
    console.log('🧹 [Backend] Nettoyage des workflows orphelins pour user:', req.user.id);
    
    const userWorkflows = await db.getUserWorkflows(req.user.id);
    const n8nService = require('../services/n8nService');
    const config = require('../config');
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    let cleanedCount = 0;
    const errors = [];
    
    for (const workflow of userWorkflows) {
      if (workflow.n8n_workflow_id) {
        try {
          // Vérifier si le workflow existe encore sur n8n
          const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflow.n8n_workflow_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey
            }
          });
          
          if (!response.ok && response.status === 404) {
            // Le workflow n'existe plus sur n8n, le supprimer de la BDD
            console.log(`🧹 [Backend] Workflow orphelin trouvé: ${workflow.name} (${workflow.id})`);
            await db.deleteUserWorkflow(workflow.id, req.user.id);
            cleanedCount++;
            console.log(`✅ [Backend] Workflow orphelin supprimé: ${workflow.name}`);
          }
        } catch (error) {
          console.error(`❌ [Backend] Erreur vérification workflow ${workflow.id}:`, error.message);
          errors.push({ workflowId: workflow.id, error: error.message });
        }
      } else {
        // Workflow sans n8n_workflow_id, supprimer directement
        console.log(`🧹 [Backend] Workflow sans n8n_workflow_id trouvé: ${workflow.name} (${workflow.id})`);
        try {
          await db.deleteUserWorkflow(workflow.id, req.user.id);
          cleanedCount++;
          console.log(`✅ [Backend] Workflow sans n8n_workflow_id supprimé: ${workflow.name}`);
        } catch (error) {
          console.error(`❌ [Backend] Erreur suppression workflow ${workflow.id}:`, error.message);
          errors.push({ workflowId: workflow.id, error: error.message });
        }
      }
    }
    
    console.log(`✅ [Backend] Nettoyage terminé: ${cleanedCount} workflow(s) orphelin(s) supprimé(s)`);
    res.json({ 
      success: true, 
      message: `${cleanedCount} workflow(s) orphelin(s) supprimé(s)`,
      cleanedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ [Backend] Erreur nettoyage workflows orphelins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supprimer tous les workflows d'un utilisateur (pour nettoyage)
router.delete('/user/:userId/all', authenticateToken, async (req, res) => {
  try {
    console.log('🧹 [Backend] Suppression de tous les workflows pour user:', req.params.userId);
    
    // Vérifier que l'utilisateur ne peut supprimer que ses propres workflows
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const userWorkflows = await db.getUserWorkflows(req.params.userId);
    let deletedCount = 0;
    const errors = [];
    
    for (const workflow of userWorkflows) {
      try {
        await db.deleteUserWorkflow(workflow.id, req.params.userId);
        deletedCount++;
        console.log(`✅ [Backend] Workflow supprimé: ${workflow.name} (${workflow.id})`);
      } catch (error) {
        console.error(`❌ [Backend] Erreur suppression workflow ${workflow.id}:`, error.message);
        errors.push({ workflowId: workflow.id, error: error.message });
      }
    }
    
    console.log(`✅ [Backend] ${deletedCount} workflow(s) supprimé(s) pour user ${req.params.userId}`);
    res.json({ 
      success: true, 
      message: `${deletedCount} workflow(s) supprimé(s)`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ [Backend] Erreur suppression workflows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
