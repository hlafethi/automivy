# Système d'Injecteurs Spécifiques par Template

## Architecture

Ce système permet d'avoir des injecteurs de credentials spécifiques pour chaque template, tout en gardant un injecteur générique comme fallback.

## Structure

```
backend/services/injectors/
├── index.js                    # Système de routing vers les injecteurs spécifiques
├── gmailTriInjector.js         # Injecteur pour "GMAIL Tri Automatique Boite Email"
├── imapTriInjector.js          # Injecteur pour "IMAP Tri Automatique BAL"
├── microsoftTriInjector.js     # Injecteur pour "Microsoft Tri Automatique BAL"
├── resumeEmailInjector.js      # Injecteur pour "Template fonctionnel résume email"
├── pdfAnalysisInjector.js      # Injecteur pour "PDF Analysis Complete"
├── cvAnalysisInjector.js       # Injecteur pour "CV Analysis and Candidate Evaluation"
├── videoProductionInjector.js  # Injecteur pour "Production Vidéo IA"
├── nextcloudInjector.js        # Injecteur pour templates Nextcloud
├── newsletterInjector.js       # Injecteur pour newsletters
└── README.md                   # Cette documentation
```

## Fonctionnement

### Routing Automatique

Le fichier `index.js` route automatiquement vers l'injecteur approprié selon :
- **Template ID** (priorité)
- **Template Name** (fallback)

Si aucun injecteur spécifique n'est trouvé, l'injecteur générique (`credentialInjector.js`) est utilisé.

### Mapping des Templates

Les templates sont mappés dans `index.js` :

```javascript
const TEMPLATE_INJECTORS = {
  // GMAIL Tri Automatique Boite Email
  '5114f297-e56e-4fec-be2b-1afbb5ea8619': require('./gmailTriInjector'),
  'GMAIL Tri Automatique Boite Email': require('./gmailTriInjector'),
  
  // Template fonctionnel résume email
  '6ff57a3c-c9a0-40ec-88c0-7e25ef031cb0': require('./resumeEmailInjector'),
  'Template fonctionnel résume email': require('./resumeEmailInjector'),
  
  // PDF Analysis Complete
  '132d04c8-e36a-4dbd-abac-21fa8280650e': require('./pdfAnalysisInjector'),
  'PDF Analysis Complete': require('./pdfAnalysisInjector'),
  
  // IMAP Tri Automatique BAL
  'c1bd6bd6-8a2b-4beb-89ee-1cd734a907a2': require('./imapTriInjector'),
  'IMAP Tri Automatique BAL': require('./imapTriInjector'),
  
  // CV Analysis and Candidate Evaluation
  'aa3ba641-9bfb-429c-8b42-506d4f33ff40': require('./cvAnalysisInjector'),
  'CV Analysis and Candidate Evaluation': require('./cvAnalysisInjector'),
  'cv-analysis-evaluation': require('./cvAnalysisInjector'), // Alias pour le webhook path
};
```

## Injecteurs Spécifiques

### 1. Gmail Tri Injector (`gmailTriInjector.js`)

**Template** : "GMAIL Tri Automatique Boite Email"

**Spécificités** :
- **Premier nœud IMAP** : Utilise le credential IMAP utilisateur
- **Autres nœuds Gmail** : Utilisent le credential Gmail OAuth2 utilisateur (récupéré depuis la BDD)
- **Récupération OAuth2** : Le credential Gmail OAuth2 est récupéré depuis `oauth_credentials` table

**Credentials requis** :
- IMAP (email, imapPassword, imapServer, imapPort)
- Gmail OAuth2 (doit être connecté via OAuth avant le déploiement)

### 2. Resume Email Injector (`resumeEmailInjector.js`)

**Template** : "Template fonctionnel résume email"

**Spécificités** :
- **Nœuds IMAP** : Utilisent le credential IMAP utilisateur
- **Nœuds SMTP** : Utilisent le credential SMTP utilisateur (pour l'envoi du résumé)
- **OpenRouter** : Utilise le credential OpenRouter admin

**Credentials requis** :
- IMAP (email, imapPassword, imapServer, imapPort)
- SMTP (dérivé automatiquement de IMAP)

### 3. PDF Analysis Injector (`pdfAnalysisInjector.js`)

**Template** : "PDF Analysis Complete"

**Spécificités** :
- **OpenRouter** : Utilise le credential OpenRouter admin
- **SMTP** : Utilise le credential SMTP admin (pour l'envoi du rapport)
- **Pas de credentials utilisateur** : Ce template utilise uniquement des credentials admin

**Credentials requis** :
- Aucun credential utilisateur requis (tout est géré par les credentials admin)

### 4. IMAP Tri Injector (`imapTriInjector.js`)

**Template** : "IMAP Tri Automatique BAL"

**Spécificités** :
- **Nœuds IMAP** : Utilisent le credential IMAP utilisateur (pour la lecture, création de dossiers, déplacement d'emails)
- **SMTP** : Utilise le credential SMTP admin (pour l'envoi du rapport)
- **Récupération IMAP** : Le credential IMAP est créé automatiquement depuis les données utilisateur

**Credentials requis** :
- IMAP (email, imapPassword, imapServer, imapPort)

### 5. CV Analysis Injector (`cvAnalysisInjector.js`)

**Template** : "CV Analysis and Candidate Evaluation"

**Spécificités** :
- **OpenRouter** : Utilise le credential OpenRouter admin (pour l'extraction et l'évaluation des CVs)
- **SMTP** : Utilise le credential SMTP admin (pour l'envoi du rapport comparatif)
- **Pas de credentials utilisateur** : Ce template utilise uniquement des credentials admin
- **Webhook unique** : Génère un webhook unique par utilisateur (`workflow-{templateId}-{userId}`)

**Credentials requis** :
- Aucun credential utilisateur requis (tout est géré par les credentials admin)

## Ajouter un Nouvel Injecteur

1. **Créer le fichier injecteur** dans `backend/services/injectors/`
   ```javascript
   // backend/services/injectors/monTemplateInjector.js
   async function injectUserCredentials(workflow, userCredentials, userId, templateId, templateName) {
     // Logique spécifique du template
     return {
       workflow: injectedWorkflow,
       webhookPath: uniqueWebhookPath
     };
   }
   
   module.exports = { injectUserCredentials };
   ```

2. **Ajouter le mapping** dans `index.js`
   ```javascript
   const TEMPLATE_INJECTORS = {
     // ... mappings existants
     'nouveau-template-id': require('./monTemplateInjector'),
     'Nouveau Template Name': require('./monTemplateInjector'),
   };
   ```

3. **Tester le déploiement** du template

## Avantages

✅ **Isolation** : Chaque template a sa propre logique d'injection  
✅ **Maintenabilité** : Modifications d'un template n'affectent pas les autres  
✅ **Flexibilité** : Logique spécifique par template (ex: premier nœud IMAP, autres Gmail OAuth2)  
✅ **Fallback** : Injecteur générique pour les templates sans injecteur spécifique  
✅ **Extensibilité** : Facile d'ajouter de nouveaux injecteurs

## Notes Importantes

- Les injecteurs spécifiques peuvent utiliser les fonctions de l'injecteur générique (`createImapCredential`, `createSmtpCredential`, etc.)
- Les noms de credentials incluent le nom du template pour faciliter l'identification
- Les webhooks sont générés de manière unique par template et utilisateur
- Les Schedule Triggers sont configurés avec l'heure fournie par l'utilisateur

