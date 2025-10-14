# 🔐 Gestion des Mots de Passe - Administration PostgreSQL

## 🎯 **Outil de Changement de Mot de Passe Administrateur**

Oui, il est tout à fait possible de changer le mot de passe directement avec PostgreSQL en tant qu'admin !

## 🚀 **Utilisation de l'Outil :**

### **1. Changer le mot de passe d'un utilisateur :**
```bash
cd backend
node admin-change-password.js email@example.com NouveauMotDePasse
```

### **2. Exemples concrets :**
```bash
# Changer le mot de passe de user@heleam.com
node admin-change-password.js user@heleam.com MonNouveauMotDePasse123

# Changer le mot de passe de l'admin
node admin-change-password.js admin@automivy.com AdminPassword123

# Changer le mot de passe de n'importe quel utilisateur
node admin-change-password.js utilisateur@domaine.com MotDePasseSecurise
```

### **3. Voir l'aide :**
```bash
node admin-change-password.js
```

## 📊 **Fonctionnalités de l'Outil :**

### **✅ Changement de Mot de Passe :**
- ✅ **Hachage sécurisé** : Utilise bcrypt pour le hachage
- ✅ **Validation** : Vérifie que l'utilisateur existe
- ✅ **Confirmation** : Affiche les informations de connexion
- ✅ **Sécurité** : Mots de passe hachés en base

### **✅ Gestion des Utilisateurs :**
- ✅ **Recherche** : Trouve l'utilisateur par email
- ✅ **Vérification** : Affiche les détails de l'utilisateur
- ✅ **Mise à jour** : Met à jour le mot de passe en base
- ✅ **Confirmation** : Vérifie le changement

### **✅ Interface Utilisateur :**
- ✅ **Aide intégrée** : Instructions d'utilisation
- ✅ **Exemples** : Commandes d'exemple
- ✅ **Messages clairs** : Feedback détaillé
- ✅ **Gestion d'erreurs** : Messages d'erreur explicites

## 🔧 **Structure de la Base de Données :**

### **Table `users` :**
```sql
- id: uuid (clé primaire)
- email: text (email unique)
- password_hash: text (mot de passe haché)
- role: text (admin/user)
- created_at: timestamp
```

### **Hachage des Mots de Passe :**
- **Algorithme** : bcrypt
- **Salt rounds** : 10
- **Sécurité** : Résistant aux attaques par force brute

## 📋 **Exemples d'Utilisation :**

### **1. Changement Simple :**
```bash
cd backend
node admin-change-password.js user@heleam.com NouveauMotDePasse123
```

**Résultat :**
```
🔐 Outil de changement de mot de passe administrateur
==================================================
📧 Email utilisateur: user@heleam.com
🔑 Nouveau mot de passe: NouveauMotDePasse123

✅ Utilisateur trouvé: { id: '...', email: 'user@heleam.com', role: 'user' }
✅ Mot de passe mis à jour pour: { id: '...', email: 'user@heleam.com', role: 'user' }

🎉 Changement de mot de passe terminé !

📋 Informations de connexion :
   Email: user@heleam.com
   Mot de passe: NouveauMotDePasse123
   URL: http://localhost:5174

🔗 Vous pouvez maintenant vous connecter avec ces identifiants.
```

### **2. Utilisateur Non Trouvé :**
```bash
node admin-change-password.js inexistant@example.com MotDePasse
```

**Résultat :**
```
❌ Utilisateur non trouvé: inexistant@example.com

💡 Utilisateurs existants:
   1. admin@automivy.com (admin)
   2. user@heleam.com (user)
   3. autre@example.com (user)

🔧 Pour créer un nouvel utilisateur, utilisez:
   node admin-change-password.js email@example.com NouveauMotDePasse
```

## 🎯 **Cas d'Usage Pratiques :**

### **1. Mot de Passe Oublié :**
```bash
# L'utilisateur a oublié son mot de passe
node admin-change-password.js user@heleam.com MotDePasseTemporaire
```

### **2. Réinitialisation de Sécurité :**
```bash
# Réinitialiser tous les mots de passe après un incident
node admin-change-password.js admin@automivy.com NouveauMotDePasseAdmin
node admin-change-password.js user@heleam.com NouveauMotDePasseUser
```

### **3. Création d'Utilisateurs :**
```bash
# Créer un nouvel utilisateur (s'il n'existe pas)
node admin-change-password.js nouveau@example.com MotDePasseInitial
```

## 🔒 **Sécurité :**

### **✅ Bonnes Pratiques :**
- ✅ **Mots de passe forts** : Minimum 8 caractères
- ✅ **Hachage sécurisé** : bcrypt avec salt
- ✅ **Accès restreint** : Seul l'admin peut utiliser l'outil
- ✅ **Logs** : Traçabilité des changements

### **✅ Recommandations :**
- 🔐 **Utilisez des mots de passe complexes**
- 🔐 **Changez régulièrement les mots de passe**
- 🔐 **Ne partagez jamais les mots de passe par email**
- 🔐 **Utilisez l'authentification à deux facteurs si possible**

## 🎉 **Avantages de cette Méthode :**

### **✅ Rapidité :**
- Changement instantané
- Pas besoin de redémarrer l'application
- Accès direct à la base de données

### **✅ Flexibilité :**
- Change n'importe quel utilisateur
- Crée de nouveaux utilisateurs
- Gère tous les rôles (admin/user)

### **✅ Sécurité :**
- Hachage sécurisé des mots de passe
- Validation des utilisateurs
- Gestion d'erreurs complète

**🚀 L'outil de gestion des mots de passe est maintenant disponible et fonctionnel !**
