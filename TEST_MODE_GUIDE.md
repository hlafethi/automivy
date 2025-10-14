# 🧪 Guide de Test - Mode Test "Mot de Passe Oublié"

## 🎯 **Mode Test Activé**

Le système "mot de passe oublié" fonctionne maintenant en **mode test** sans configuration email. Cela permet de tester l'interface complète sans avoir besoin de configurer SMTP.

## 🚀 **Comment Tester :**

### **1. Accès à l'Interface**
1. **Aller sur** : `http://localhost:5173`
2. **Cliquer sur** "Mot de passe oublié ?" sous le champ mot de passe
3. **Saisir un email** (ex: `user@heleam.com`)
4. **Cliquer sur** "Envoyer le lien"

### **2. Mode Test - Lien Affiché**
En mode test, le système affiche directement le lien de réinitialisation :

```
🧪 Mode Test
En mode test, voici le lien de réinitialisation :
http://localhost:5173/reset-password?token=test-token-1736841234567
```

### **3. Test de Réinitialisation**
1. **Copier le lien** affiché dans la page
2. **Ouvrir un nouvel onglet** et coller l'URL
3. **Vérifier** que la page de réinitialisation s'affiche
4. **Saisir un nouveau mot de passe** (minimum 8 caractères)
5. **Confirmer le mot de passe**
6. **Cliquer sur** "Réinitialiser le mot de passe"

## 🔍 **Ce qui Fonctionne en Mode Test :**

### **✅ Interface Complète**
- ✅ **Formulaire de demande** : Saisie email et envoi
- ✅ **Page de confirmation** : Affichage du lien de test
- ✅ **Page de réinitialisation** : Formulaire nouveau mot de passe
- ✅ **Navigation** : Retour à la connexion, nouveau lien

### **✅ Validation Frontend**
- ✅ **Validation email** : Format email requis
- ✅ **Validation mot de passe** : Minimum 8 caractères
- ✅ **Confirmation mot de passe** : Les deux doivent correspondre
- ✅ **Gestion d'erreurs** : Messages clairs et utiles

### **✅ API Backend**
- ✅ **Route `/auth/forgot-password`** : Accepte les demandes
- ✅ **Route `/auth/validate-reset-token`** : Valide les tokens
- ✅ **Route `/auth/reset-password`** : Traite les réinitialisations
- ✅ **Mode test email** : Simulation d'envoi d'email

## 🎨 **Interface Utilisateur :**

### **1. Page de Connexion**
```
┌─────────────────────────────────┐
│ 🚀 Automivy                     │
│                                 │
│ Email: [user@heleam.com]       │
│ Password: [••••••••]           │
│                    Mot de passe │
│                    oublié ?    │
│                                 │
│ [Sign In]                       │
└─────────────────────────────────┘
```

### **2. Page de Demande**
```
┌─────────────────────────────────┐
│ 🔐 Mot de passe oublié ?        │
│                                 │
│ Entrez votre adresse email      │
│ Email: [user@heleam.com]        │
│                                 │
│ [Envoyer le lien]               │
│                                 │
│ ← Retour à la connexion         │
└─────────────────────────────────┘
```

### **3. Page de Confirmation (Mode Test)**
```
┌─────────────────────────────────┐
│ 📧 Email envoyé !               │
│                                 │
│ Nous avons envoyé un lien à     │
│ user@heleam.com                 │
│                                 │
│ 🧪 Mode Test                    │
│ Lien: http://localhost:5173/   │
│ reset-password?token=test-...   │
│                                 │
│ [Retour à la connexion]         │
│ [Envoyer un autre email]        │
└─────────────────────────────────┘
```

### **4. Page de Réinitialisation**
```
┌─────────────────────────────────┐
│ 🔐 Nouveau mot de passe         │
│                                 │
│ Créez un nouveau mot de passe   │
│ pour user@heleam.com            │
│                                 │
│ Nouveau mot de passe: [••••••]  │
│ Confirmer: [••••••]             │
│                                 │
│ [Réinitialiser le mot de passe] │
└─────────────────────────────────┘
```

## 🔧 **Configuration pour Mode Production :**

### **1. Variables d'Environnement**
Créer `backend/.env` avec :
```env
# Configuration Email (Production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app
FROM_EMAIL=votre-email@gmail.com

# Configuration App
APP_NAME=Automivy
FRONTEND_URL=http://localhost:5173
```

### **2. Base de Données**
```bash
# Créer la table
psql -h 147.93.58.155 -U fethi -d automivy -f database/forgot_password_tokens.sql
```

### **3. Test Complet**
```bash
# Test avec email réel
node test-forgot-password.js
```

## 📊 **Logs de Test :**

### **Backend (Console)**
```
📧 [EmailService] Mode test - Email simulé pour: user@heleam.com
📧 [EmailService] Lien de réinitialisation: http://localhost:5173/reset-password?token=abc123...
📧 [EmailService] Pour activer l'envoi réel, configurez SMTP_USER et SMTP_PASSWORD
✅ [Auth] Email de réinitialisation envoyé
```

### **Frontend (Console)**
```
🔐 Demande de réinitialisation pour: user@heleam.com
✅ Email de réinitialisation envoyé
```

## 🎉 **Avantages du Mode Test :**

### **✅ Développement**
- ✅ **Test immédiat** sans configuration email
- ✅ **Interface complète** testable
- ✅ **Débogage facile** avec logs détaillés
- ✅ **Pas de dépendances** externes

### **✅ Démonstration**
- ✅ **Présentation** de l'interface utilisateur
- ✅ **Flux complet** visible
- ✅ **Fonctionnalités** démontrables
- ✅ **Sécurité** des tokens testable

### **✅ Production**
- ✅ **Configuration simple** pour activer l'email réel
- ✅ **Même code** pour test et production
- ✅ **Migration transparente** vers l'email réel
- ✅ **Sécurité** maintenue en production

## 🚀 **Prochaines Étapes :**

1. **Tester l'interface** en mode test
2. **Configurer l'email** pour la production
3. **Créer la table** en base de données
4. **Déployer** avec configuration email

**🎯 Le système "Mot de passe oublié" est maintenant entièrement testable en mode test !**
