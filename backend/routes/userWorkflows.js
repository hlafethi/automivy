const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Créer un workflow utilisateur
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] POST /user-workflows - Création workflow utilisateur');
    console.log('🔧 [Backend] User ID:', req.user.userId);
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
    console.log('🔧 [Backend] User ID:', req.user.userId);
    console.log('🔧 [Backend] Requested User ID:', req.params.userId);

    // Vérifier que l'utilisateur ne peut accéder qu'à ses propres workflows
    if (req.user.userId !== req.params.userId) {
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
    console.log('🔧 [Backend] User ID:', req.user.userId);

    const workflow = await db.getUserWorkflowById(req.params.id, req.user.userId);
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
    console.log('🔧 [Backend] User ID:', req.user.userId);
    console.log('🔧 [Backend] Updates:', req.body);

    const updates = req.body;
    const workflow = await db.updateUserWorkflow(req.params.id, req.user.userId, updates);
    
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
    console.log('🔧 [Backend] User ID:', req.user.userId);
    console.log('🔧 [Backend] Active:', req.body.active);

    const { active } = req.body;
    const workflow = await db.toggleUserWorkflow(req.params.id, req.user.userId, active);
    
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
    console.log('🔧 [Backend] User ID:', req.user.userId);

    // Récupérer le workflow avant suppression pour obtenir les IDs n8n
    const workflow = await db.getUserWorkflowById(req.params.id, req.user.userId);
    if (!workflow) {
      return res.status(404).json({ error: 'User workflow not found' });
    }

    console.log('🔧 [Backend] Workflow trouvé:', {
      id: workflow.id,
      name: workflow.name,
      n8nWorkflowId: workflow.n8nWorkflowId,
      n8nCredentialId: workflow.n8nCredentialId
    });

    // Supprimer de la base de données
    await db.deleteUserWorkflow(req.params.id, req.user.userId);
    console.log('✅ [Backend] Workflow supprimé de la base de données');

    // Note: La suppression des workflows et credentials n8n se fait côté frontend
    // via userWorkflowService.deleteUserWorkflow() pour une meilleure gestion des erreurs

    console.log('✅ [Backend] Suppression workflow utilisateur terminée');
    res.json({ message: 'User workflow deleted successfully' });
  } catch (error) {
    console.error('❌ [Backend] Delete user workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
