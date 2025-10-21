const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tous les endpoints nécessitent une authentification
router.use(authenticateToken);

// Récupérer tous les workflows (admin) ou workflows de l'utilisateur
router.get('/', async (req, res) => {
  try {
    // Si l'utilisateur est admin, récupérer tous les workflows
    if (req.user.role === 'admin') {
      console.log('🔍 [Workflows] Récupération de tous les workflows (admin)');
      const workflows = await db.getAllWorkflows();
      res.json(workflows);
    } else {
      // Sinon, récupérer seulement les workflows de l'utilisateur
      console.log('🔍 [Workflows] Récupération des workflows utilisateur');
      const workflows = await db.getWorkflows(req.user.id);
      res.json(workflows);
    }
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Récupérer les workflows de l'utilisateur connecté
router.get('/user', async (req, res) => {
  try {
    const workflows = await db.getWorkflows(req.user.id);
    res.json(workflows);
  } catch (error) {
    console.error('Get user workflows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Récupérer un workflow par ID
router.get('/:id', async (req, res) => {
  try {
    const workflow = await db.getWorkflowById(req.params.id, req.user.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Créer un nouveau workflow
router.post('/', async (req, res) => {
  try {
    const { name, description, workflowData, n8nWorkflowId, templateId } = req.body;

    if (!name || !workflowData) {
      return res.status(400).json({ error: 'Name and workflow data are required' });
    }

    const workflow = await db.createWorkflow(
      req.user.id,
      name,
      description,
      workflowData,
      n8nWorkflowId,
      templateId
    );

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mettre à jour un workflow
router.put('/:id', async (req, res) => {
  try {
    const { name, description, workflowData, n8nWorkflowId, active } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (workflowData !== undefined) updates.workflow_data = JSON.stringify(workflowData);
    if (n8nWorkflowId !== undefined) updates.n8n_workflow_id = n8nWorkflowId;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const workflow = await db.updateWorkflow(req.params.id, req.user.id, updates);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supprimer un workflow
router.delete('/:id', async (req, res) => {
  console.log('🔍 [Backend] DELETE /workflows/:id appelé avec ID:', req.params.id);
  console.log('🔍 [Backend] User ID:', req.user.id);
  console.log('🔍 [Backend] User role:', req.user.role);
  
  try {
    // Récupérer le workflow avant suppression pour obtenir l'ID n8n
    console.log('🔍 [Backend] Récupération du workflow avant suppression...');
    let workflow;
    
    if (req.user.role === 'admin') {
      // Pour l'admin, récupérer le workflow sans vérifier l'utilisateur
      console.log('🔍 [Backend] Récupération en mode admin...');
      const result = await db.query('SELECT * FROM user_workflows WHERE id = $1', [req.params.id]);
      workflow = result.rows[0];
    } else {
      // Pour les utilisateurs normaux, vérifier que le workflow leur appartient
      console.log('🔍 [Backend] Récupération en mode utilisateur...');
      const result = await db.query('SELECT * FROM user_workflows WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      workflow = result.rows[0];
    }
    
    if (!workflow) {
      console.log('❌ [Backend] Workflow non trouvé');
      return res.status(404).json({ error: 'Workflow not found' });
    }
    console.log('✅ [Backend] Workflow trouvé:', {
      id: workflow.id,
      name: workflow.name,
      n8n_workflow_id: workflow.n8n_workflow_id
    });

    // Supprimer de la base de données
    console.log('🔍 [Backend] Suppression de la base de données...');
    if (req.user.role === 'admin') {
      // Pour l'admin, supprimer sans vérifier l'utilisateur
      await db.query('DELETE FROM user_workflows WHERE id = $1', [req.params.id]);
    } else {
      // Pour les utilisateurs normaux, vérifier que le workflow leur appartient
      await db.query('DELETE FROM user_workflows WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    }
    console.log('✅ [Backend] Workflow supprimé de la base de données');

    // Supprimer aussi de n8n si l'ID n8n existe (comme hier)
    if (workflow.n8n_workflow_id && workflow.n8n_workflow_id.trim() !== '') {
      console.log('🔍 [Backend] Suppression sur n8n avec ID:', workflow.n8n_workflow_id);
      try {
        // Utiliser le proxy n8n comme hier
        const n8nProxyUrl = `http://localhost:3004/api/n8n/workflows/${workflow.n8n_workflow_id}`;
        console.log('🔍 [Backend] URL proxy n8n:', n8nProxyUrl);
        
        const deleteResponse = await fetch(n8nProxyUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('🔍 [Backend] Réponse suppression proxy:', deleteResponse.status);
        
        console.log('✅ [Backend] Workflow supprimé de n8n avec succès');
      } catch (n8nError) {
        console.error('❌ [Backend] Erreur lors de la suppression sur n8n:', n8nError);
        // Ne pas faire échouer la suppression en base si n8n échoue
      }
    } else {
      console.log('ℹ️ [Backend] Pas d\'ID n8n associé, suppression uniquement de la base');
    }

    console.log('✅ [Backend] Suppression terminée avec succès');
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('❌ [Backend] Delete workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
