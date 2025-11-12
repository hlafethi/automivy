# 📊 Analyse Complète de l'Application Automivy

## 🎯 Vue d'Ensemble

**Automivy** est une plateforme SaaS d'automatisation de workflows qui permet aux utilisateurs de créer, déployer et gérer des workflows n8n de manière simplifiée, avec une interface transparente qui masque la complexité technique de n8n.

---

## 🏗️ Architecture Générale

### **Stack Technologique**

#### **Frontend**
- **Framework**: React 18.3.1 avec TypeScript
- **Build Tool**: Vite 7.1.9
- **Routing**: React Router DOM 7.9.4
- **Styling**: Tailwind CSS 3.4.1
- **Icons**: Lucide React
- **Rich Text**: React Quill (Quill 2.0.3)

#### **Backend**
- **Runtime**: Node.js
- **Framework**: Express 5.1.0
- **Base de données**: PostgreSQL (via pg 8.16.3)
- **Authentification**: JWT (jsonwebtoken 9.0.2)
- **Hashing**: bcryptjs 3.0.2
- **Email**: Nodemailer 7.0.9
- **HTTP Client**: node-fetch 2.7.0

#### **Intégrations Externes**
- **n8n**: Plateforme d'automatisation de workflows (https://n8n.globalsaas.eu)
- **OpenRouter**: API pour modèles IA (GPT-4o-mini, Llama, etc.)
- **LocalAI/Ollama**: Alternative locale pour génération IA
- **SMTP**: mail.heleam.com (port 587, STARTTLS)

---

## 📁 Structure du Projet

```
automivy/
├── backend/                    # API Backend Node.js/Express
│   ├── routes/                # Routes API
│   │   ├── auth.js            # Authentification (login, register, reset password)
│   │   ├── templates.js       # Gestion des templates de workflows
│   │   ├── smartDeploy.js     # Déploiement intelligent de workflows
│   │   ├── enhancedAI.js      # Génération IA de workflows
│   │   ├── n8n.js             # Proxy vers API n8n
│   │   ├── userWorkflows.js   # Workflows utilisateur
│   │   ├── tickets.js         # Système de tickets
│   │   ├── community.js       # Communauté/Discussions
│   │   └── ...                # Autres routes (analytics, logs, alerts, etc.)
│   ├── services/              # Services métier
│   │   ├── credentialInjector.js    # Injection de credentials dans workflows
│   │   ├── aiService.js              # Service OpenRouter pour génération IA
│   │   ├── ollamaService.js          # Service LocalAI/Ollama
│   │   ├── enhancedAIGenerator.js    # Générateur IA amélioré
│   │   ├── n8nService.js             # Service n8n (création workflows, credentials)
│   │   ├── workflowAnalyzer.js       # Analyse de workflows
│   │   └── ...                       # Autres services
│   ├── middleware/            # Middlewares Express
│   │   ├── auth.js            # Authentification JWT
│   │   └── logging.js         # Logging des requêtes
│   ├── database.js            # Couche d'accès à PostgreSQL
│   ├── config.js              # Configuration (DB, JWT, n8n, SMTP)
│   └── server.js              # Point d'entrée serveur
│
├── src/                       # Frontend React/TypeScript
│   ├── components/            # Composants React
│   │   ├── UserAutomations.tsx      # Interface utilisateur principale
│   │   ├── AdminDashboard.tsx       # Interface admin
│   │   ├── SmartDeployModal.tsx     # Modal déploiement intelligent
│   │   ├── AIWorkflowGenerator.tsx  # Générateur IA de workflows
│   │   ├── TemplateCatalog.tsx      # Catalogue de templates
│   │   └── ...                      # Autres composants
│   ├── services/              # Services frontend (API calls)
│   │   ├── smartDeployService.ts    # Service déploiement intelligent
│   │   ├── enhancedAIService.ts      # Service génération IA
│   │   ├── templateService.ts       # Service templates
│   │   └── ...                      # Autres services
│   ├── contexts/              # Contextes React
│   │   └── AuthContext.tsx    # Contexte d'authentification
│   ├── pages/                 # Pages React Router
│   │   ├── LandingPage.tsx   # Page d'accueil publique
│   │   ├── SupportPage.tsx    # Page support
│   │   └── ...               # Autres pages
│   └── App.tsx               # Composant racine avec routing
│
└── scripts/                   # Scripts utilitaires
    ├── reset-user-password.js
    └── ...
```

---

## 🔑 Fonctionnalités Principales

### **1. Authentification & Gestion Utilisateurs**

#### **Système d'authentification**
- **Login/Register**: Email + mot de passe (hashé avec bcrypt)
- **JWT**: Tokens avec expiration (24h par défaut)
- **Rôles**: `user` et `admin`
- **Reset Password**: Système complet avec tokens temporaires et emails SMTP

#### **Gestion des utilisateurs**
- **Profils utilisateur**: Table `user_profiles`
- **Isolation des données**: Chaque utilisateur voit uniquement ses workflows
- **Gestion admin**: Interface complète pour gérer les utilisateurs

---

### **2. Templates de Workflows**

#### **Création & Gestion**
- **Upload de templates**: Les admins peuvent uploader des workflows n8n (JSON)
- **Templates visibles**: Les utilisateurs voient uniquement les templates marqués `visible = true`
- **Édition**: Les admins peuvent éditer les templates (nom, description, JSON)
- **Stockage**: Templates stockés en base avec leur JSON workflow complet

#### **Structure Template**
```json
{
  "id": "uuid",
  "name": "Nom du template",
  "description": "Description",
  "json": "{...workflow n8n complet...}",
  "visible": true/false,
  "created_by": "user_id",
  "created_at": "timestamp"
}
```

---

### **3. Smart Deploy (Déploiement Intelligent)**

#### **Fonctionnalité Clé**
Le **Smart Deploy** est le cœur de l'application : il permet de déployer un template de workflow sur n8n avec injection automatique des credentials utilisateur.

#### **Processus de déploiement**
1. **Analyse du workflow** (`/api/smart-deploy/analyze`)
   - Analyse le template pour détecter les credentials requis (IMAP, SMTP, OpenRouter, etc.)
   - Génère un formulaire dynamique avec les champs nécessaires

2. **Déploiement** (`/api/smart-deploy/deploy`)
   - Injection des credentials utilisateur dans le workflow
   - Création des credentials n8n (IMAP, SMTP) si nécessaire
   - Injection des credentials admin (OpenRouter) si nécessaire
   - Création du workflow dans n8n
   - Activation automatique du workflow
   - Enregistrement dans `user_workflows`

#### **Injection de Credentials**
Le service `credentialInjector.js` :
- Remplace les placeholders (`USER_IMAP_CREDENTIAL_ID`, `ADMIN_OPENROUTER_CREDENTIAL_ID`, etc.)
- Crée les credentials n8n si nécessaire (IMAP, SMTP)
- Assigne les credentials aux nœuds appropriés
- Nettoie le workflow pour n8n (settings, structure)

---

### **4. Génération IA de Workflows**

#### **Deux Services IA**
1. **OpenRouter** (`aiService.js`)
   - Modèle par défaut: `openai/gpt-4o-mini` (économique)
   - Alternatives: Llama 3.1, Claude, etc.
   - Génération complète de workflows n8n depuis une description

2. **LocalAI/Ollama** (`ollamaService.js`)
   - Alternative locale pour éviter les coûts OpenRouter
   - Modèles: mistral-7b, gemma-3, qwen2.5-72b
   - Support Docker et endpoints multiples

#### **Processus de génération**
1. **Prompt système** : Instructions strictes pour générer des workflows n8n valides
2. **Post-processing** : 
   - Nettoyage du JSON (suppression markdown, correction syntaxe)
   - Validation des nœuds et connexions
   - Correction automatique des erreurs courantes
3. **Sauvegarde** : Le workflow généré est sauvegardé comme template

#### **Règles Critiques pour l'IA**
- Chaque nœud doit avoir un `id` unique
- Les connexions utilisent les **noms** des nœuds (pas les IDs)
- Les credentials doivent être des objets `{id, name}` (pas des strings)
- Structure de connexions: `[[{...}]]` (array d'arrays)
- Pour workflows email + IA: nœuds obligatoires (IMAP, Aggregate, AI Agent, OpenRouter, Calculator, Memory)
- `settings` doit être un objet vide `{}` lors de la création

---

### **5. Gestion des Workflows Utilisateur**

#### **Table `user_workflows`**
```sql
- id: uuid (PK)
- user_id: uuid (FK vers users)
- template_id: uuid (FK vers templates)
- n8n_workflow_id: text (ID du workflow dans n8n)
- name: text
- is_active: boolean
- created_at: timestamp
```

#### **Fonctionnalités**
- **Création**: Déploiement depuis un template via Smart Deploy
- **Activation/Désactivation**: Toggle via API n8n
- **Suppression**: Suppression dans n8n + base de données
- **Édition**: Modification des paramètres (selon type de workflow)

---

### **6. Intégration n8n**

#### **Proxy API n8n** (`routes/n8n.js`)
L'application agit comme un proxy vers l'API n8n :
- **GET/POST/PUT/PATCH** `/api/n8n/workflows`
- **GET/POST** `/api/n8n/credentials`
- **POST** `/api/n8n/workflows/:id/activate`
- **POST** `/api/n8n/workflows/:id/deactivate`

#### **Gestion des Credentials n8n**
- **IMAP**: Création avec host, port, user, password, secure
- **SMTP**: Création avec host, port, user, password, secure, disableStartTls
- **OpenRouter**: Credentials admin partagés (injectés automatiquement)

#### **Structure Workflow n8n**
```json
{
  "name": "Workflow Name",
  "nodes": [...],
  "connections": {
    "Node Name": {
      "main": [[{"node": "Next Node", "type": "main", "index": 0}]],
      "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]
    }
  },
  "settings": {},
  "active": false
}
```

---

### **7. Interface Utilisateur**

#### **Dashboard Utilisateur** (`UserAutomations.tsx`)
- **Onglet Automations**: Liste des workflows déployés
  - Activation/désactivation
  - Édition (modals spécialisés selon type)
  - Suppression
  - Bouton PDF pour workflows PDF Analysis
- **Onglet Catalog**: Catalogue de templates disponibles
  - Filtrage et recherche
  - Déploiement via Smart Deploy
- **Onglet Tickets**: Système de tickets de support
- **Onglet Community**: Discussions et communauté
- **Onglet Profile**: Profil utilisateur

#### **Dashboard Admin** (`AdminDashboard.tsx`)
- **All Templates**: Liste de tous les templates (visibles et invisibles)
- **Upload Template**: Upload de nouveaux templates
- **AI Generator**: Générateur IA de workflows
- **API Keys**: Gestion des clés API (OpenRouter, etc.)
- **All Workflows**: Vue de tous les workflows utilisateur
- **Landing Page**: Édition de la page d'accueil
- **Analytics**: Statistiques et métriques
- **Tickets**: Gestion des tickets
- **Community**: Modération des discussions
- **Users**: Gestion des utilisateurs
- **Database**: Monitoring de la base de données
- **Activity**: Logs d'activité
- **Alerts**: Alertes système
- **Notifications**: Gestion des notifications
- **Logs**: Logs système

---

### **8. Système de Tickets**

#### **Fonctionnalités**
- Création de tickets par les utilisateurs
- Gestion par les admins
- Statuts: open, in_progress, resolved, closed
- Priorités: low, medium, high, urgent

---

### **9. Communauté**

#### **Fonctionnalités**
- Discussions entre utilisateurs
- Modération par les admins
- Badges et récompenses automatiques

---

### **10. Landing Page**

#### **Gestion**
- Édition complète de la page d'accueil
- Sections: Hero, Features, Testimonials, CTA, Footer
- Support média (images, vidéos)
- Contenu dynamique depuis la base de données

---

## 🗄️ Base de Données PostgreSQL

### **Tables Principales**

#### **users**
```sql
- id: uuid (PK)
- email: text (unique)
- password_hash: text
- role: text ('user' | 'admin')
- created_at: timestamp
- last_login: timestamp
```

#### **user_profiles**
```sql
- id: uuid (PK, FK vers users)
- email: text
- role: text
- ... (autres champs profil)
```

#### **templates**
```sql
- id: uuid (PK)
- created_by: uuid (FK vers users)
- name: text
- description: text
- json: text (JSON workflow n8n)
- visible: boolean
- created_at: timestamp
```

#### **user_workflows**
```sql
- id: uuid (PK)
- user_id: uuid (FK vers users)
- template_id: uuid (FK vers templates)
- n8n_workflow_id: text
- name: text
- is_active: boolean
- created_at: timestamp
```

#### **forgot_password_tokens**
```sql
- id: uuid (PK)
- user_id: text
- token: text (unique)
- expires_at: timestamp
- used: boolean
- created_at: timestamp
```

#### **tickets**
```sql
- id: uuid (PK)
- user_id: uuid (FK vers users)
- title: text
- description: text
- status: text
- priority: text
- created_at: timestamp
```

#### **landing_content**
```sql
- id: uuid (PK)
- section: text
- content: jsonb
- created_at: timestamp
- updated_at: timestamp
```

---

## 🔐 Sécurité

### **Authentification**
- **JWT**: Tokens signés avec secret
- **Expiration**: 24h par défaut
- **Middleware**: Vérification sur toutes les routes protégées

### **Isolation des Données**
- **RLS (Row Level Security)**: Isolation par utilisateur (si configuré)
- **Filtrage**: Les requêtes filtrent par `user_id`
- **Credentials**: Jamais stockés en clair, toujours injectés dynamiquement

### **Validation**
- **Input validation**: Validation des données entrantes
- **SQL Injection**: Protection via paramètres préparés (pg)
- **XSS**: Protection React par défaut

---

## 🔄 Flux de Données Principaux

### **1. Déploiement d'un Workflow**

```
Utilisateur → SmartDeployModal
  ↓
Frontend: POST /api/smart-deploy/analyze
  ↓
Backend: Analyse du template
  ↓
Frontend: Affiche formulaire dynamique
  ↓
Utilisateur: Remplit les credentials
  ↓
Frontend: POST /api/smart-deploy/deploy
  ↓
Backend: credentialInjector.injectUserCredentials()
  ↓
Backend: Création credentials n8n (IMAP, SMTP)
  ↓
Backend: POST /api/n8n/workflows (création workflow)
  ↓
Backend: PUT /api/n8n/workflows/:id (mise à jour credentials)
  ↓
Backend: POST /api/n8n/workflows/:id/activate
  ↓
Backend: INSERT INTO user_workflows
  ↓
Frontend: Affiche succès, recharge la liste
```

### **2. Génération IA d'un Workflow**

```
Admin → AIWorkflowGenerator
  ↓
Frontend: POST /api/enhanced-ai/generate-intelligent
  ↓
Backend: enhancedAIGenerator.generateIntelligentWorkflow()
  ↓
Backend: aiService.generateWorkflow() (OpenRouter)
  ↓
OpenRouter API: Génération du workflow JSON
  ↓
Backend: Post-processing (nettoyage, validation, correction)
  ↓
Backend: Retourne workflow JSON
  ↓
Frontend: Affiche le workflow généré
  ↓
Admin: Sauvegarde comme template
  ↓
Frontend: POST /api/templates
  ↓
Backend: INSERT INTO templates
```

---

## 🎨 Interface Utilisateur

### **Design System**
- **Couleurs**: Palette Tailwind (slate, green, blue)
- **Typographie**: Système de polices Tailwind
- **Composants**: Design cohérent avec Tailwind
- **Responsive**: Mobile-first avec breakpoints Tailwind

### **Composants Clés**
- **Modals**: Modals réutilisables pour actions
- **Forms**: Formulaires dynamiques générés depuis les workflows
- **Tables**: Affichage tabulaire des workflows/templates
- **Cards**: Cartes pour workflows et templates

---

## 🚀 Points Forts de l'Architecture

1. **Séparation des responsabilités**: Frontend/Backend bien séparés
2. **Services modulaires**: Chaque service a une responsabilité claire
3. **Proxy n8n**: L'application cache la complexité de n8n
4. **Injection automatique**: Credentials injectés automatiquement
5. **Génération IA**: Workflows générés depuis descriptions naturelles
6. **Isolation utilisateur**: Chaque utilisateur a ses propres workflows
7. **Extensibilité**: Architecture modulaire facile à étendre

---

## ⚠️ Points d'Attention

1. **Settings n8n**: Doit être `{}` lors de la création (pas de propriétés supplémentaires)
2. **Connexions n8n**: Utilisent les **noms** des nœuds, pas les IDs
3. **Credentials**: Format objet `{id, name}` requis, pas de strings
4. **Structure connexions**: Format `[[{...}]]` (array d'arrays)
5. **Activation workflow**: Se fait après création, `active` est read-only
6. **Parsing JSON**: Templates peuvent être strings ou objets

---

## 📝 Notes Techniques

### **Configuration**
- **Backend Port**: 3004
- **Frontend Port**: 5173 (Vite dev)
- **n8n URL**: https://n8n.globalsaas.eu
- **Database**: PostgreSQL sur 147.93.58.155:5432

### **Variables d'Environnement**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `N8N_URL`, `N8N_API_KEY`
- `OPENROUTER_API_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

---

## 🎯 Cas d'Usage Principaux

1. **Admin crée un template**: Upload ou génération IA → Template visible pour utilisateurs
2. **Utilisateur déploie un template**: Smart Deploy → Workflow actif sur n8n
3. **Utilisateur active/désactive**: Toggle → Mise à jour dans n8n
4. **Utilisateur supprime**: Suppression → Nettoyage n8n + BDD
5. **Génération IA**: Description → Workflow complet généré

---

Cette application est une **plateforme SaaS complète** qui simplifie l'utilisation de n8n pour les utilisateurs finaux, avec une interface transparente et des fonctionnalités avancées de génération IA.

