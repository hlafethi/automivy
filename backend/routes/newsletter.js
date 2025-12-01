// Routes API pour les workflows Newsletter
// Gère la création de workflows newsletter avec vérification des crédits

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const NewsletterWorkflowGenerator = require('../services/newsletterWorkflowGenerator');
const { injectNewsletterCredentials, checkCreditsBeforeWorkflow, consumeCreditsAfterWorkflow } = require('../services/injectors/newsletterInjector');
const n8nService = require('../services/n8nService');
const db = require('../database');
const creditsService = require('../services/creditsService');
const generator = new NewsletterWorkflowGenerator();

/**
 * POST /api/newsletter/create
 * Crée un workflow newsletter pour l'utilisateur
 * Vérifie les crédits avant de créer
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { webhookPath, workflowName, model } = req.body;

    console.log(`🔧 [Newsletter] Création workflow newsletter pour utilisateur ${userId}`);

    // 1. Vérifier les crédits (1 crédit par newsletter)
    try {
      await checkCreditsBeforeWorkflow(userId, 1);
    } catch (error) {
      return res.status(402).json({
        error: 'Crédits insuffisants',
        message: error.message,
        credits: await creditsService.getCreditsBalance(userId)
      });
    }

    // 2. Générer le workflow
    const workflowConfig = {
      webhookPath: webhookPath || `generate-newsletter-${userId}-${Date.now()}`,
      workflowName: workflowName || `Newsletter Generator - ${req.user.email}`,
      model: model || generator.defaultModel
    };

    const workflow = generator.generateWorkflow(workflowConfig);

    // 3. Injecter les credentials
    const userCredentials = {
      email: req.user.email
    };

    const { workflow: injectedWorkflow, createdCredentials } = await injectNewsletterCredentials(
      workflow,
      userCredentials,
      userId,
      null,
      workflowConfig.workflowName
    );

    // 4. Créer le workflow dans n8n
    const n8nWorkflow = await n8nService.createWorkflow(injectedWorkflow);

    // 5. Sauvegarder dans la base de données
    const userWorkflow = await db.createUserWorkflow({
      userId,
      templateId: null,
      n8nWorkflowId: n8nWorkflow.id,
      n8nCredentialId: createdCredentials.smtp?.id || createdCredentials.openRouter?.id,
      name: workflowConfig.workflowName,
      description: 'Workflow Newsletter avec Agent IA',
      schedule: null,
      isActive: false,
      webhookPath: workflowConfig.webhookPath
    });

    // 6. Consommer les crédits
    await consumeCreditsAfterWorkflow(userId, userWorkflow.id, 1);

    // 7. Récupérer le solde de crédits mis à jour
    const creditsBalance = await creditsService.getCreditsBalance(userId);

    console.log(`✅ [Newsletter] Workflow newsletter créé: ${n8nWorkflow.id}`);

    res.status(201).json({
      success: true,
      workflow: {
        id: userWorkflow.id,
        n8nWorkflowId: n8nWorkflow.id,
        name: workflowConfig.workflowName,
        webhookPath: workflowConfig.webhookPath,
        webhookUrl: `${process.env.N8N_URL || 'http://localhost:5678'}/webhook/${workflowConfig.webhookPath}`
      },
      credits: {
        remaining: creditsBalance.remaining_credits,
        total: creditsBalance.total_credits,
        used: creditsBalance.used_credits
      }
    });
  } catch (error) {
    console.error('❌ [Newsletter] Erreur création workflow:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du workflow newsletter',
      message: error.message
    });
  }
});

/**
 * GET /api/newsletter/credits
 * Récupère le solde de crédits de l'utilisateur
 */
router.get('/credits', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await creditsService.getCreditsBalance(userId);

    res.json({
      success: true,
      credits: {
        remaining: balance.remaining_credits,
        total: balance.total_credits,
        used: balance.used_credits,
        plan: balance.plan_name,
        planCredits: balance.plan_credits,
        nextReset: balance.next_reset_at
      }
    });
  } catch (error) {
    console.error('❌ [Newsletter] Erreur récupération crédits:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des crédits',
      message: error.message
    });
  }
});

/**
 * GET /api/newsletter/history
 * Récupère l'historique des transactions de crédits
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const history = await creditsService.getCreditHistory(userId, limit);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('❌ [Newsletter] Erreur récupération historique:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de l\'historique',
      message: error.message
    });
  }
});

/**
 * POST /api/newsletter/change-plan
 * Change le plan d'abonnement de l'utilisateur
 */
router.post('/change-plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planName } = req.body;

    if (!planName) {
      return res.status(400).json({
        error: 'Le nom du plan est requis',
        availablePlans: ['free', 'starter', 'professional', 'enterprise']
      });
    }

    await creditsService.changeSubscriptionPlan(userId, planName);
    const balance = await creditsService.getCreditsBalance(userId);

    res.json({
      success: true,
      message: `Plan changé vers ${planName}`,
      credits: {
        remaining: balance.remaining_credits,
        total: balance.total_credits,
        used: balance.used_credits,
        plan: balance.plan_name
      }
    });
  } catch (error) {
    console.error('❌ [Newsletter] Erreur changement de plan:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de plan',
      message: error.message
    });
  }
});

module.exports = router;

