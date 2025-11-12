# Prompt pour générateur IA - Analyse d'emails par expéditeur

## Description du workflow

Crée un workflow n8n qui :

1. **Déclenchement** : Utilise un webhook trigger (comme les autres workflows de l'application) pour être déclenché depuis l'application
   
2. **Lecture des emails** : 
   - Lit les emails depuis la boîte mail IMAP (INBOX)
   - Utilise `n8n-nodes-base.emailReadImap` (PAS `n8n-nodes-imap.imap`)
   - Credentials: `USER_IMAP_CREDENTIAL_ID` et `USER_IMAP_CREDENTIAL_NAME`

3. **Agrégation des emails** :
   - Ajoute un nœud Aggregate (`n8n-nodes-base.aggregate`) pour regrouper tous les emails
   - Paramètres: `aggregate: "aggregateAllItemData"`, `destinationFieldName: "data"`
   - Ce nœud est OBLIGATOIRE car IMAP retourne plusieurs items (un par email)

4. **Agent IA avec mémoire** :
   - Agent IA (`@n8n/n8n-nodes-langchain.agent`) qui analyse les emails
   - Prompt: "Analyse ces emails et extrait les informations suivantes pour chaque email :
     - Expéditeur (email et nom si disponible)
     - Sujet
     - Date de réception
     - Catégorie (Client, Facture, Support, Publicité, Spam, Personnel, Urgent)
     - Contenu important
     
     Voici les emails : {{ $json.data.toJsonString() }}"
   - **OBLIGATOIRE** : Inclure les 4 nœuds suivants :
     - OpenRouter Chat Model (`@n8n/n8n-nodes-langchain.lmChatOpenRouter`) avec modèle `qwen/qwen2.5-72b-instruct` et credentials `ADMIN_OPENROUTER_CREDENTIAL_ID`
     - Calculator Tool (`@n8n/n8n-nodes-langchain.toolCalculator`)
     - Buffer Window Memory (`@n8n/n8n-nodes-langchain.memoryBufferWindow`) avec `contextWindowLength: 10`
   - Connecter ces 3 nœuds à l'Agent IA via `ai_languageModel`, `ai_tool`, et `ai_memory`

5. **Traitement des résultats** :
   - Utilise un nœud Code/Function (`n8n-nodes-base.function`) pour :
     - Extraire les expéditeurs uniques de la réponse de l'IA
     - Créer une structure de données avec les emails groupés par expéditeur
     - Préparer les noms de dossiers (format: "Expéditeur - email@domain.com" ou juste "email@domain.com" si pas de nom)

6. **Création des dossiers** :
   - Pour chaque expéditeur unique, crée un dossier dans IMAP
   - Utilise le nœud IMAP (`n8n-nodes-imap.imap`) avec l'opération appropriée pour créer des dossiers
   - Nom du dossier: utilise l'email de l'expéditeur ou "Expéditeur - email" si le nom est disponible
   - Credentials: `USER_IMAP_CREDENTIAL_ID` et `USER_IMAP_CREDENTIAL_NAME`

7. **Déplacement des emails** :
   - Pour chaque email, déplace-le dans le dossier correspondant à son expéditeur
   - Utilise l'opération IMAP appropriée pour déplacer les emails

8. **Résumé par email** (optionnel) :
   - Envoie un email de résumé avec la liste des emails traités et organisés
   - Utilise `n8n-nodes-base.emailSend` avec `toEmail: "{{USER_EMAIL}}"` (PAS d'expressions dynamiques)
   - Credentials: `USER_SMTP_CREDENTIAL_ID` et `USER_SMTP_CREDENTIAL_NAME`

## Structure des connexions

```
Webhook Trigger -> IMAP Email (Read) -> Aggregate Emails -> AI Agent -> Code/Function (Group by sender) -> Loop (For each sender) -> IMAP (Create folder) -> IMAP (Move emails) -> Send Email (Summary)
```

## Règles critiques

1. **IMAP** : TOUJOURS utiliser `n8n-nodes-base.emailReadImap` (PAS `n8n-nodes-imap.imap`) pour la lecture
2. **Aggregate** : OBLIGATOIRE entre IMAP Email et AI Agent
3. **AI Agent prompt** : Utiliser `{{ $json.data.toJsonString() }}` (PAS `{{ $json.toJsonString() }}`)
4. **Connexions** : Utiliser les NOMS des nœuds (pas les IDs) dans les connexions
5. **SMTP toEmail** : Utiliser `{{USER_EMAIL}}` ou une adresse hardcodée (JAMAIS d'expressions dynamiques)
6. **Settings** : Toujours inclure `"settings": {}` dans le workflow
7. **Active** : Toujours définir `"active": false`
8. **VersionId** : Toujours inclure `"versionId": "1"`

## Format de réponse de l'IA

Le prompt de l'Agent IA doit demander une réponse structurée en JSON pour faciliter le traitement :

```json
{
  "emails": [
    {
      "from": "expediteur@example.com",
      "fromName": "Nom Expéditeur",
      "subject": "Sujet de l'email",
      "date": "2025-01-01T10:00:00Z",
      "category": "Client",
      "important": true,
      "content": "Extrait du contenu important"
    }
  ]
}
```

## Notes importantes

- Le workflow doit être déclenchable depuis l'application via webhook
- Les dossiers doivent être créés avec des noms propres (sans caractères spéciaux problématiques)
- Si un dossier existe déjà, ne pas créer de doublon
- Gérer les cas où plusieurs emails ont le même expéditeur

