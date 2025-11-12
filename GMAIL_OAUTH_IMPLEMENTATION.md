# 🔐 Implémentation OAuth Gmail Transparente

## ✅ Modifications Apportées

### **1. Détection Automatique Gmail OAuth2**

Le système détecte maintenant automatiquement les workflows Gmail et propose la connexion OAuth2 :

- **Détection** : `workflowAnalyzer.js` détecte les nœuds `n8n-nodes-base.gmail` et les credentials `gmailOAuth2`
- **Priorité** : Gmail OAuth2 a la priorité sur IMAP pour les workflows Gmail
- **Isolation** : Chaque template garde sa logique spécifique (IMAP/SMTP pour certains, OAuth2 pour d'autres)

### **2. Flux OAuth Gmail Complet et Transparent**

#### **Backend (`backend/routes/oauth.js`)**
- **`GET /api/oauth/initiate/:provider`** : Initie le flux OAuth Gmail
  - Génère un state sécurisé
  - Stocke le state dans `oauth_states` (expire après 10 minutes)
  - Retourne l'URL d'autorisation Google

- **`GET /api/oauth/callback`** : Callback OAuth (appelé par Google)
  - Vérifie le state
  - Échange le code contre un token
  - Récupère les infos utilisateur (email)
  - **Crée automatiquement le credential dans n8n**
  - Stocke le credential dans `oauth_credentials`
  - Redirige vers `/oauth/callback` avec succès

#### **Frontend (`src/components/SmartDeployModal.tsx`)**
- Bouton "Connecter Gmail" pour les champs OAuth
- Ouvre une popup pour l'authentification Google
- Écoute les messages du callback
- Marque le champ comme connecté automatiquement

#### **Page Callback (`src/components/OAuthCallback.tsx`)**
- Affiche le statut de connexion
- Envoie un message à la fenêtre parente
- Se ferme automatiquement après succès

### **3. Injection Intelligente des Credentials**

Le système injecte automatiquement le credential Gmail OAuth2 dans les workflows :

1. **Vérifie** si l'utilisateur a déjà un credential Gmail OAuth2 stocké
2. **Utilise** le credential existant s'il est disponible
3. **Sinon**, conserve le credential du template (l'utilisateur devra se connecter)

### **4. Isolation par Template**

**Chaque template garde sa logique spécifique** :

- **Templates IMAP/SMTP** : Continuent de fonctionner avec les credentials IMAP/SMTP
- **Templates Gmail** : Utilisent automatiquement Gmail OAuth2
- **Templates mixtes** : Gèrent chaque type de credential indépendamment

**Aucun template existant n'est cassé** car :
- La détection est basée sur le type de nœud
- Chaque type de credential est géré séparément
- Les templates IMAP/SMTP ne sont pas affectés par la logique OAuth

## 🔧 Configuration Requise

### **1. Google Cloud Console**

1. Créer un projet dans [Google Cloud Console](https://console.cloud.google.com/)
2. Activer l'API Gmail
3. Créer des identifiants OAuth 2.0
4. Configurer l'URI de redirection : `http://localhost:5173/oauth/callback` (dev) ou votre URL de production

### **2. Variables d'Environnement**

Ajouter dans `backend/.env` :

```env
GOOGLE_CLIENT_ID=votre-client-id-google.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret-google
```

### **3. Base de Données**

La table `oauth_states` a été créée automatiquement pour stocker les states OAuth temporaires.

## 🎯 Fonctionnement

### **Pour un Template Gmail :**

1. **Admin crée un template** avec des nœuds Gmail
2. **Utilisateur déploie** le template via Smart Deploy
3. **Système détecte** automatiquement le besoin de Gmail OAuth2
4. **Formulaire affiche** un bouton "Connecter Gmail"
5. **Utilisateur clique** → Popup Google s'ouvre
6. **Utilisateur autorise** → Callback traité par le backend
7. **Credential créé** automatiquement dans n8n
8. **Workflow déployé** avec le credential Gmail OAuth2 injecté
9. **Workflow activé** automatiquement

### **Pour un Template IMAP/SMTP :**

1. **Admin crée un template** avec des nœuds IMAP/SMTP
2. **Utilisateur déploie** le template via Smart Deploy
3. **Système détecte** automatiquement le besoin d'IMAP/SMTP
4. **Formulaire affiche** les champs email/mot de passe
5. **Utilisateur remplit** → Credentials IMAP/SMTP créés
6. **Workflow déployé** avec les credentials IMAP/SMTP injectés
7. **Workflow activé** automatiquement

## 🔒 Sécurité

- **State OAuth** : Généré de manière sécurisée et stocké en base
- **Expiration** : States expirent après 10 minutes
- **Isolation** : Chaque utilisateur a ses propres credentials OAuth
- **Tokens** : Stockés en base (à chiffrer en production)

## 📝 Notes Importantes

1. **Transparence** : L'utilisateur ne voit jamais n8n, tout est géré automatiquement
2. **Isolation** : Chaque template garde sa logique spécifique
3. **Rétrocompatibilité** : Les templates IMAP/SMTP existants continuent de fonctionner
4. **Extensibilité** : Facile d'ajouter d'autres providers OAuth (Outlook, etc.)

