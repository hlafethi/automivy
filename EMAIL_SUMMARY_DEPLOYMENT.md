# 🚀 Déploiement Automatique Email Summary

## Vue d'ensemble

Cette fonctionnalité permet de déployer automatiquement un workflow "Email Summary" dans n8n avec création automatique des credentials IMAP et SMTP pour chaque utilisateur.

## ✨ Fonctionnalités

### 🔐 Création Automatique des Credentials
- **Credential IMAP** : Créé automatiquement pour lire les emails de l'utilisateur
- **Credential SMTP** : Créé automatiquement pour envoyer le résumé depuis l'email de l'utilisateur
- **Dérivation automatique** : Le serveur SMTP est dérivé du serveur IMAP (ex: `imap.gmail.com` → `smtp.gmail.com`)

### 🤖 Workflow Email Summary
- **Lecture IMAP** : Récupère les emails de la boîte de l'utilisateur
- **Organisation** : Structure les données email
- **Session ID** : Génère un identifiant unique pour la session
- **IA Agent** : Analyse les emails avec OpenRouter
- **Mémoire** : Maintient le contexte entre les exécutions
- **Résumé HTML** : Génère un résumé formaté
- **Envoi SMTP** : Envoie le résumé par email

## 🛠️ Utilisation

### 1. API Backend

```javascript
// Déployer un workflow Email Summary
const result = await n8nService.deployEmailSummaryWorkflow(
  userId,           // ID de l'utilisateur
  userEmail,        // Email de l'utilisateur
  userPassword,      // Mot de passe de l'utilisateur
  userImapServer    // Serveur IMAP (ex: 'imap.gmail.com')
);
```

### 2. Route API

```bash
POST /api/n8n/deploy-email-summary
Content-Type: application/json

{
  "userId": "user-123",
  "userEmail": "user@example.com",
  "userPassword": "password123",
  "userImapServer": "imap.gmail.com"
}
```

### 3. Composant React

```tsx
import { DeployEmailSummaryWorkflow } from './components/DeployEmailSummaryWorkflow';

<DeployEmailSummaryWorkflow
  userId="user-123"
  onSuccess={(workflowId) => console.log('Workflow déployé:', workflowId)}
  onError={(error) => console.error('Erreur:', error)}
/>
```

## 🔧 Configuration

### Serveurs IMAP Supportés
- **Gmail** : `imap.gmail.com` → `smtp.gmail.com`
- **Outlook** : `imap-mail.outlook.com` → `smtp-mail.outlook.com`
- **Yahoo** : `imap.mail.yahoo.com` → `smtp.mail.yahoo.com`
- **Orange** : `imap.orange.fr` → `smtp.orange.fr`
- **Free** : `imap.free.fr` → `smtp.free.fr`

### Ports et Sécurité
- **IMAP** : Port 993 (SSL/TLS)
- **SMTP** : Port 587 (STARTTLS)

## 📋 Processus de Déploiement

1. **Création des Credentials**
   - Credential IMAP avec les informations utilisateur
   - Credential SMTP avec serveur dérivé automatiquement

2. **Injection des Paramètres**
   - Remplacement des placeholders `{{USER_EMAIL}}`
   - Injection des IDs de credentials
   - Configuration des serveurs

3. **Déploiement du Workflow**
   - Création du workflow dans n8n
   - Attachement des credentials aux nodes
   - Configuration des connexions

4. **Vérification**
   - Validation du workflow créé
   - Vérification des credentials attachés
   - Test de la structure

## 🧪 Test

```bash
# Exécuter le script de test
node test-email-summary-deployment.js
```

Le script teste :
- ✅ Création du template
- ✅ Injection des paramètres
- ✅ Création des credentials
- ✅ Déploiement du workflow
- ✅ Vérification du résultat

## 🔍 Debugging

### Logs de Debug
```javascript
// Activer les logs détaillés
console.log('🔍 [DEBUG] Workflow AVANT envoi à N8N:');
console.log('🔍 [DEBUG] Workflow APRÈS nettoyage:');
console.log('✅ [injectParams] Credential IMAP utilisateur créé:');
console.log('✅ [injectParams] Credential SMTP utilisateur créé:');
```

### Vérification des Credentials
```javascript
// Lister tous les credentials
const credentials = await n8nService.getCredentials();
console.log('Credentials disponibles:', credentials);

// Vérifier un workflow spécifique
const workflow = await n8nService.getWorkflow(workflowId);
console.log('Nodes avec credentials:', 
  workflow.nodes.filter(n => n.credentials)
);
```

## 🚨 Gestion d'Erreurs

### Erreurs Communes
1. **Credential IMAP invalide** : Vérifier email/mot de passe
2. **Serveur SMTP inaccessible** : Vérifier la dérivation du serveur
3. **Workflow non créé** : Vérifier les permissions n8n
4. **Credentials non attachés** : Vérifier les IDs de credentials

### Solutions
- Vérifier les logs détaillés
- Tester les credentials manuellement
- Vérifier la connectivité n8n
- Nettoyer les credentials orphelins

## 📊 Monitoring

### Métriques Importantes
- Nombre de workflows déployés
- Taux de succès des déploiements
- Erreurs de credentials
- Performance des créations

### Alertes
- Échec de création de credential
- Workflow non déployé
- Erreur d'activation
- Problème de connectivité n8n

## 🔒 Sécurité

### Bonnes Pratiques
- Ne jamais logger les mots de passe
- Chiffrer les credentials en base
- Limiter l'accès aux credentials
- Rotation régulière des credentials

### Audit
- Logs de création de credentials
- Traçabilité des déploiements
- Monitoring des accès
- Alertes de sécurité

## 🚀 Prochaines Étapes

1. **Activation automatique** : Activer le workflow après déploiement
2. **Planification** : Configurer la fréquence d'exécution
3. **Monitoring** : Ajouter des métriques de performance
4. **Notifications** : Alertes en cas d'échec
5. **Multi-utilisateurs** : Support de plusieurs comptes email

---

**Note** : Cette fonctionnalité nécessite que n8n soit configuré et accessible, et que les credentials admin (OpenRouter) soient configurés dans l'application.
