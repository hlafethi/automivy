# Workflow CV Screening - Modifications apportées

## Résumé des changements

Ce workflow a été adapté pour AUTOMIVY avec les modifications suivantes :

### 1. Remplacement des IA par OpenRouter

#### Extraction de texte (OCR)
- **Avant** : Nœud `n8n-nodes-base.mistralAi` (Mistral OCR)
- **Après** : Nœud `n8n-nodes-base.httpRequest` appelant OpenRouter avec modèle vision
  - Modèle recommandé : `google/gemini-2.0-flash-exp:free`
  - Alternatives : `openai/gpt-4o`, `anthropic/claude-3.5-sonnet`
  - Credentials : `ADMIN_OPENROUTER_CREDENTIAL_ID` (injecté automatiquement)

#### Analyse et qualification
- **Avant** : Nœud `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` (Gemini 2.5 Flash Lite)
- **Après** : Nœud `n8n-nodes-base.httpRequest` appelant OpenRouter
  - Modèle : `qwen/qwen2.5-72b-instruct` (recommandé par AUTOMIVY)
  - Credentials : `ADMIN_OPENROUTER_CREDENTIAL_ID` (injecté automatiquement)
  - Format de réponse : JSON structuré avec `qualificationRate` et `explanation`

### 2. Gestion du formulaire depuis AUTOMIVY

#### Remplacement du Form Trigger n8n
- **Avant** : Nœud `n8n-nodes-base.formTrigger` (formulaire n8n natif)
- **Après** : Nœud `n8n-nodes-base.webhook` (webhook POST)
  - Path : `cv-screening`
  - Webhook ID : `cv-screening-webhook-automivy`
  - **Format des données attendues depuis AUTOMIVY** :
    ```json
    {
      "fullName": "Jane Doe",
      "email": "jane.doe@example.com",
      "cvUrl": "https://...", // URL du CV PDF stocké
      "storageType": "google_sheets", // ou "airtable", "notion", "postgresql"
      "jobRequirements": "Senior Frontend Developer position with 5+ years experience..."
    }
    ```

### 3. Alternatives à Google Sheets

Le workflow supporte maintenant **4 options de stockage** :

1. **Google Sheets** (par défaut)
   - Nœuds : `Log Candidate (Google Sheets)` et `Add CV Analysis (Google Sheets)`
   - Credentials : `USER_GOOGLE_CREDENTIAL_ID`

2. **Airtable**
   - Nœuds : `Log Candidate (Airtable)` et `Add CV Analysis (Airtable)`
   - Credentials : `USER_AIRTABLE_CREDENTIAL_ID`

3. **Notion**
   - Nœuds : `Log Candidate (Notion)` et `Add CV Analysis (Notion)`
   - Credentials : `USER_NOTION_CREDENTIAL_ID`

4. **PostgreSQL**
   - Nœuds : `Log Candidate (PostgreSQL)` et `Add CV Analysis (PostgreSQL)`
   - Credentials : `USER_POSTGRES_CREDENTIAL_ID`
   - **Table requise** :
     ```sql
     CREATE TABLE cv_screening_results (
       id SERIAL PRIMARY KEY,
       email VARCHAR(255) UNIQUE NOT NULL,
       full_name VARCHAR(255),
       qualification_rate DECIMAL(3,2),
       qualification_description TEXT,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP
     );
     ```

#### Sélection du stockage
- Utilisation de nœuds `Switch` pour router vers le bon stockage
- Le type est déterminé par le champ `storageType` dans le webhook
- Valeurs possibles : `google_sheets`, `airtable`, `notion`, `postgresql`

## Structure du workflow

```
1. Webhook Trigger (AUTOMIVY)
   ↓
2. Extract CV Text (OpenRouter) - Extraction OCR
   ↓
3. Parse Extracted Text
   ↓
4. AI Qualification (OpenRouter) - Analyse et scoring
   ↓
5. Parse Qualification Result
   ↓
6. Switch Storage Type (Update)
   ├─→ Google Sheets
   ├─→ Airtable
   ├─→ Notion
   └─→ PostgreSQL
   ↓
7. Webhook Response
```

En parallèle :
```
1. Webhook Trigger (AUTOMIVY)
   ↓
2. Switch Storage Type
   ├─→ Log Candidate (Google Sheets)
   ├─→ Log Candidate (Airtable)
   ├─→ Log Candidate (Notion)
   └─→ Log Candidate (PostgreSQL)
```

## Points d'attention

### Credentials OpenRouter
- Les credentials OpenRouter sont **admin-level** et injectés automatiquement
- Placeholder utilisé : `ADMIN_OPENROUTER_CREDENTIAL_ID`
- Le système AUTOMIVY remplace automatiquement ce placeholder lors du déploiement

### Credentials utilisateurs
- Tous les credentials de stockage sont **user-level**
- Placeholders utilisés :
  - `USER_GOOGLE_CREDENTIAL_ID`
  - `USER_AIRTABLE_CREDENTIAL_ID`
  - `USER_NOTION_CREDENTIAL_ID`
  - `USER_POSTGRES_CREDENTIAL_ID`
- Le système AUTOMIVY demande ces credentials à l'utilisateur lors de la configuration

### Format du CV
- Le CV doit être accessible via URL (`cvUrl`)
- Formats supportés : PDF (recommandé)
- L'URL peut être une URL publique ou une URL signée temporaire

### Modèles OpenRouter
- **OCR** : `google/gemini-2.0-flash-exp:free` (gratuit, bonne qualité)
- **Analyse** : `qwen/qwen2.5-72b-instruct` (meilleur rapport performance/prix)
- Les modèles peuvent être modifiés dans les paramètres des nœuds HTTP Request

## Intégration avec AUTOMIVY

### Côté Frontend
1. Créer un composant `CVScreeningForm` dans AUTOMIVY
2. Formulaire avec : Nom, Email, Upload CV (PDF)
3. Upload du PDF vers le backend (stockage temporaire ou S3)
4. Appel au workflow n8n via webhook avec les données

### Côté Backend
1. Endpoint POST `/api/cv-screening/submit`
2. Validation et stockage du PDF
3. Appel au workflow n8n via webhook ou API n8n
4. Retour de la réponse du workflow

### Exemple d'appel webhook
```javascript
const response = await fetch('https://n8n.automivy.com/webhook/cv-screening', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    cvUrl: 'https://storage.automivy.com/cvs/jane-doe-cv.pdf',
    storageType: 'google_sheets', // ou 'airtable', 'notion', 'postgresql'
    jobRequirements: 'Senior Frontend Developer with 5+ years experience...'
  })
});
```

## Notes techniques

- Les nœuds HTTP Request pour OpenRouter utilisent `httpHeaderAuth` credential type
- Le header `Authorization: Bearer <API_KEY>` sera injecté automatiquement
- Les modèles peuvent être modifiés dans les paramètres `jsonBody` des nœuds HTTP Request
- Le workflow est conçu pour être robuste : enregistrement immédiat du candidat même si l'analyse échoue

