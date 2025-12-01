# 🚀 Guide Complet - Système Newsletter

## ✅ Installation

### 1. Initialiser la base de données

```bash
# Exécuter le script SQL
psql -U postgres -d automivy -f database/create_credits_system.sql

# OU utiliser le script Node.js
node scripts/init-newsletter-system.js
```

### 2. Vérifier la configuration

Assurez-vous que `backend/config.js` contient :
- Configuration SMTP admin
- Clé API OpenRouter dans `admin_api_keys`

## 📝 Utilisation

### Créer un Workflow Newsletter

**Via API :**
```bash
POST /api/newsletter/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "webhookPath": "generate-newsletter-user123",
  "workflowName": "Newsletter Generator - user@example.com",
  "model": "qwen/qwen-2.5-coder-32b-instruct"
}
```

**Via Frontend :**
```typescript
import { newsletterService } from './services/newsletterService';

const workflow = await newsletterService.createNewsletterWorkflow({
  webhookPath: `generate-newsletter-${userId}`,
  workflowName: `Newsletter Generator - ${userEmail}`
});
```

### Générer une Newsletter

**Via Webhook :**
```bash
POST http://localhost:5678/webhook/generate-newsletter-user123
Content-Type: application/json

{
  "email": "destinataire@example.com",
  "theme": "Intelligence Artificielle",
  "language": "fr",
  "includeStats": true,
  "context": "Focus sur les dernières innovations"
}
```

**Via Frontend (Modal) :**
1. Ouvrir la page "User Automations"
2. Cliquer sur l'icône 📧 sur un workflow Newsletter
3. Remplir le formulaire (email, thème, etc.)
4. Cliquer sur "Générer la Newsletter"

### Gérer les Crédits

**Vérifier le solde :**
```typescript
const balance = await newsletterService.getCreditsBalance();
console.log(`Crédits restants: ${balance.credits.remaining}`);
```

**Changer de plan :**
```typescript
await newsletterService.changeSubscriptionPlan('professional');
```

**Voir l'historique :**
```typescript
const history = await newsletterService.getCreditHistory(50);
```

## 🎯 Fonctionnalités

- ✅ **Workflows indépendants** : Chaque utilisateur a son propre workflow
- ✅ **Webhook personnalisé** : Chaque workflow a son propre endpoint
- ✅ **Gestion des crédits** : 30 crédits/mois selon l'abonnement
- ✅ **Modèle économique** : `qwen/qwen-2.5-coder-32b-instruct` par défaut
- ✅ **SMTP admin** : Tous les emails via admin@heleam.com
- ✅ **Modal frontend** : Interface utilisateur complète

## 📊 Plans d'Abonnement

| Plan | Crédits/mois | Prix |
|------|--------------|------|
| Free | 5 | 0€ |
| Starter | 30 | 9.99€ |
| Professional | 100 | 29.99€ |
| Enterprise | 500 | 99.99€ |

## 🔧 Structure des Fichiers

```
backend/
  services/
    newsletterWorkflowGenerator.js    # Génération de workflows
    creditsService.js                  # Gestion des crédits
    injectors/
      newsletterInjector.js           # Injection des credentials
  routes/
    newsletter.js                      # API routes

src/
  components/
    NewsletterFormModal.tsx           # Modal frontend
  services/
    newsletterService.ts              # Service API client

database/
  create_credits_system.sql          # Tables SQL

scripts/
  init-newsletter-system.js          # Script d'initialisation
```

## 🚨 Dépannage

### Erreur "Crédits insuffisants"
- Vérifier le plan d'abonnement : `GET /api/newsletter/credits`
- Changer de plan si nécessaire : `POST /api/newsletter/change-plan`

### Erreur "Credential SMTP non trouvé"
- Vérifier la configuration SMTP dans `backend/config.js`
- Vérifier que le credential existe dans n8n

### Erreur "Credential OpenRouter non trouvé"
- Ajouter une clé API OpenRouter via l'interface admin
- Vérifier que la clé est active dans `admin_api_keys`

## 📚 Documentation Complète

Voir `NEWSLETTER_WORKFLOW_SYSTEM.md` pour la documentation détaillée.

