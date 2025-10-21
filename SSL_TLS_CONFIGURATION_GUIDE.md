# Guide de Configuration SSL/TLS pour n8n

## ⚠️ Problème Identifié
Le bouton SSL/TLS n'était **PAS** coché dans les credentials du nœud Send Email, ce qui causait les timeouts ETIMEDOUT.

## 🔧 Solution : Configuration SSL/TLS Correcte

### Étape 1: Configurer les Credentials SMTP dans n8n

1. **Allez dans Settings > Credentials**
2. **Créez ou modifiez vos credentials SMTP**
3. **IMPORTANT : Cochez la case "SSL/TLS"** ✅
4. **Configurez les paramètres suivants :**

```
Host: smtp.gmail.com (ou votre serveur SMTP)
Port: 587 (ou 465 pour SSL)
Username: votre-email@gmail.com
Password: votre-mot-de-passe-application
SSL/TLS: ✅ COCHÉ
```

### Étape 2: Paramètres Recommandés

#### Pour Gmail (Port 587 - STARTTLS)
```
Host: smtp.gmail.com
Port: 587
SSL/TLS: ✅ Activé
Authentication: OAuth2 ou App Password
```

#### Pour Gmail (Port 465 - SSL)
```
Host: smtp.gmail.com
Port: 465
SSL/TLS: ✅ Activé
Authentication: OAuth2 ou App Password
```

### Étape 3: Configuration du Nœud Send Email

```json
{
  "options": {
    "retryOnFail": true,
    "retryTimes": 5,
    "retryDelay": 10000,
    "timeout": 60000,
    "secure": true,
    "requireTLS": true,
    "connectionTimeout": 30000,
    "greetingTimeout": 15000,
    "socketTimeout": 30000,
    "tls": {
      "rejectUnauthorized": false
    }
  }
}
```

## 🚨 Points Critiques à Vérifier

### 1. Credentials SMTP
- [ ] **SSL/TLS est COCHÉ** ✅
- [ ] Host correct (smtp.gmail.com)
- [ ] Port correct (587 ou 465)
- [ ] Username et password corrects
- [ ] Authentification à 2 facteurs activée (Gmail)

### 2. Configuration du Nœud
- [ ] `secure: true` (pour SSL)
- [ ] `requireTLS: true`
- [ ] `tls.rejectUnauthorized: false`
- [ ] Timeouts étendus
- [ ] Retry activé

### 3. Test de Connexion
```bash
# Testez avec le script
node test-smtp-advanced.js
```

## 🔄 Workflow Corrigé

Le fichier `workflow-pdf-analysis-ssl-fixed.json` contient :

1. **SSL/TLS activé** : `"secure": true`
2. **TLS requis** : `"requireTLS": true`
3. **Configuration TLS** : `"tls": {"rejectUnauthorized": false}`
4. **Timeouts optimisés** pour éviter les timeouts
5. **Retry intelligent** avec 5 tentatives

## 📋 Checklist de Vérification

### Dans n8n :
- [ ] Credentials SMTP créés avec SSL/TLS coché
- [ ] Host et port corrects
- [ ] Username et password valides
- [ ] Test de connexion réussi

### Dans le Workflow :
- [ ] Import du workflow `workflow-pdf-analysis-ssl-fixed.json`
- [ ] Credentials assignés au nœud Send Email
- [ ] Paramètres SSL/TLS corrects
- [ ] Test d'exécution réussi

## 🛠️ Dépannage SSL/TLS

### Erreur "SSL/TLS not enabled"
**Solution :** Cochez la case SSL/TLS dans les credentials

### Erreur "Certificate verification failed"
**Solution :** Ajoutez `"tls": {"rejectUnauthorized": false}`

### Erreur "Connection timeout"
**Solution :** Augmentez les timeouts et activez retry

### Erreur "Authentication failed"
**Solution :** Vérifiez username/password et activez 2FA

## 🎯 Configuration Finale Recommandée

```json
{
  "credentials": {
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false,
      "requireTLS": true,
      "auth": {
        "user": "your-email@gmail.com",
        "pass": "your-app-password"
      }
    }
  },
  "options": {
    "retryOnFail": true,
    "retryTimes": 5,
    "retryDelay": 10000,
    "timeout": 60000,
    "secure": true,
    "requireTLS": true,
    "connectionTimeout": 30000,
    "greetingTimeout": 15000,
    "socketTimeout": 30000,
    "tls": {
      "rejectUnauthorized": false
    }
  }
}
```

## ✅ Résultat Attendu

Avec cette configuration :
- ✅ SSL/TLS activé automatiquement
- ✅ Pas de timeout ETIMEDOUT
- ✅ Connexion sécurisée
- ✅ Envoi d'email fiable
- ✅ Retry automatique en cas d'échec
