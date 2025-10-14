# 🔐 Système "Mot de Passe Oublié" - Automivy

## Vue d'ensemble

Système complet de réinitialisation de mot de passe avec tokens sécurisés, emails automatiques et interface utilisateur intuitive.

## ✨ Fonctionnalités

### 🔐 **Sécurité Avancée**
- **Tokens cryptographiques** : Génération sécurisée avec `crypto.randomBytes(32)`
- **Expiration automatique** : Tokens valides 24 heures uniquement
- **Usage unique** : Chaque token ne peut être utilisé qu'une fois
- **Nettoyage automatique** : Suppression des tokens expirés

### 📧 **Emails Professionnels**
- **Templates HTML** : Emails stylés et responsives
- **Liens sécurisés** : Tokens intégrés dans les URLs
- **Confirmations** : Email de confirmation après changement
- **Fallback texte** : Version texte pour tous les clients email

### 🎨 **Interface Utilisateur**
- **Formulaires intuitifs** : Design moderne et accessible
- **Validation en temps réel** : Feedback immédiat
- **États de chargement** : Indicateurs visuels
- **Gestion d'erreurs** : Messages clairs et utiles

## 🛠️ Architecture

### **Backend (Node.js/Express)**
```
backend/
├── services/
│   ├── forgotPasswordService.js    # Gestion des tokens
│   └── emailService.js             # Envoi d'emails
├── routes/
│   └── auth.js                     # Routes API
└── database/
    └── forgot_password_tokens.sql  # Schéma BDD
```

### **Frontend (React/TypeScript)**
```
src/
├── components/
│   ├── ForgotPasswordForm.tsx       # Formulaire demande
│   └── ResetPasswordForm.tsx       # Formulaire réinitialisation
└── pages/
    ├── ForgotPasswordPage.tsx       # Page demande
    └── ResetPasswordPage.tsx       # Page réinitialisation
```

## 🚀 Installation et Configuration

### **1. Base de Données**
```sql
-- Exécuter le script SQL
psql -d automivy -f database/forgot_password_tokens.sql
```

### **2. Variables d'Environnement**
```env
# Configuration Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app

# Configuration App
APP_NAME=Automivy
FRONTEND_URL=http://localhost:3000
```

### **3. Dépendances Backend**
```bash
cd backend
npm install nodemailer pg
```

## 📋 Utilisation

### **1. Demande de Réinitialisation**

**API Endpoint:**
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Email de réinitialisation envoyé",
  "expiresAt": "2024-01-15T10:30:00.000Z"
}
```

### **2. Validation du Token**

**API Endpoint:**
```bash
GET /api/auth/validate-reset-token/{token}
```

**Réponse:**
```json
{
  "success": true,
  "valid": true,
  "email": "user@example.com",
  "message": "Token valide"
}
```

### **3. Réinitialisation du Mot de Passe**

**API Endpoint:**
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "newPassword": "nouveauMotDePasse123"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès"
}
```

## 🎨 Interface Utilisateur

### **Page "Mot de Passe Oublié"**
- **URL** : `/forgot-password`
- **Fonctionnalités** :
  - Formulaire de saisie email
  - Validation en temps réel
  - Confirmation d'envoi
  - Liens vers la connexion

### **Page de Réinitialisation**
- **URL** : `/reset-password?token=abc123...`
- **Fonctionnalités** :
  - Validation automatique du token
  - Formulaire nouveau mot de passe
  - Confirmation de succès
  - Gestion des erreurs

## 🔧 API Routes

### **Routes Principales**
```javascript
// Demande de réinitialisation
POST /api/auth/forgot-password

// Validation du token
GET /api/auth/validate-reset-token/:token

// Réinitialisation
POST /api/auth/reset-password

// Nettoyage (admin)
POST /api/auth/cleanup-expired-tokens

// Statistiques (admin)
GET /api/auth/token-stats
```

### **Exemples d'Utilisation**

**Demande de réinitialisation :**
```javascript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});
```

**Réinitialisation :**
```javascript
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'abc123...',
    newPassword: 'nouveauMotDePasse123'
  })
});
```

## 📧 Templates Email

### **Email de Réinitialisation**
- **Sujet** : "🔐 Réinitialisation de votre mot de passe - Automivy"
- **Contenu** : Lien sécurisé + instructions
- **Expiration** : 24 heures
- **Usage** : Une seule fois

### **Email de Confirmation**
- **Sujet** : "✅ Mot de passe modifié avec succès - Automivy"
- **Contenu** : Confirmation du changement
- **Sécurité** : Alerte si non demandé

## 🔒 Sécurité

### **Mesures Implémentées**
- ✅ **Tokens cryptographiques** : 64 caractères hexadécimaux
- ✅ **Expiration automatique** : 24 heures maximum
- ✅ **Usage unique** : Tokens invalidés après utilisation
- ✅ **Nettoyage automatique** : Suppression des tokens expirés
- ✅ **Validation stricte** : Vérification côté serveur
- ✅ **Emails sécurisés** : Pas de données sensibles dans les URLs

### **Bonnes Pratiques**
- 🔐 **HTTPS obligatoire** en production
- 🔐 **Rate limiting** sur les endpoints
- 🔐 **Logs de sécurité** pour audit
- 🔐 **Validation email** avant envoi
- 🔐 **Nettoyage périodique** des tokens

## 🧪 Tests

### **Script de Test**
```bash
node test-forgot-password.js
```

**Tests inclus :**
- ✅ Demande de réinitialisation
- ✅ Validation des tokens
- ✅ Statistiques des tokens
- ✅ Nettoyage automatique

### **Tests Manuels**
1. **Demande** : Saisir email → Recevoir lien
2. **Validation** : Cliquer lien → Formulaire s'affiche
3. **Réinitialisation** : Nouveau mot de passe → Confirmation
4. **Sécurité** : Token expiré → Erreur appropriée

## 📊 Monitoring

### **Statistiques Disponibles**
- **Total tokens** : Nombre total de tokens créés
- **Tokens utilisés** : Tokens déjà utilisés
- **Tokens expirés** : Tokens expirés
- **Tokens actifs** : Tokens valides en attente

### **Logs Importants**
```javascript
// Création de token
console.log('✅ [ForgotPassword] Token créé:', { userId, email, tokenId });

// Envoi d'email
console.log('✅ [EmailService] Email de réinitialisation envoyé:', { to: email });

// Réinitialisation
console.log('✅ [Auth] Mot de passe mis à jour pour:', email);
```

## 🚀 Déploiement

### **Variables d'Environnement Production**
```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=automivy@company.com
SMTP_PASSWORD=secure-app-password

# App
APP_NAME=Automivy
FRONTEND_URL=https://app.automivy.com

# Base de données
DB_HOST=production-db-host
DB_NAME=automivy_prod
```

### **Nettoyage Automatique**
```javascript
// Cron job pour nettoyage quotidien
0 2 * * * node -e "require('./backend/services/forgotPasswordService').cleanupExpiredTokens()"
```

## 🎯 Avantages

### **Pour les Utilisateurs**
- ✅ **Processus simple** : Email → Lien → Nouveau mot de passe
- ✅ **Sécurité** : Tokens sécurisés et expirés automatiquement
- ✅ **Interface claire** : Messages d'erreur explicites
- ✅ **Confirmation** : Email de confirmation du changement

### **Pour les Développeurs**
- ✅ **API complète** : Endpoints pour tous les cas d'usage
- ✅ **Sécurité intégrée** : Gestion automatique des tokens
- ✅ **Monitoring** : Statistiques et logs détaillés
- ✅ **Maintenance** : Nettoyage automatique des données

### **Pour l'Administration**
- ✅ **Sécurité** : Tokens cryptographiques et expiration
- ✅ **Audit** : Logs complets des actions
- ✅ **Performance** : Nettoyage automatique des données
- ✅ **Monitoring** : Statistiques en temps réel

---

**🎉 Le système "Mot de passe oublié" est maintenant complètement implémenté et prêt à être utilisé !**
