# ✅ Conformité LinkedIn OAuth 2.0

Ce document confirme que l'implémentation est conforme aux exigences LinkedIn OAuth 2.0 pour l'automatisation de publication de posts.

## ✅ 1. OAuth 2.0 Flow (OBLIGATOIRE)

**Exigence LinkedIn** : Tu DOIS passer par LinkedIn OAuth 2.0. C'est la seule méthode autorisée.

**Implémentation** : ✅ **CONFORME**

- **Initiation** : `GET /api/oauth/initiate/linkedin`
  - Redirige l'utilisateur vers `https://www.linkedin.com/oauth/v2/authorization`
  - Utilise les credentials partagés (Client ID/Secret) configurés par l'admin
  
- **Callback** : `GET /api/oauth/callback?code=...&state=...`
  - Échange le code d'autorisation contre `access_token` + `refresh_token`
  - Stocke les tokens dans la BDD et crée le credential n8n

- **Stockage** : Les tokens sont stockés dans :
  - `oauth_credentials` (BDD) avec `provider='linkedin'`
  - Credential n8n de type `linkedInOAuth2Api`

**Fichiers** :
- `backend/routes/oauth.js` (lignes 156-230 : initiation, lignes 459-520 : callback)

---

## ✅ 2. Permissions (Scopes) Obligatoires

**Exigence LinkedIn** : Pour publier automatiquement, tu dois demander ces scopes :
- `openid`
- `profile`
- `email`
- `w_member_social` → **permet de publier au nom de l'utilisateur**

**Implémentation** : ✅ **CONFORME**

```javascript
scopes = [
  'openid',
  'profile',
  'email',
  'w_member_social' // Permission pour publier des posts
];
```

**Fichiers** :
- `backend/routes/oauth.js` (lignes 207-212)

**⚠️ Important** : Sans `w_member_social`, tu ne peux rien publier. Ce scope est présent dans notre implémentation.

---

## ✅ 3. Workflow Technique

**Exigence LinkedIn** : Le workflow doit suivre ces étapes :

1. ✅ Ton app ouvre : `https://www.linkedin.com/oauth/v2/authorization?...`
2. ✅ L'utilisateur accepte.
3. ✅ LinkedIn te renvoie un code.
4. ✅ Tu échanges le code contre un `access_token` + `refresh_token`.
5. ✅ Tu stockes le `refresh_token` pour pouvoir publier automatiquement plus tard.

**Implémentation** : ✅ **CONFORME**

### Étape 1-2 : Initiation OAuth
```javascript
// backend/routes/oauth.js:215-220
authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
  `response_type=code` +
  `&client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&state=${encodeURIComponent(state)}` +
  `&scope=${encodeURIComponent(scopesString)}`;
```

### Étape 3-4 : Échange du code
```javascript
// backend/routes/oauth.js:500-520
tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
tokenBody = new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  redirect_uri: normalizedRedirectUri,
  client_id: clientId,
  client_secret: clientSecret,
});
```

### Étape 5 : Stockage du refresh_token
```javascript
// backend/routes/oauth.js:1033-1040
await db.createOAuthCredential(
  userId,
  provider,
  JSON.stringify(tokens), // Contient access_token + refresh_token
  n8nCredential.id,
  email,
  tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
);
```

---

## ✅ 4. Publication Automatisée

**Exigence LinkedIn** : Pour publier automatiquement, utilise :
- **Endpoint** : `POST https://api.linkedin.com/v2/ugcPosts`
- **Headers** : `Authorization: Bearer {access_token}`
- **Body** : Payload UGC conforme à l'API LinkedIn

**Implémentation** : ✅ **CONFORME** (dans les workflows n8n)

Les workflows n8n déployés utilisent le credential `linkedInOAuth2Api` qui :
- Gère automatiquement le renouvellement des tokens via `refresh_token`
- Utilise l'API LinkedIn v2 pour publier les posts
- Respecte les limites de rate limiting de LinkedIn

**Workflow n8n** : `LinkedIn Post Generator - Principal`
- Utilise le node `LinkedIn` avec le credential OAuth2
- Publie via `POST /v2/ugcPosts` automatiquement

---

## ✅ 5. Renouvellement des Tokens (Refresh Token)

**Exigence LinkedIn** : Les `access_token` expirent. Tu dois utiliser le `refresh_token` pour obtenir de nouveaux tokens.

**Implémentation** : ✅ **CONFORME**

### Fonction de renouvellement
```javascript
// backend/routes/oauth.js:2051-2150
async function refreshLinkedInToken(refreshToken, userId)
```

Cette fonction :
1. Récupère les credentials LinkedIn (Client ID/Secret) depuis `admin_api_keys` ou `.env`
2. Appelle `POST https://www.linkedin.com/oauth/v2/accessToken` avec `grant_type=refresh_token`
3. Met à jour le credential n8n avec les nouveaux tokens
4. Met à jour la BDD avec les nouveaux tokens

### Route API
```javascript
// backend/routes/oauth.js:2152-2185
router.post('/refresh-linkedin-token', async (req, res) => { ... })
```

**Utilisation** :
- Le workflow `LinkedIn Token Monitor` peut appeler cette route pour renouveler les tokens avant expiration
- n8n gère aussi automatiquement le renouvellement via le credential `linkedInOAuth2Api`

---

## ⚠️ Points Importants

### ✅ Pas besoin de droits spéciaux
- Juste être validé pour l'API dans le portail développeur LinkedIn
- L'app doit être approuvée par LinkedIn (processus de review)

### ✅ LinkedIn bloque les apps qui essaient de contourner OAuth
- Notre implémentation utilise **uniquement** OAuth 2.0
- Pas de contournement, pas de méthodes non autorisées

### ✅ L'automatisation doit toujours passer par les tokens fournis par chaque utilisateur
- Chaque utilisateur se connecte via OAuth et obtient ses propres tokens
- Les tokens sont stockés individuellement par utilisateur
- Les workflows utilisent les tokens de l'utilisateur pour publier

**Note** : Les **Client ID/Secret** sont partagés (configurés par l'admin), mais chaque utilisateur a ses propres **tokens OAuth** (access_token, refresh_token).

---

## 📋 Checklist de Conformité

- [x] ✅ OAuth 2.0 Flow complet (initiation → callback → tokens)
- [x] ✅ Scopes obligatoires (`openid`, `profile`, `email`, `w_member_social`)
- [x] ✅ Stockage du `refresh_token` pour renouvellement automatique
- [x] ✅ Publication via `POST /v2/ugcPosts` (dans workflows n8n)
- [x] ✅ Fonction de renouvellement des tokens expirés
- [x] ✅ Isolation des tokens par utilisateur
- [x] ✅ Pas de contournement OAuth (méthode autorisée uniquement)

---

## 🔧 Configuration Requise

### Pour l'Administrateur

1. **Créer une app LinkedIn** sur https://www.linkedin.com/developers/apps
2. **Configurer les Redirect URIs** :
   - `http://localhost:5173/oauth/callback` (dev)
   - `https://votre-domaine.com/oauth/callback` (prod)
3. **Demander les permissions** :
   - `openid`
   - `profile`
   - `email`
   - `w_member_social` (pour publier)
4. **Configurer les credentials** dans la BDD ou `.env` :
   ```sql
   INSERT INTO admin_api_keys (service_name, api_key, description, is_active, created_by)
   VALUES ('linkedin_oauth', 'votre_client_id|votre_client_secret', 'LinkedIn OAuth Credentials', true, 'admin_user_id');
   ```
   Ou dans `.env` :
   ```env
   LINKEDIN_CLIENT_ID=votre_client_id
   LINKEDIN_CLIENT_SECRET=votre_client_secret
   ```

### Pour l'Utilisateur

1. Cliquer sur "Connecter LinkedIn" dans le formulaire de déploiement
2. Accepter les permissions sur LinkedIn
3. Les tokens sont automatiquement stockés et utilisés pour publier

---

## 📚 Références

- [LinkedIn OAuth 2.0 Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn UGC Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/ugc-post-api)
- [LinkedIn API Rate Limits](https://learn.microsoft.com/en-us/linkedin/shared/authentication/rate-limits)

---

**Dernière mise à jour** : 2025-01-07
**Statut** : ✅ **CONFORME** aux exigences LinkedIn OAuth 2.0

