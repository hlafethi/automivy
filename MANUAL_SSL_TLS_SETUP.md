# Configuration Manuelle SSL/TLS dans n8n

## 🚨 Problème : SSL/TLS n'est pas coché automatiquement

Même avec les paramètres dans le workflow, n8n ne coche pas automatiquement SSL/TLS dans les credentials. Il faut le faire **manuellement**.

## 🔧 Solution : Configuration Manuelle Obligatoire

### Étape 1: Aller dans les Credentials SMTP

1. **Ouvrez n8n**
2. **Allez dans Settings (⚙️)**
3. **Cliquez sur "Credentials"**
4. **Trouvez vos credentials SMTP**
5. **Cliquez sur "Edit" (✏️)**

### Étape 2: Configuration Manuelle SSL/TLS

#### Dans l'interface n8n :

```
┌─────────────────────────────────────┐
│ SMTP Credentials                     │
├─────────────────────────────────────┤
│ Host: smtp.gmail.com                │
│ Port: 587                           │
│ Username: votre-email@gmail.com      │
│ Password: ********                   │
│                                     │
│ ☑️ SSL/TLS  ← COCHER CETTE CASE    │
│                                     │
│ [Save] [Cancel]                     │
└─────────────────────────────────────┘
```

### Étape 3: Paramètres Recommandés

#### Pour Gmail :
- **Host** : `smtp.gmail.com`
- **Port** : `587` (ou `465` pour SSL direct)
- **Username** : `votre-email@gmail.com`
- **Password** : `votre-mot-de-passe-application`
- **SSL/TLS** : ✅ **COCHÉ**

#### Pour Outlook :
- **Host** : `smtp-mail.outlook.com`
- **Port** : `587`
- **Username** : `votre-email@outlook.com`
- **Password** : `votre-mot-de-passe`
- **SSL/TLS** : ✅ **COCHÉ**

### Étape 4: Vérification

Après avoir coché SSL/TLS :

1. **Cliquez sur "Save"**
2. **Testez la connexion** (bouton "Test")
3. **Vérifiez que le test réussit**
4. **Assignez ces credentials au nœud Send Email**

## 🛠️ Alternative : Configuration par Code

Si l'interface ne fonctionne pas, vous pouvez forcer SSL/TLS dans le workflow :

### Workflow avec SSL Forcé

Le fichier `workflow-pdf-analysis-force-ssl.json` contient :

```json
{
  "options": {
    "secure": true,
    "requireTLS": true,
    "tls": {
      "rejectUnauthorized": false,
      "secureProtocol": "TLSv1_2_method",
      "ciphers": "HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA"
    },
    "ssl": {
      "rejectUnauthorized": false,
      "secureProtocol": "TLSv1_2_method"
    }
  }
}
```

## 📋 Checklist de Vérification

### Dans n8n :
- [ ] **Settings > Credentials**
- [ ] **Credentials SMTP sélectionnés**
- [ ] **Case SSL/TLS COCHÉE** ✅
- [ ] **Host et port corrects**
- [ ] **Username et password valides**
- [ ] **Test de connexion réussi**

### Dans le Workflow :
- [ ] **Import du workflow `workflow-pdf-analysis-force-ssl.json`**
- [ ] **Credentials assignés au nœud Send Email**
- [ ] **Test d'exécution du workflow**

## 🚨 Points Critiques

### 1. SSL/TLS doit être coché MANUELLEMENT
- ❌ **Ne pas compter sur l'auto-configuration**
- ✅ **Cocher la case SSL/TLS dans l'interface**
- ✅ **Sauvegarder les credentials**

### 2. Test de Connexion Obligatoire
- ✅ **Tester la connexion avant d'utiliser**
- ✅ **Vérifier que le test réussit**
- ✅ **Pas d'erreur de timeout**

### 3. Configuration du Nœud
- ✅ **Assigner les credentials au nœud**
- ✅ **Vérifier que SSL/TLS est activé**
- ✅ **Tester l'envoi d'email**

## 🔄 Workflow de Test

1. **Importez** `workflow-pdf-analysis-force-ssl.json`
2. **Configurez** les credentials SMTP avec SSL/TLS coché
3. **Assignez** les credentials au nœud Send Email
4. **Testez** l'exécution du workflow
5. **Vérifiez** que l'email est envoyé sans timeout

## ✅ Résultat Attendu

Avec SSL/TLS coché manuellement :
- ✅ **Pas d'erreur ETIMEDOUT**
- ✅ **Connexion sécurisée**
- ✅ **Envoi d'email réussi**
- ✅ **Pas de timeout**

## 🆘 Si ça ne fonctionne toujours pas

1. **Vérifiez votre mot de passe d'application** (Gmail)
2. **Essayez un port différent** (465 au lieu de 587)
3. **Utilisez un service SMTP différent** (SendGrid, Mailgun)
4. **Vérifiez les paramètres de firewall**
5. **Contactez le support n8n**
