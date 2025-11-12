const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const fetch = require('node-fetch');
const config = require('../config');

const router = express.Router();

// Tous les endpoints nécessitent une authentification sauf le callback OAuth
router.use((req, res, next) => {
  // Le callback OAuth peut être appelé sans token (mais avec un state sécurisé)
  if (req.path === '/callback' && req.method === 'GET') {
    return next();
  }
  authenticateToken(req, res, next);
});

// Initier le flux OAuth Gmail
router.get('/initiate/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.id;
    
    if (provider !== 'gmail') {
      return res.status(400).json({ error: 'Provider non supporté' });
    }
    
    // Générer un state sécurisé
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Stocker le state dans la session (ou base de données temporaire)
    // Pour simplifier, on utilise le state comme token
    try {
      await db.query(
        'INSERT INTO oauth_states (state, user_id, provider, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (state) DO UPDATE SET expires_at = $4',
        [state, userId, provider, new Date(Date.now() + 600000)] // 10 minutes
      );
      console.log('✅ [OAuth] State stocké dans la base de données:', state.substring(0, 20) + '...');
    } catch (dbError) {
      console.error('❌ [OAuth] Erreur lors de l\'insertion du state:', dbError);
      // Si la table n'existe pas, la créer automatiquement
      if (dbError.message && dbError.message.includes('does not exist')) {
        console.log('🔧 [OAuth] Table oauth_states introuvable, création en cours...');
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS oauth_states (
              state text PRIMARY KEY,
              user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
              provider text NOT NULL,
              expires_at timestamptz NOT NULL,
              created_at timestamptz DEFAULT now()
            )
          `);
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id)
          `);
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at)
          `);
          console.log('✅ [OAuth] Table oauth_states créée avec succès');
          // Réessayer l'insertion
          await db.query(
            'INSERT INTO oauth_states (state, user_id, provider, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (state) DO UPDATE SET expires_at = $4',
            [state, userId, provider, new Date(Date.now() + 600000)]
          );
        } catch (createError) {
          console.error('❌ [OAuth] Erreur lors de la création de la table:', createError);
          throw createError;
        }
      } else {
        throw dbError;
      }
    }
    
    // Récupérer les credentials OAuth depuis la config (à configurer dans .env)
    const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
    const redirectUri = `${config.app.frontendUrl}/oauth/callback`;
    
    console.log('🔧 [OAuth] URL de redirection utilisée:', redirectUri);
    console.log('🔧 [OAuth] Frontend URL configurée:', config.app.frontendUrl);
    
    if (!clientId || clientId === 'votre-client-id-google.apps.googleusercontent.com') {
      console.error('❌ [OAuth] GOOGLE_CLIENT_ID non configuré dans backend/.env');
      return res.status(500).json({ 
        error: 'Google OAuth non configuré',
        message: 'L\'administrateur doit configurer GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans backend/.env. Consultez GOOGLE_OAUTH_SETUP.md pour les instructions.'
      });
    }
    
    // Scopes Gmail nécessaires + userinfo pour récupérer l'email
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');
    
    // Construire l'URL d'autorisation Google OAuth
    // Note: device_id et device_name ne sont PAS utilisés pour les applications Web
    // Ils sont uniquement pour les applications natives (iOS/Android)
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`;
    
    res.json({ authUrl, state });
  } catch (error) {
    console.error('❌ [OAuth] Erreur lors de l\'initiation:', error);
    console.error('❌ [OAuth] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de l\'initiation OAuth',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Callback OAuth (appelé par le frontend après redirection de Google)
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('🔧 [OAuth] Callback reçu:', { code: code ? 'présent' : 'absent', state: state ? 'présent' : 'absent', error });
    
    if (error) {
      console.error('❌ [OAuth] Erreur de Google:', error);
      return res.json({ 
        success: false, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=${encodeURIComponent(error)}` 
      });
    }
    
    if (!code || !state) {
      console.error('❌ [OAuth] Paramètres manquants:', { code: !!code, state: !!state });
      return res.json({ 
        success: false, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=missing_params` 
      });
    }
    
    // Vérifier le state
    const stateResult = await db.query(
      'SELECT * FROM oauth_states WHERE state = $1 AND expires_at > NOW()',
      [state]
    );
    
    if (stateResult.rows.length === 0) {
      console.error('❌ [OAuth] State invalide ou expiré:', state.substring(0, 20) + '...');
      return res.json({ 
        success: false, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=invalid_state` 
      });
    }
    
    const stateData = stateResult.rows[0];
    const userId = stateData.user_id;
    const provider = stateData.provider;
    
    console.log('✅ [OAuth] State valide pour user:', userId);
    
    // Échanger le code contre un token
    const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
    const redirectUri = `${config.app.frontendUrl}/oauth/callback`;
    
    if (!clientId || !clientSecret) {
      console.error('❌ [OAuth] Credentials Google manquants');
      return res.json({ 
        success: false, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=config_missing` 
      });
    }
    
    console.log('🔄 [OAuth] Échange du code contre un token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ [OAuth] Erreur échange token:', errorText);
      return res.json({ 
        success: false, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=token_exchange_failed` 
      });
    }
    
    const tokens = await tokenResponse.json();
    console.log('✅ [OAuth] Token obtenu');
    
    // Récupérer les infos utilisateur
    console.log('🔄 [OAuth] Récupération des infos utilisateur...');
    console.log('🔧 [OAuth] Token d\'accès présent:', !!tokens.access_token);
    console.log('🔧 [OAuth] Token type:', tokens.token_type || 'Bearer');
    
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `${tokens.token_type || 'Bearer'} ${tokens.access_token}`,
        },
      });
      
      console.log('🔧 [OAuth] Status userinfo:', userInfoResponse.status, userInfoResponse.statusText);
      
      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('❌ [OAuth] Erreur récupération userinfo:', errorText);
        console.error('❌ [OAuth] Status:', userInfoResponse.status);
        console.error('❌ [OAuth] Headers:', Object.fromEntries(userInfoResponse.headers.entries()));
        return res.json({ 
          success: false, 
          redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=userinfo_failed` 
        });
      }
      
      const userInfo = await userInfoResponse.json();
      console.log('✅ [OAuth] UserInfo récupéré:', { email: userInfo.email, id: userInfo.id });
      
      if (!userInfo.email) {
        console.error('❌ [OAuth] Email manquant dans userInfo:', userInfo);
        return res.json({ 
          success: false, 
          redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=email_missing` 
        });
      }
      
      const email = userInfo.email;
      console.log('✅ [OAuth] Email récupéré:', email);
      
      // Créer le credential dans n8n
      console.log('🔄 [OAuth] Création du credential dans n8n...');
      const n8nCredential = await createGmailCredentialInN8n(tokens, email, userId);
      console.log('✅ [OAuth] Credential n8n créé:', n8nCredential.id);
      
      // Stocker le credential OAuth dans notre base de données
      await db.createOAuthCredential(
        userId,
        provider,
        JSON.stringify(tokens), // Stocker les tokens (à chiffrer en production)
        n8nCredential.id,
        email,
        tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
      );
      console.log('✅ [OAuth] Credential stocké en base de données');
      
      // Supprimer le state utilisé
      await db.query('DELETE FROM oauth_states WHERE state = $1', [state]);
      
      // Retourner l'URL de redirection au lieu de rediriger directement
      const redirectUrl = `${config.app.frontendUrl}/oauth/callback?oauth_success=gmail&email=${encodeURIComponent(email)}`;
      console.log('✅ [OAuth] Succès, redirection vers:', redirectUrl);
      return res.json({ 
        success: true, 
        redirectUrl 
      });
    } catch (userInfoError) {
      console.error('❌ [OAuth] Exception lors de la récupération userinfo:', userInfoError);
      console.error('❌ [OAuth] Stack:', userInfoError.stack);
      return res.json({ 
        success: false, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=userinfo_failed` 
      });
    }
  } catch (error) {
    console.error('❌ [OAuth] Erreur callback:', error);
    console.error('❌ [OAuth] Stack:', error.stack);
    return res.json({ 
      success: false, 
      redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=server_error` 
    });
  }
});

// Créer un credential Gmail dans n8n avec injection automatique des tokens OAuth
async function createGmailCredentialInN8n(tokens, email, userId) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  // Pour Gmail OAuth2, n8n nécessite clientId et clientSecret
  const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  // ⚠️ CRITIQUE: Injecter les tokens OAuth DIRECTEMENT lors de la création
  // n8n accepte les tokens dans le data lors de la création pour les credentials OAuth2
  console.log('🔄 [OAuth] Création credential avec tokens OAuth injectés directement...');
  console.log('🔧 [OAuth] Tokens disponibles:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in
  });
  
  // Structure pour la création : n8n n'accepte QUE oauthTokenData, pas les propriétés directes
  // Les propriétés directes (accessToken, refreshToken) seront ajoutées via PUT après création
  const credentialData = {
    name: `Gmail - ${email} - ${userId.substring(0, 8)}`,
    type: 'gmailOAuth2',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      // ⚠️ CRITIQUE: n8n n'accepte QUE oauthTokenData lors de la création
      // Les propriétés directes (accessToken, refreshToken) sont rejetées par n8n
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
  console.log('🔧 [OAuth] Création credential n8n avec tokens OAuth injectés:');
  console.log('  - clientId:', clientId ? 'présent' : 'manquant');
  console.log('  - clientSecret:', clientSecret ? 'présent' : 'manquant');
  console.log('  - accessToken:', tokens.access_token ? 'présent' : 'manquant');
  console.log('  - refreshToken:', tokens.refresh_token ? 'présent' : 'manquant');
  
  const createResponse = await fetch(`${n8nUrl}/api/v1/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': n8nApiKey,
    },
    body: JSON.stringify(credentialData),
  });
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('❌ [OAuth] Erreur détaillée n8n:', errorText);
    console.error('❌ [OAuth] Payload envoyé:', JSON.stringify(credentialData, null, 2));
    throw new Error(`Erreur création credential n8n: ${createResponse.status} - ${errorText}`);
  }
  
  const credential = await createResponse.json();
  console.log('✅ [OAuth] Credential n8n créé avec succès:', credential.id);
  console.log('✅ [OAuth] Credential Name:', credential.name);
  
  // Vérifier que les tokens sont bien présents dans le credential créé
  if (credential.data?.oauthTokenData?.access_token) {
    console.log('✅ [OAuth] Access token présent dans oauthTokenData après création');
    console.log('✅ [OAuth] Credential créé avec tokens OAuth et prêt à être utilisé');
    return credential;
  } else {
    console.warn('⚠️ [OAuth] Aucun access token trouvé dans oauthTokenData après création');
    console.warn('⚠️ [OAuth] Tentative de mise à jour avec PUT pour injecter les tokens...');
    
    // Si les tokens ne sont pas présents, essayer de les injecter via PUT
    try {
      // Attendre un peu pour que n8n finalise la création
      console.log('⏳ [OAuth] Attente de 1 seconde pour que n8n finalise la création...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Récupérer le credential pour préserver toutes les propriétés
      console.log(`🔍 [OAuth] Récupération du credential ${credential.id} depuis n8n...`);
      const getResponse = await fetch(`${n8nUrl}/api/v1/credentials/${credential.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey,
        },
      });
      
      console.log(`🔍 [OAuth] Réponse GET credential: ${getResponse.status} ${getResponse.statusText}`);
      
      if (getResponse.ok) {
        const existingCredential = await getResponse.json();
        console.log('✅ [OAuth] Credential récupéré, injection des tokens via PUT...');
        
        // Construire les données mises à jour avec oauthTokenData
        const updatedData = {
          ...existingCredential.data,
          oauthTokenData: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_type: tokens.token_type || 'Bearer',
            expires_in: tokens.expires_in,
            scope: tokens.scope || 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
            expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
          }
        };
        
        const updatePayload = {
          name: existingCredential.name,
          type: existingCredential.type,
          data: updatedData
        };
        
        console.log('🔧 [OAuth] Payload PUT:', JSON.stringify({
          name: updatePayload.name,
          type: updatePayload.type,
          data: {
            ...updatePayload.data,
            oauthTokenData: {
              ...updatePayload.data.oauthTokenData,
              access_token: updatePayload.data.oauthTokenData?.access_token ? '***présent***' : 'manquant',
              refresh_token: updatePayload.data.oauthTokenData?.refresh_token ? '***présent***' : 'manquant'
            }
          }
        }, null, 2));
        
        const updateResponse = await fetch(`${n8nUrl}/api/v1/credentials/${credential.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': n8nApiKey,
          },
          body: JSON.stringify(updatePayload),
        });
        
        console.log(`🔍 [OAuth] Réponse PUT credential: ${updateResponse.status} ${updateResponse.statusText}`);
        
        if (updateResponse.ok) {
          const updatedCredential = await updateResponse.json();
          console.log('✅ [OAuth] Tokens OAuth injectés via PUT après création');
          
          // Vérifier que les tokens sont bien présents
          if (updatedCredential.data?.oauthTokenData?.access_token) {
            console.log('✅ [OAuth] Access token confirmé dans oauthTokenData après PUT');
          } else {
            console.warn('⚠️ [OAuth] Access token non trouvé dans oauthTokenData après PUT');
          }
          
          return updatedCredential;
        } else {
          const errorText = await updateResponse.text();
          console.error('⚠️ [OAuth] Échec injection tokens via PUT:', errorText);
          console.error('⚠️ [OAuth] Status:', updateResponse.status);
          console.error('⚠️ [OAuth] Le credential est créé mais nécessitera une connexion manuelle');
        }
      } else {
        const errorText = await getResponse.text();
        console.warn('⚠️ [OAuth] Impossible de récupérer le credential pour mise à jour:', getResponse.status, errorText);
      }
    } catch (updateError) {
      console.error('⚠️ [OAuth] Erreur lors de la mise à jour:', updateError.message);
      console.error('⚠️ [OAuth] Stack:', updateError.stack);
    }
  }
  
  console.log('✅ [OAuth] Credential créé (tokens peuvent nécessiter une connexion manuelle)');
  return credential;
}

// Récupérer toutes les credentials OAuth de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const { provider } = req.query;
    const credentials = await db.getOAuthCredentials(req.user.id, provider);
    res.json(credentials);
  } catch (error) {
    console.error('Get OAuth credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Créer une nouvelle credential OAuth (pour compatibilité)
router.post('/', async (req, res) => {
  try {
    const { provider, encryptedData, n8nCredentialId, email, expiresAt } = req.body;

    if (!provider || !encryptedData) {
      return res.status(400).json({ error: 'Provider and encrypted data are required' });
    }

    const credential = await db.createOAuthCredential(
      req.user.id,
      provider,
      encryptedData,
      n8nCredentialId,
      email,
      expiresAt
    );

    res.status(201).json(credential);
  } catch (error) {
    console.error('Create OAuth credential error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supprimer une credential OAuth
router.delete('/:id', async (req, res) => {
  try {
    const credential = await db.deleteOAuthCredential(req.params.id, req.user.id);
    if (!credential) {
      return res.status(404).json({ error: 'OAuth credential not found' });
    }

    res.json({ message: 'OAuth credential deleted successfully' });
  } catch (error) {
    console.error('Delete OAuth credential error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
