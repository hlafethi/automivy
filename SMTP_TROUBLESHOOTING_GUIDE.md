# Guide de Résolution des Problèmes SMTP

## Problème : ETIMEDOUT - "Greeting never received"

### 🔍 Diagnostic
L'erreur "Greeting never received" indique que le serveur SMTP n'a pas envoyé le message de salutation initial dans le délai imparti.

### 🛠️ Solutions Immédiates

#### 1. Configuration SMTP Optimisée pour n8n
```json
{
  "options": {
    "retryOnFail": true,
    "retryTimes": 5,
    "retryDelay": 10000,
    "timeout": 60000,
    "secure": false,
    "requireTLS": true,
    "connectionTimeout": 30000,
    "greetingTimeout": 15000,
    "socketTimeout": 30000,
    "pool": true,
    "maxConnections": 5,
    "maxMessages": 100,
    "rateDelta": 1000,
    "rateLimit": 5
  }
}
```

#### 2. Configurations SMTP Alternatives

**Gmail (Port 587)**
- Host: `smtp.gmail.com`
- Port: `587`
- Secure: `false`
- Require TLS: `true`

**Gmail (Port 465)**
- Host: `smtp.gmail.com`
- Port: `465`
- Secure: `true`
- Require TLS: `false`

**Outlook**
- Host: `smtp-mail.outlook.com`
- Port: `587`
- Secure: `false`
- Require TLS: `true`

**SendGrid**
- Host: `smtp.sendgrid.net`
- Port: `587`
- Secure: `false`
- Require TLS: `true`

### 🔧 Étapes de Résolution

#### Étape 1: Vérifier les Credentials
1. Vérifiez que votre email et mot de passe sont corrects
2. Pour Gmail, utilisez un mot de passe d'application
3. Activez l'authentification à 2 facteurs si nécessaire

#### Étape 2: Tester la Connexion
```bash
node test-smtp-advanced.js
```

#### Étape 3: Configurer n8n
1. Importez le workflow `workflow-pdf-analysis-ultra-robust.json`
2. Configurez vos credentials SMTP
3. Testez avec les paramètres optimisés

#### Étape 4: Utiliser le Fallback
Le workflow ultra-robust inclut un système de fallback automatique.

### 🚨 Solutions d'Urgence

#### Solution 1: Changer de Port
- Essayez le port 465 au lieu de 587
- Changez `secure: true` et `requireTLS: false`

#### Solution 2: Utiliser un Service SMTP Externe
- **SendGrid** : Plus fiable, moins de restrictions
- **Mailgun** : Bon pour les applications
- **Amazon SES** : Solution professionnelle

#### Solution 3: Configuration de Fallback
Le workflow inclut maintenant :
- Nœud principal avec retry avancé
- Nœud de fallback automatique
- Gestion d'erreur intelligente

### 📊 Paramètres Recommandés par Type de Problème

#### Pour les Timeouts
```json
{
  "connectionTimeout": 30000,
  "greetingTimeout": 15000,
  "socketTimeout": 30000,
  "timeout": 60000,
  "retryOnFail": true,
  "retryTimes": 5,
  "retryDelay": 10000
}
```

#### Pour les Problèmes de Sécurité
```json
{
  "secure": false,
  "requireTLS": true,
  "tls": {
    "rejectUnauthorized": false
  }
}
```

#### Pour la Fiabilité
```json
{
  "pool": true,
  "maxConnections": 5,
  "maxMessages": 100,
  "rateDelta": 1000,
  "rateLimit": 5
}
```

### 🔄 Workflow de Fallback

Le nouveau workflow `workflow-pdf-analysis-ultra-robust.json` inclut :

1. **Nœud Principal** : Configuration SMTP optimisée
2. **Nœud de Fallback** : Configuration alternative
3. **Gestion d'Erreur** : Détection automatique des échecs
4. **Retry Intelligent** : 5 tentatives avec délais progressifs

### 📝 Checklist de Vérification

- [ ] Credentials SMTP corrects
- [ ] Authentification à 2 facteurs activée (Gmail)
- [ ] Mot de passe d'application utilisé
- [ ] Timeouts augmentés
- [ ] Retry activé
- [ ] Configuration TLS correcte
- [ ] Test de connexion réussi
- [ ] Workflow de fallback configuré

### 🆘 En Cas d'Échec Total

1. **Utilisez SendGrid** : Plus fiable que Gmail
2. **Configurez Mailgun** : Alternative professionnelle
3. **Implémentez un webhook** : Envoi asynchrone
4. **Utilisez un service cloud** : AWS SES, Azure SendGrid

### 📞 Support

Si le problème persiste :
1. Vérifiez les logs n8n
2. Testez avec `test-smtp-advanced.js`
3. Essayez une configuration SMTP différente
4. Contactez le support de votre fournisseur SMTP
