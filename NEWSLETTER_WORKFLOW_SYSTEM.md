# Système de Workflows Newsletter avec Gestion des Crédits

## 📋 Vue d'ensemble

Ce système permet de créer des workflows Newsletter indépendants pour chaque utilisateur, avec :
- **Webhook personnalisé** pour chaque workflow
- **Gestion des crédits** (30 par mois selon l'abonnement)
- **Agent IA** avec OpenRouter (modèle économique)
- **Envoi email** via SMTP admin
- **Modal webhook** pour saisir email et thème

## 🏗️ Architecture

### 1. Génération de Workflow (`newsletterWorkflowGenerator.js`)

Service qui génère un workflow Newsletter complet basé sur le JSON fourni :

```javascript
const NewsletterWorkflowGenerator = require('./services/newsletterWorkflowGenerator');
const generator = new NewsletterWorkflowGenerator();

const workflow = generator.generateWorkflow({
  webhookPath: 'generate-newsletter-user123',
  workflowName: 'Newsletter Generator - user@example.com',
  model: 'qwen/qwen-2.5-coder-32b-instruct' // Modèle économique
});
```

### 2. Système de Crédits (`creditsService.js`)

Gestion des crédits avec 4 plans d'abonnement :

- **Free** : 5 crédits/mois (gratuit)
- **Starter** : 30 crédits/mois (9.99€)
- **Professional** : 100 crédits/mois (29.99€)
- **Enterprise** : 500 crédits/mois (99.99€)

```javascript
const creditsService = require('./services/creditsService');

// Vérifier les crédits
const hasCredits = await creditsService.hasEnoughCredits(userId, 1);

// Consommer des crédits
await creditsService.consumeCredits(userId, 1, workflowId, 'Génération newsletter');

// Récupérer le solde
const balance = await creditsService.getCreditsBalance(userId);
```

### 3. Injection de Credentials (`newsletterInjector.js`)

Injecte automatiquement :
- **OpenRouter** : Credential admin pour l'agent IA
- **SMTP** : Credential admin pour l'envoi d'emails

```javascript
const { injectNewsletterCredentials } = require('./services/injectors/newsletterInjector');

const { workflow, createdCredentials } = await injectNewsletterCredentials(
  workflow,
  userCredentials,
  userId,
  templateId,
  templateName
);
```

## 🚀 Utilisation

### Créer un Workflow Newsletter

**Endpoint** : `POST /api/newsletter/create`

**Headers** :
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body** :
```json
{
  "webhookPath": "generate-newsletter-user123",
  "workflowName": "Newsletter Generator - user@example.com",
  "model": "qwen/qwen-2.5-coder-32b-instruct"
}
```

**Response** :
```json
{
  "success": true,
  "workflow": {
    "id": "workflow-uuid",
    "n8nWorkflowId": "n8n-workflow-id",
    "name": "Newsletter Generator - user@example.com",
    "webhookPath": "generate-newsletter-user123",
    "webhookUrl": "http://localhost:5678/webhook/generate-newsletter-user123"
  },
  "credits": {
    "remaining": 29,
    "total": 30,
    "used": 1
  }
}
```

### Utiliser le Webhook

**Endpoint** : `POST http://localhost:5678/webhook/generate-newsletter-user123`

**Body** :
```json
{
  "email": "destinataire@example.com",
  "theme": "Intelligence Artificielle",
  "language": "fr",
  "includeStats": true,
  "context": "Focus sur les dernières innovations",
  "preferences": {}
}
```

**Response** :
```json
{
  "status": "success",
  "message": "Newsletter générée par l'agent IA et envoyée avec succès !",
  "recipient": "destinataire@example.com",
  "theme": "Intelligence Artificielle",
  "timestamp": "2025-01-15T10:30:00Z",
  "agent": {
    "usedCalculator": true,
    "iterations": 3
  }
}
```

### Vérifier les Crédits

**Endpoint** : `GET /api/newsletter/credits`

**Response** :
```json
{
  "success": true,
  "credits": {
    "remaining": 29,
    "total": 30,
    "used": 1,
    "plan": "starter",
    "planCredits": 30,
    "nextReset": "2025-02-15T00:00:00Z"
  }
}
```

### Changer de Plan

**Endpoint** : `POST /api/newsletter/change-plan`

**Body** :
```json
{
  "planName": "professional"
}
```

## 🗄️ Base de Données

### Tables créées

1. **subscription_plans** : Plans d'abonnement disponibles
2. **user_subscriptions** : Abonnements des utilisateurs
3. **user_credits** : Crédits des utilisateurs
4. **credit_transactions** : Historique des transactions

### Migration

Exécuter le script SQL pour créer les tables :

```bash
psql -U postgres -d automivy -f database/create_credits_system.sql
```

## 🔧 Configuration

### Modèle OpenRouter

Par défaut, le système utilise `qwen/qwen-2.5-coder-32b-instruct` (modèle économique).

Pour changer le modèle, passer le paramètre `model` lors de la création du workflow.

### SMTP Admin

Le système utilise automatiquement les credentials SMTP admin configurés dans `config.js` :

```javascript
email: {
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  smtpUser: 'admin@heleam.com',
  smtpPassword: 'password'
}
```

## 📝 Structure du Workflow

Le workflow généré contient :

1. **Webhook Trigger** : Point d'entrée avec validation
2. **Validate Input** : Validation email et thème
3. **Prepare Agent Input** : Préparation du prompt pour l'agent IA
4. **OpenRouter Chat Model** : Modèle IA économique
5. **Calculator Tool** : Outil de calcul pour statistiques
6. **Buffer Memory** : Mémoire de session
7. **AI Agent** : Agent conversationnel pour générer la newsletter
8. **Extract Agent Output** : Extraction de la réponse
9. **Build HTML Template** : Construction du template HTML
10. **Send Email** : Envoi via SMTP admin
11. **Success Response** : Réponse de succès

## 🎯 Fonctionnalités

- ✅ **Workflows indépendants** : Chaque utilisateur a son propre workflow
- ✅ **Webhook personnalisé** : Chaque workflow a son propre endpoint
- ✅ **Gestion des crédits** : Vérification avant création, consommation après
- ✅ **Modèle économique** : Utilisation d'un modèle OpenRouter pas cher
- ✅ **SMTP admin** : Tous les emails sont envoyés via le SMTP admin
- ✅ **Réinitialisation mensuelle** : Les crédits sont réinitialisés chaque mois

## 🔒 Sécurité

- Les credentials SMTP et OpenRouter sont injectés automatiquement
- Les crédits sont vérifiés avant chaque création de workflow
- Les workflows sont isolés par utilisateur
- Les webhooks sont uniques par workflow

## 📊 Monitoring

L'historique des transactions de crédits est disponible via :

**Endpoint** : `GET /api/newsletter/history?limit=50`

## 🚨 Gestion des Erreurs

- **Crédits insuffisants** : Retourne 402 avec message d'erreur
- **Credential manquant** : Erreur 500 avec détails
- **Workflow invalide** : Erreur 400 avec validation

## 📚 Exemples

### Frontend : Créer un workflow

```typescript
const createNewsletterWorkflow = async () => {
  const response = await fetch('/api/newsletter/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      webhookPath: `generate-newsletter-${userId}`,
      workflowName: `Newsletter Generator - ${userEmail}`
    })
  });
  
  const data = await response.json();
  return data;
};
```

### Frontend : Utiliser le webhook

```typescript
const generateNewsletter = async (email: string, theme: string) => {
  const webhookUrl = `http://localhost:5678/webhook/generate-newsletter-${userId}`;
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      theme,
      language: 'fr',
      includeStats: true
    })
  });
  
  return await response.json();
};
```

## 🎨 Modal Webhook

Le modal webhook doit permettre de saisir :
- **Email** : Email du destinataire (obligatoire)
- **Thème** : Thème de la newsletter (obligatoire)
- **Langue** : Langue de la newsletter (optionnel, défaut: 'fr')
- **Include Stats** : Inclure des statistiques (optionnel, défaut: false)
- **Context** : Contexte supplémentaire (optionnel)
- **Preferences** : Préférences utilisateur (optionnel)

## 🔄 Réinitialisation Mensuelle

Les crédits sont automatiquement réinitialisés chaque mois selon le plan d'abonnement.

La réinitialisation se fait :
- À la création d'un workflow (vérification automatique)
- Lors de la récupération du solde
- Via une tâche cron (optionnel)

