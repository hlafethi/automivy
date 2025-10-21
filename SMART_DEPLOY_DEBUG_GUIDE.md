# 🔍 **Guide de Diagnostic Smart Deploy**

## ❌ **Problème Actuel**

**Erreur 500** : `POST http://localhost:3004/api/smart-deploy/deploy 500 (Internal Server Error)`

## 🔧 **Logs de Debug Ajoutés**

J'ai ajouté des logs détaillés pour identifier exactement où l'erreur se produit :

### **1. Logs de Début de Route**
```
🚀 [SmartDeploy] Déploiement intelligent demandé
🚀 [SmartDeploy] User: user@heleam.com
🚀 [SmartDeploy] Body: { "workflowId": "...", "credentials": {...} }
```

### **2. Logs d'Injection des Credentials**
```
🔧 [SmartDeploy] Injection des credentials...
🔧 [SmartDeploy] Credentials reçus: ['smtpEmail', 'smtpPassword', 'smtpServer', 'smtpPort']
🔧 [SmartDeploy] Détails credentials: { smtpEmail: '...', smtpServer: '...', ... }
🔧 [SmartDeploy] Appel injectUserCredentials...
```

### **3. Logs d'Erreur Détaillés**
```
❌ [SmartDeploy] Erreur injection: [message d'erreur]
❌ [SmartDeploy] Stack: [stack trace complet]
```

## 🎯 **Actions de Diagnostic**

### **Étape 1 : Tester le Déploiement**
1. **Ouvrez le modal Smart Deploy** (bouton +)
2. **Sélectionnez "PDF Analysis Complete"**
3. **Remplissez les credentials** :
   - **Email SMTP** : `user@heleam.com`
   - **Mot de passe SMTP** : Votre mot de passe
   - **Serveur SMTP** : `mail.heleam.com`
   - **Port SMTP** : `587`
4. **Cliquez sur "Déployer le workflow"**

### **Étape 2 : Vérifier les Logs du Serveur**
**Regardez la console du serveur backend** pour voir les logs détaillés :

**Si vous voyez :**
```
🚀 [SmartDeploy] Déploiement intelligent demandé
🚀 [SmartDeploy] User: user@heleam.com
🚀 [SmartDeploy] Body: {...}
```
→ **Le problème est dans l'injection des credentials**

**Si vous ne voyez rien :**
→ **Le problème est dans l'authentification ou la route**

### **Étape 3 : Identifier l'Erreur Spécifique**

**Erreur possible 1 : Injection des Credentials**
```
❌ [SmartDeploy] Erreur injection: [message]
```
→ **Problème dans `injectUserCredentials`**

**Erreur possible 2 : API n8n**
```
❌ [SmartDeploy] Erreur déploiement n8n: [message]
```
→ **Problème de connexion à n8n**

**Erreur possible 3 : Base de données**
```
❌ [SmartDeploy] Erreur création user workflow: [message]
```
→ **Problème de base de données**

## 🔧 **Solutions Selon l'Erreur**

### **Si Erreur d'Injection :**
- Vérifier que `node-fetch` est installé
- Vérifier la configuration n8n
- Vérifier les credentials saisis

### **Si Erreur API n8n :**
- Vérifier que n8n est accessible
- Vérifier la clé API n8n
- Vérifier les permissions

### **Si Erreur Base de données :**
- Vérifier la connexion à la base
- Vérifier les tables existantes
- Vérifier les permissions utilisateur

## 🚀 **Test Maintenant**

**Testez le déploiement et partagez-moi les logs du serveur backend !**

Les logs détaillés nous diront exactement où est le problème.
