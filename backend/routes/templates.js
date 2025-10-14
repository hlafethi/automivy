const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tous les endpoints nécessitent une authentification
router.use(authenticateToken);

// Récupérer tous les templates de l'utilisateur
router.get('/', async (req, res) => {
  try {
    console.log('🔍 [Templates] GET /templates');
    console.log('🔍 [Templates] User:', req.user);
    console.log('🔍 [Templates] User ID:', req.user.id);
    
    const templates = await db.getTemplates(req.user.id, req.user.role);
    console.log('✅ [Templates] Templates trouvés:', templates.length);
    res.json(templates);
  } catch (error) {
    console.error('❌ [Templates] Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Récupérer les templates visibles pour les utilisateurs
router.get('/visible', async (req, res) => {
  try {
    const templates = await db.getVisibleTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Get visible templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Récupérer un template par ID
router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 [Backend] GET /templates/:id');
    console.log('🔍 [Backend] Template ID:', req.params.id);
    console.log('🔍 [Backend] User ID:', req.user.id);
    
    const template = await db.getTemplateByIdForUser(req.params.id, req.user.id);
    if (!template) {
      console.log('❌ [Backend] Template non trouvé');
      return res.status(404).json({ error: 'Template not found' });
    }
    
    console.log('✅ [Backend] Template trouvé:', template.name);
    res.json(template);
  } catch (error) {
    console.error('❌ [Backend] Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Créer un nouveau template
router.post('/', async (req, res) => {
  try {
    const { name, description, workflowData } = req.body;

    if (!name || !workflowData) {
      return res.status(400).json({ error: 'Name and workflow data are required' });
    }

    const template = await db.createTemplate(
      req.user.id,
      name,
      description,
      workflowData
    );

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mettre à jour un template
router.put('/:id', async (req, res) => {
  try {
    const { name, description, workflowData } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (workflowData !== undefined) updates.workflow_data = JSON.stringify(workflowData);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const template = await db.updateTemplate(req.params.id, req.user.id, updates);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modifier la visibilité d'un template
router.patch('/:id/visibility', async (req, res) => {
  try {
    const { visible } = req.body;
    
    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'Visible must be a boolean' });
    }

    const template = await db.updateTemplateVisibility(req.params.id, visible);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Update template visibility error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supprimer un template
router.delete('/:id', async (req, res) => {
  try {
    console.log('🔍 [Backend] DELETE /templates/:id appelé avec ID:', req.params.id);
    console.log('🔍 [Backend] User ID:', req.user.id);
    
    // Récupérer les workflows associés à ce template avant suppression
    console.log('🔍 [Backend] Récupération des workflows associés au template...');
    const workflows = await db.getWorkflows(req.user.id);
    const workflowsFromTemplate = workflows.filter(workflow => {
      const hasTemplateId = workflow.template_id === req.params.id;
      console.log(`🔍 [Backend] Workflow ${workflow.id} - template_id: ${workflow.template_id}, match: ${hasTemplateId}`);
      return hasTemplateId;
    });
    
    console.log(`🔍 [Backend] ${workflowsFromTemplate.length} workflows trouvés pour ce template`);
    
    // Supprimer les workflows associés
    for (const workflow of workflowsFromTemplate) {
      try {
        console.log(`🔍 [Backend] Suppression du workflow ${workflow.id} (${workflow.name})...`);
        
        // Supprimer de la base de données
        await db.deleteWorkflow(workflow.id, req.user.id);
        console.log(`✅ [Backend] Workflow ${workflow.id} supprimé de la base de données`);
        
        // Supprimer de n8n si l'ID n8n existe
        if (workflow.n8n_workflow_id && workflow.n8n_workflow_id.trim() !== '') {
          console.log(`🔍 [Backend] Suppression du workflow ${workflow.n8n_workflow_id} sur n8n...`);
          try {
            const n8nProxyUrl = `http://localhost:3004/api/n8n/workflows/${workflow.n8n_workflow_id}`;
            console.log('🔍 [Backend] URL proxy n8n:', n8nProxyUrl);
            
            const deleteResponse = await fetch(n8nProxyUrl, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            console.log('🔍 [Backend] Réponse suppression proxy:', deleteResponse.status);
            
            if (deleteResponse.ok) {
              console.log(`✅ [Backend] Workflow ${workflow.n8n_workflow_id} supprimé de n8n`);
            } else {
              console.log(`⚠️ [Backend] Échec suppression n8n pour ${workflow.n8n_workflow_id}: ${deleteResponse.status}`);
            }
          } catch (n8nError) {
            console.error(`❌ [Backend] Erreur suppression n8n pour ${workflow.n8n_workflow_id}:`, n8nError);
          }
        } else {
          console.log(`ℹ️ [Backend] Pas d'ID n8n pour le workflow ${workflow.id}`);
        }
      } catch (error) {
        console.error(`❌ [Backend] Erreur lors de la suppression du workflow "${workflow.name}":`, error);
      }
    }
    
    // Supprimer le template
    console.log('🔍 [Backend] Suppression du template...');
    const template = await db.deleteTemplate(req.params.id, req.user.id);
    if (!template) {
      console.log('❌ [Backend] Template non trouvé');
      return res.status(404).json({ error: 'Template not found' });
    }
    
    console.log('✅ [Backend] Template supprimé avec succès');
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('❌ [Backend] Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
