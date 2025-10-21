# Configuration SSL/TLS dans les Credentials SMTP

## ✅ Correction : SSL/TLS dans les Credentials

Vous avez absolument raison ! Le paramètre `"secure": true` doit être dans les **credentials SMTP** et non pas seulement dans les `options` du nœud.

## 🔧 Configuration Correcte

### Dans les Credentials SMTP :

```json
"credentials": {
  "smtp": {
    "id": "USER_SMTP_CREDENTIAL_ID",
    "name": "USER_SMTP_CREDENTIAL_NAME",
    "user": "user@heleam.com",
    "password": "MON_MDP",
    "host": "smtp.gmail.com",
    "port": 465,
    "secure": true
  }
}
```

### Dans les Options du Nœud (sans secure) :

```json
"parameters": {
  "options": {
    "retryOnFail": true,
    "retryTimes": 5,
    "retryDelay": 10000,
    "timeout": 60000,
    "connectionTimeout": 30000,
    "greetingTimeout": 15000,
    "socketTimeout": 30000
  }
}
```

## 📋 Différences Importantes

### ❌ Configuration Incorrecte (ce que j'avais fait) :
```json
"parameters": {
  "options": {
    "secure": true,  ← MAUVAIS : dans options
    "requireTLS": true
  }
}
```

### ✅ Configuration Correcte :
```json
"credentials": {
  "smtp": {
    "secure": true,  ← BON : dans credentials
    "port": 465
  }
}
```

## 🔧 Ports et SSL/TLS

### Port 465 (SSL/TLS natif) :
```json
{
  "host": "smtp.gmail.com",
  "port": 465,
  "secure": true
}
```

### Port 587 (STARTTLS) :
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "requireTLS": true
}
```

## 🛠️ Configuration Complète Recommandée

### Pour Gmail (Port 465 - SSL natif) :
```json
{
  "credentials": {
    "smtp": {
      "user": "user@heleam.com",
      "password": "MON_MDP_APPLICATION",
      "host": "smtp.gmail.com",
      "port": 465,
      "secure": true
    }
  },
  "parameters": {
    "options": {
      "retryOnFail": true,
      "retryTimes": 5,
      "retryDelay": 10000,
      "timeout": 60000,
      "connectionTimeout": 30000,
      "greetingTimeout": 15000,
      "socketTimeout": 30000
    }
  }
}
```

### Pour Gmail (Port 587 - STARTTLS) :
```json
{
  "credentials": {
    "smtp": {
      "user": "user@heleam.com",
      "password": "MON_MDP_APPLICATION",
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false
    }
  },
  "parameters": {
    "options": {
      "requireTLS": true,
      "retryOnFail": true,
      "retryTimes": 5,
      "retryDelay": 10000,
      "timeout": 60000,
      "connectionTimeout": 30000,
      "greetingTimeout": 15000,
      "socketTimeout": 30000
    }
  }
}
```

## 🚨 Points Critiques

### 1. SSL/TLS dans les Credentials
- ✅ **`"secure": true` dans les credentials**
- ❌ **Pas dans les options du nœud**

### 2. Port Correct
- **Port 465** : SSL/TLS natif (`secure: true`)
- **Port 587** : STARTTLS (`secure: false`, `requireTLS: true`)

### 3. Configuration n8n
- **Credentials SMTP** : Contiennent `secure: true`
- **Options du nœud** : Contiennent retry, timeout, etc.

## 📋 Checklist de Vérification

### Dans les Credentials SMTP :
- [ ] **Host correct** (smtp.gmail.com)
- [ ] **Port correct** (465 pour SSL, 587 pour STARTTLS)
- [ ] **Username et password valides**
- [ ] **`"secure": true` dans les credentials** ✅
- [ ] **Test de connexion réussi**

### Dans le Workflow :
- [ ] **Import du workflow `workflow-pdf-analysis-credentials-ssl.json`**
- [ ] **Credentials assignés au nœud Send Email**
- [ ] **Options du nœud sans `secure`**
- [ ] **Test d'exécution réussi**

## ✅ Résultat Attendu

Avec `"secure": true` dans les credentials :
- ✅ **SSL/TLS activé automatiquement**
- ✅ **Pas d'erreur ETIMEDOUT**
- ✅ **Connexion sécurisée**
- ✅ **Envoi d'email réussi**

## 🔄 Workflow Corrigé

Le fichier `workflow-pdf-analysis-credentials-ssl.json` contient :

1. **Credentials SMTP** avec `"secure": true`
2. **Port 465** pour SSL natif
3. **Options du nœud** sans `secure`
4. **Configuration complète** pour éviter les timeouts

Cette configuration devrait résoudre définitivement le problème ETIMEDOUT !
