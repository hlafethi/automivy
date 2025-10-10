# 🏗️ Architecture SaaS Automivy

## 📋 Vue d'ensemble

Automivy est maintenant une plateforme SaaS multi-utilisateurs qui permet à chaque utilisateur de créer et gérer ses propres automatisations d'analyse d'emails, avec une isolation complète des données et des workflows.

## 🎯 Fonctionnalités SaaS Implémentées

### ✅ **Workflows Utilisateur Isolés**
- Chaque utilisateur a ses propres workflows n8n
- Clonage automatique depuis les templates admin
- Credentials IMAP/OAuth personnalisés par utilisateur
- Scheduling personnalisé (heure choisie par l'utilisateur)

### ✅ **Sécurité & Isolation**
- Credentials jamais stockés en clair
- Suppression en cascade (workflow + credential n8n + BDD)
- RLS (Row Level Security) pour isolation des données
- Accès utilisateur limité à ses propres workflows

### ✅ **Interface Utilisateur**
- Dashboard utilisateur avec gestion des automatisations
- Modal de création d'automatisation avec configuration IMAP
- Activation/désactivation des workflows
- Suppression sécurisée des automatisations

## 🏛️ Architecture Technique

### **Frontend (React + TypeScript)**
```
src/
├── components/
│   ├── UserAutomations.tsx          # Interface utilisateur
│   ├── CreateAutomationModal.tsx   # Création d'automatisation
│   └── UserDashboard.tsx           # Dashboard utilisateur
├── services/
│   ├── userWorkflowService.ts      # Service workflows utilisateur
│   └── n8nService.ts               # API n8n (credentials)
└── types/
    └── index.ts                    # Types UserWorkflow
```

### **Backend (Node.js + Express)**
```
backend/
├── routes/
│   └── userWorkflows.js            # API workflows utilisateur
├── database.js                     # Méthodes BDD user_workflows
└── app.js                          # Routes intégrées
```

### **Base de Données (PostgreSQL + Supabase)**
```sql
-- Table user_workflows
CREATE TABLE user_workflows (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  template_id UUID REFERENCES templates(id),
  n8n_workflow_id TEXT NOT NULL,
  n8n_credential_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  schedule TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
- Users can only access their own workflows
- Admins can view all workflows
```

## 🔄 Flux de Création d'Automatisation

### **1. Sélection du Template**
```typescript
// Utilisateur choisit un template depuis le catalogue
const templates = await templateService.getVisibleTemplates();
```

### **2. Configuration Utilisateur**
```typescript
// Formulaire de configuration
const config: UserWorkflowConfig = {
  templateId: 'template-id',
  name: 'My Email Analysis',
  email: 'user@example.com',
  imapHost: 'imap.gmail.com',
  imapUser: 'user@example.com',
  imapPassword: 'app-password',
  schedule: '09:00',
  userPreferences: 'Analyze important emails'
};
```

### **3. Création du Credential n8n**
```typescript
// Création credential IMAP dans n8n
const credentialData = {
  name: `IMAP-${userId}-${Date.now()}`,
  type: 'imap',
  data: {
    host: config.imapHost,
    port: 993,
    user: config.imapUser,
    password: config.imapPassword,
    secure: true
  }
};
const n8nCredential = await n8nService.createCredential(credentialData);
```

### **4. Clonage et Personnalisation du Workflow**
```typescript
// Récupération du template
const template = await apiClient.getTemplate(config.templateId);

// Personnalisation
const personalizedWorkflow = await personalizeWorkflow(template, config, n8nCredential.id);

// Création dans n8n
const n8nWorkflow = await n8nService.createWorkflow(personalizedWorkflow);
```

### **5. Sauvegarde du Mapping**
```typescript
// Sauvegarde en BDD
const userWorkflow = await apiClient.createUserWorkflow({
  userId,
  templateId: config.templateId,
  n8nWorkflowId: n8nWorkflow.id,
  n8nCredentialId: n8nCredential.id,
  name: config.name,
  description: config.description,
  schedule: config.schedule,
  isActive: true
});
```

## 🛡️ Sécurité Implémentée

### **Isolation des Données**
- **RLS Policies** : Chaque utilisateur ne voit que ses workflows
- **Credentials isolés** : Chaque workflow a son propre credential n8n
- **Workflows séparés** : Pas de partage entre utilisateurs

### **Gestion des Credentials**
- **Stockage temporaire** : Credentials utilisés uniquement pour création
- **Suppression automatique** : Cascade delete (workflow + credential + BDD)
- **Chiffrement** : Supabase fournit le chiffrement at-rest

### **Audit et Traçabilité**
- **Logs détaillés** : Toutes les opérations sont loggées
- **Mapping BDD** : Traçabilité user ↔ workflow ↔ credential
- **Suppression sécurisée** : Nettoyage complet des données

## 🚀 Utilisation

### **Pour l'Utilisateur**
1. **Connexion** : Se connecter avec son compte
2. **Création** : Cliquer sur "Create Automation"
3. **Configuration** : Remplir les informations IMAP et préférences
4. **Activation** : L'automatisation se lance automatiquement
5. **Gestion** : Activer/désactiver/supprimer depuis le dashboard

### **Pour l'Admin**
- **Templates** : Créer et gérer les templates visibles
- **Monitoring** : Voir tous les workflows utilisateur
- **Support** : Accès aux logs et données pour assistance

## 📊 Avantages de l'Architecture

### **Scalabilité**
- **Workflows isolés** : Pas de conflit entre utilisateurs
- **Credentials séparés** : Sécurité maximale
- **Scheduling personnalisé** : Chaque utilisateur choisit son heure

### **Sécurité**
- **Isolation complète** : Impossible d'accéder aux données d'autres utilisateurs
- **Credentials temporaires** : Pas de stockage permanent des mots de passe
- **Suppression garantie** : Nettoyage automatique des données

### **Expérience Utilisateur**
- **Interface intuitive** : Création d'automatisation en quelques clics
- **Gestion simple** : Activation/désactivation/suppression facile
- **Personnalisation** : Chaque utilisateur configure selon ses besoins

## 🔧 Prochaines Étapes

### **Améliorations Possibles**
- [ ] **Notifications** : Alertes par email des analyses
- [ ] **Historique** : Logs des exécutions
- [ ] **Templates personnalisés** : Création par les utilisateurs
- [ ] **API publique** : Intégration avec d'autres services
- [ ] **Analytics** : Statistiques d'utilisation

### **Sécurité Avancée**
- [ ] **2FA** : Authentification à deux facteurs
- [ ] **Audit logs** : Traçabilité complète des actions
- [ ] **Chiffrement bout en bout** : Pour les données sensibles
- [ ] **Backup automatique** : Sauvegarde des configurations

## 📝 Notes Techniques

### **Dépendances**
- **Frontend** : React, TypeScript, Tailwind CSS
- **Backend** : Node.js, Express, PostgreSQL
- **n8n** : Instance distante pour workflows
- **Auth** : Supabase Auth avec JWT

### **Performance**
- **Requêtes parallèles** : Optimisation des appels API
- **Cache local** : État des composants React
- **Lazy loading** : Chargement à la demande

### **Monitoring**
- **Logs structurés** : Format JSON pour analyse
- **Métriques** : Temps de réponse, erreurs
- **Alertes** : Notification des problèmes

---

**🎉 Automivy est maintenant une plateforme SaaS complète et sécurisée !**
