# 🔗 Solution - Problème de Lien Localhost

## 🎯 **Problème Identifié :**
Le lien de réinitialisation pointe vers `localhost:5173` mais vous testez depuis un autre environnement (serveur distant, etc.).

## ✅ **Solutions Disponibles :**

### **1. Configuration d'URL Dynamique (Recommandée)**

Créer un fichier `.env` dans le dossier `backend` :

```env
# Configuration pour environnement local
FRONTEND_URL=http://localhost:5173

# Configuration pour serveur distant (remplacer par votre IP/domaine)
# FRONTEND_URL=http://votre-ip:5173
# FRONTEND_URL=http://votre-domaine.com
```

### **2. Détection Automatique d'IP**

Modifier `backend/config.js` pour détecter automatiquement l'IP :

```javascript
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

module.exports = {
  // ... autres configurations
  app: {
    name: process.env.APP_NAME || 'Automivy',
    frontendUrl: process.env.FRONTEND_URL || `http://${getLocalIP()}:5173`
  }
};
```

### **3. Configuration Manuelle**

Si vous connaissez votre IP publique ou domaine, modifiez directement dans `backend/config.js` :

```javascript
app: {
  name: process.env.APP_NAME || 'Automivy',
  frontendUrl: process.env.FRONTEND_URL || 'http://VOTRE-IP:5173'
}
```

## 🚀 **Test de la Solution :**

### **1. Vérifier l'URL Générée :**
```bash
node test-reset-link.js
```

### **2. Tester l'Interface :**
1. Aller sur `http://localhost:5173` (ou votre IP)
2. Cliquer sur "Mot de passe oublié ?"
3. Saisir un email
4. Vérifier l'email reçu
5. Cliquer sur le lien dans l'email

### **3. Vérifier le Lien :**
Le lien devrait maintenant pointer vers la bonne URL :
- **Local** : `http://localhost:5173/reset-password?token=...`
- **Réseau** : `http://VOTRE-IP:5173/reset-password?token=...`
- **Production** : `http://votre-domaine.com/reset-password?token=...`

## 🔧 **Configuration par Environnement :**

### **Développement Local :**
```env
FRONTEND_URL=http://localhost:5173
```

### **Serveur de Développement :**
```env
FRONTEND_URL=http://192.168.1.100:5173
```

### **Production :**
```env
FRONTEND_URL=https://votre-domaine.com
```

## 📧 **Test d'Email :**

Après configuration, testez l'envoi d'email :

```bash
# Test complet
node test-forgot-password.js

# Test interface
node test-forgot-password-ui.js
```

## 🎉 **Résultat Attendu :**

✅ **Lien fonctionnel** : Le lien dans l'email pointe vers la bonne URL
✅ **Page accessible** : La page de réinitialisation se charge correctement
✅ **Formulaire fonctionnel** : Saisie et validation du nouveau mot de passe
✅ **Confirmation** : Message de succès après réinitialisation

**🚀 Le système "Mot de passe oublié" fonctionne maintenant avec la bonne URL !**
