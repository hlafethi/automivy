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
    
    // Support pour gmail, google_sheets, google_drive, google_docs, google (tous services), microsoft et linkedin
    if (provider !== 'gmail' && provider !== 'google_sheets' && provider !== 'google_drive' && provider !== 'google_docs' && provider !== 'google' && provider !== 'microsoft' && provider !== 'linkedin') {
      return res.status(400).json({ error: 'Provider non supporté' });
    }
    
    // Générer un state sécurisé
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // ⚠️ IMPORTANT: Vérifier et ajouter la colonne redirect_uri si elle n'existe pas
    try {
      await db.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'oauth_states' AND column_name = 'redirect_uri'
          ) THEN
            ALTER TABLE oauth_states ADD COLUMN redirect_uri text;
          END IF;
        END $$;
      `);
    } catch (migrationError) {
      // Si la table n'existe pas, on la créera plus bas
      if (!migrationError.message.includes('does not exist')) {
        console.log('🔧 [OAuth] Migration redirect_uri:', migrationError.message);
      }
    }
    
    // Stocker le state dans la session (ou base de données temporaire)
    // Pour simplifier, on utilise le state comme token
    const redirectUriForState = `${config.app.frontendUrl}/oauth/callback`.replace(/\/$/, '');
    
    try {
      await db.query(
        'INSERT INTO oauth_states (state, user_id, provider, redirect_uri, expires_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (state) DO UPDATE SET expires_at = $5, redirect_uri = $4',
        [state, userId, provider, redirectUriForState, new Date(Date.now() + 600000)] // 10 minutes
      );
      console.log('✅ [OAuth] State stocké dans la base de données:', state.substring(0, 20) + '...');
      console.log('✅ [OAuth] Redirect URI stocké:', redirectUriForState);
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
              redirect_uri text,
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
          const redirectUriForState = `${config.app.frontendUrl}/oauth/callback`.replace(/\/$/, '');
          await db.query(
            'INSERT INTO oauth_states (state, user_id, provider, redirect_uri, expires_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (state) DO UPDATE SET expires_at = $5, redirect_uri = $4',
            [state, userId, provider, redirectUriForState, new Date(Date.now() + 600000)]
          );
        } catch (createError) {
          console.error('❌ [OAuth] Erreur lors de la création de la table:', createError);
          throw createError;
        }
      } else if (dbError.message && dbError.message.includes('column "redirect_uri"')) {
        // La colonne n'existe pas, l'ajouter
        console.log('🔧 [OAuth] Colonne redirect_uri manquante, ajout en cours...');
        try {
          await db.query('ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS redirect_uri text');
          console.log('✅ [OAuth] Colonne redirect_uri ajoutée');
          // Réessayer l'insertion
          await db.query(
            'INSERT INTO oauth_states (state, user_id, provider, redirect_uri, expires_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (state) DO UPDATE SET expires_at = $5, redirect_uri = $4',
            [state, userId, provider, redirectUriForState, new Date(Date.now() + 600000)]
          );
          console.log('✅ [OAuth] State inséré après ajout de la colonne');
        } catch (alterError) {
          console.error('❌ [OAuth] Erreur lors de l\'ajout de la colonne:', alterError);
          throw alterError;
        }
      } else {
        throw dbError;
      }
    }
    
    // Récupérer les credentials OAuth depuis la config (à configurer dans .env)
    // ⚠️ CRITIQUE: Normaliser le redirect_uri (enlever trailing slash si présent)
    // Google exige que le redirect_uri soit EXACTEMENT le même lors de l'initiation et de l'échange
    const redirectUri = `${config.app.frontendUrl}/oauth/callback`.replace(/\/$/, '');
    
    console.log('🔧 [OAuth] URL de redirection utilisée:', redirectUri);
    console.log('🔧 [OAuth] Frontend URL configurée:', config.app.frontendUrl);
    console.log('🔧 [OAuth] Redirect URI normalisé (sans trailing slash):', redirectUri);
    
    let clientId, scopes, authUrl;
    
    if (provider === 'microsoft') {
      // Microsoft OAuth
      clientId = process.env.MICROSOFT_CLIENT_ID || config.microsoft?.clientId;
      
      if (!clientId || clientId === 'votre-client-id-microsoft') {
        console.error('❌ [OAuth] MICROSOFT_CLIENT_ID non configuré dans backend/.env');
        return res.status(500).json({ 
          error: 'Microsoft OAuth non configuré',
          message: 'L\'administrateur doit configurer MICROSOFT_CLIENT_ID et MICROSOFT_CLIENT_SECRET dans backend/.env. Consultez MICROSOFT_OAUTH_SETUP.md pour les instructions détaillées.'
        });
      }
      
      scopes = [
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/MailboxSettings.Read',
        'https://graph.microsoft.com/User.Read',
        'offline_access'
      ];
      const scopesString = scopes.join(' ');
      
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopesString)}` +
        `&response_mode=query` +
        `&state=${encodeURIComponent(state)}`;
    } else if (provider === 'linkedin') {
      // LinkedIn OAuth - Récupérer depuis admin_api_keys ou .env (partagé par tous les utilisateurs, comme Google)
      // L'admin configure les credentials LinkedIn une fois, tous les utilisateurs les utilisent
      try {
        const linkedinCreds = await db.query(
          'SELECT api_key, description FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
          ['linkedin_oauth']
        );
        
        if (linkedinCreds.rows.length > 0) {
          // Le api_key peut contenir "client_id|client_secret" ou juste le client_id
          const credData = linkedinCreds.rows[0].api_key;
          if (credData.includes('|')) {
            const [id, secret] = credData.split('|');
            clientId = id;
            req.linkedinClientSecret = secret; // Stocker temporairement pour le callback
          } else {
            clientId = credData;
            // Le secret peut être dans une autre entrée
            const secretCreds = await db.query(
              'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
              ['linkedin_oauth_secret']
            );
            if (secretCreds.rows.length > 0) {
              req.linkedinClientSecret = secretCreds.rows[0].api_key;
            }
          }
          console.log('✅ [OAuth] LinkedIn credentials récupérés depuis admin_api_keys');
        }
      } catch (dbError) {
        console.warn('⚠️ [OAuth] Erreur récupération LinkedIn credentials depuis BDD:', dbError.message);
      }
      
      // Fallback vers .env si pas trouvé en BDD
      if (!clientId) {
        clientId = process.env.LINKEDIN_CLIENT_ID || config.linkedin?.clientId;
      }
      if (!req.linkedinClientSecret) {
        req.linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET || config.linkedin?.clientSecret;
      }
      
      // Si toujours pas de credentials, retourner une erreur
      if (!clientId || clientId === 'votre-client-id-linkedin') {
        console.warn('⚠️ [OAuth] LINKEDIN_CLIENT_ID non configuré - l\'admin doit configurer les credentials LinkedIn');
        return res.status(500).json({ 
          error: 'LinkedIn OAuth non configuré',
          message: 'L\'administrateur doit configurer LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET dans la BDD (admin_api_keys avec service_name="linkedin_oauth") ou dans backend/.env. Les utilisateurs n\'ont pas besoin de créer leur propre app LinkedIn.'
        });
      }
      
      // Scopes LinkedIn pour publier des posts et gérer le profil
      scopes = [
        'openid',
        'profile',
        'email',
        'w_member_social' // Permission pour publier des posts
      ];
      const scopesString = scopes.join(' ');
      
      // ⚠️ CRITIQUE LinkedIn: Le redirect_uri doit être EXACTEMENT le même lors de l'initiation et de l'échange
      // Utiliser celui stocké dans le state (redirectUriForState) pour garantir la correspondance
      const linkedinInitRedirectUri = redirectUri;
      
      console.log('🔧 [OAuth] LinkedIn - URL d\'autorisation en cours de génération...');
      console.log('🔧 [OAuth] LinkedIn - Redirect URI utilisé pour initiation:', linkedinInitRedirectUri);
      console.log('🔧 [OAuth] LinkedIn - Redirect URI stocké dans state:', redirectUriForState);
      console.log('🔧 [OAuth] LinkedIn - Client ID:', clientId ? clientId.substring(0, 8) + '...' : 'MANQUANT');
      console.log('🔧 [OAuth] LinkedIn - Scopes:', scopesString);
      
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(linkedinInitRedirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopesString)}`;
      
      console.log('✅ [OAuth] URL d\'autorisation LinkedIn générée');
      console.log('🔧 [OAuth] LinkedIn - URL complète (sans state):', authUrl.substring(0, authUrl.indexOf('&state=')) + '&state=...');
    } else {
      // Google OAuth (gmail ou google_sheets)
      clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
      
      if (!clientId || clientId === 'votre-client-id-google.apps.googleusercontent.com') {
        console.error('❌ [OAuth] GOOGLE_CLIENT_ID non configuré dans backend/.env');
        return res.status(500).json({ 
          error: 'Google OAuth non configuré',
          message: 'L\'administrateur doit configurer GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans backend/.env. Consultez GOOGLE_OAUTH_SETUP.md pour les instructions.'
        });
      }
      
      // Scopes selon le provider
      if (provider === 'gmail') {
        scopes = [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ];
      } else if (provider === 'google_sheets') {
        scopes = [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ];
      } else if (provider === 'google_drive') {
        scopes = [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ];
      } else if (provider === 'google_docs') {
        scopes = [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ];
      } else if (provider === 'google') {
        // Provider "google" unique : combine TOUS les scopes Google en une seule connexion
        scopes = [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/adwords',
          'https://www.googleapis.com/auth/tasks',
          'https://www.googleapis.com/auth/presentations',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ];
        console.log('🔧 [OAuth] Provider "google" détecté - utilisation de tous les scopes Google (incluant Calendar, Ads, Tasks, Slides)');
      }
      const scopesString = scopes.join(' ');
      
      // Construire l'URL d'autorisation Google OAuth
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopesString)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(state)}`;
      
      // ⚠️ IMPORTANT: Logger le redirect_uri utilisé pour vérification
      console.log('🔧 [OAuth] Redirect URI utilisé lors de l\'initiation:', redirectUri);
      console.log('🔧 [OAuth] Redirect URI encodé:', encodeURIComponent(redirectUri));
      console.log('🔧 [OAuth] State généré:', state);
    }
    
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
    
    // ⚠️ PROTECTION: Vérifier si ce code a déjà été utilisé (évite invalid_grant)
    // Stocker les codes utilisés temporairement pour éviter les doubles appels
    const codeCacheKey = `oauth_code_${code.substring(0, 20)}`;
    
    // Vérifier le state et ajouter la colonne redirect_uri si elle n'existe pas
    try {
      // Vérifier si la colonne redirect_uri existe, sinon l'ajouter
      await db.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'oauth_states' AND column_name = 'redirect_uri'
          ) THEN
            ALTER TABLE oauth_states ADD COLUMN redirect_uri text;
          END IF;
        END $$;
      `).catch(() => {}); // Ignorer l'erreur si la colonne existe déjà
    } catch (migrationError) {
      // Ignorer les erreurs de migration
      console.log('🔧 [OAuth] Migration redirect_uri:', migrationError.message);
    }
    
    // Vérifier le state
    const stateResult = await db.query(
      'SELECT * FROM oauth_states WHERE state = $1 AND expires_at > NOW()',
      [state]
    );
    
    let userId, provider;
    
    if (stateResult.rows.length === 0) {
      // ⚠️ Le state peut avoir été supprimé si le callback a déjà été traité
      // Dans ce cas, vérifier si un credential existe déjà pour éviter les erreurs
      console.warn('⚠️ [OAuth] State invalide ou expiré (peut-être déjà utilisé):', state.substring(0, 20) + '...');
      
      // Essayer d'extraire le userId du state (format: userId_timestamp_random)
      const stateParts = state.split('_');
      if (stateParts.length >= 1) {
        const possibleUserId = stateParts[0];
        // Vérifier si c'est un UUID valide
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(possibleUserId)) {
          userId = possibleUserId;
          // Essayer de deviner le provider depuis les credentials existants
          const existingCreds = await db.query(
            'SELECT provider FROM oauth_credentials WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
          );
          if (existingCreds.rows.length > 0) {
            provider = existingCreds.rows[0].provider;
            console.log('⚠️ [OAuth] State déjà utilisé, mais credential existant trouvé pour user:', userId);
            // Retourner un succès pour éviter les erreurs au frontend
            return res.json({ 
              success: true, 
              redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_success=${provider}&email=already_connected` 
            });
          }
        }
      }
      
      console.error('❌ [OAuth] State invalide ou expiré et aucun credential trouvé:', state.substring(0, 20) + '...');
      return res.json({ 
        success: false, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=invalid_state` 
      });
    }
    
    const stateData = stateResult.rows[0];
    userId = stateData.user_id;
    provider = stateData.provider;
    const storedRedirectUri = stateData.redirect_uri;
    
    console.log('✅ [OAuth] State valide pour user:', userId);
    console.log('✅ [OAuth] Provider:', provider);
    console.log('🔧 [OAuth] Redirect URI stocké dans le state:', storedRedirectUri);
    
    // Échanger le code contre un token selon le provider
    const redirectUri = `${config.app.frontendUrl}/oauth/callback`.replace(/\/$/, '');
    console.log('🔧 [OAuth] Redirect URI calculé pour échange:', redirectUri);
    console.log('🔧 [OAuth] Frontend URL config:', config.app.frontendUrl);
    
    // ⚠️ CRITIQUE: Utiliser le redirect_uri stocké dans le state si disponible, sinon celui calculé
    // Cela garantit que le redirect_uri utilisé lors de l'échange est EXACTEMENT le même que lors de l'initiation
    const normalizedRedirectUri = storedRedirectUri || redirectUri;
    
    if (storedRedirectUri && storedRedirectUri !== redirectUri) {
      console.warn('⚠️ [OAuth] Redirect URI stocké diffère du calculé!');
      console.warn('   Stocké:', storedRedirectUri);
      console.warn('   Calculé:', redirectUri);
      console.warn('   Utilisation du redirect_uri stocké pour garantir la correspondance');
    }
    
    console.log('🔧 [OAuth] Redirect URI final utilisé pour l\'échange:', normalizedRedirectUri);
    
    let clientId, clientSecret, tokenUrl, tokenBody;
    
    if (provider === 'microsoft') {
      // Microsoft OAuth
      clientId = process.env.MICROSOFT_CLIENT_ID || config.microsoft?.clientId;
      clientSecret = process.env.MICROSOFT_CLIENT_SECRET || config.microsoft?.clientSecret;
      
      if (!clientId || !clientSecret) {
        console.error('❌ [OAuth] Credentials Microsoft manquants');
        return res.json({ 
          success: false, 
          redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=config_missing` 
        });
      }
      
      tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      tokenBody = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
    } else if (provider === 'linkedin') {
      // LinkedIn OAuth - Récupérer depuis admin_api_keys ou .env (partagé, comme Google)
      try {
        const linkedinCreds = await db.query(
          'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
          ['linkedin_oauth']
        );
        
        if (linkedinCreds.rows.length > 0) {
          const credData = linkedinCreds.rows[0].api_key;
          if (credData.includes('|')) {
            const [id, secret] = credData.split('|');
            clientId = id;
            clientSecret = secret;
          } else {
            clientId = credData;
            // Le secret peut être dans une autre entrée
            const secretCreds = await db.query(
              'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
              ['linkedin_oauth_secret']
            );
            if (secretCreds.rows.length > 0) {
              clientSecret = secretCreds.rows[0].api_key;
            }
          }
          console.log('✅ [OAuth] LinkedIn credentials récupérés depuis admin_api_keys pour échange de token');
        }
      } catch (dbError) {
        console.warn('⚠️ [OAuth] Erreur récupération LinkedIn credentials depuis BDD:', dbError.message);
      }
      
      // Fallback vers .env si pas trouvé en BDD
      if (!clientId) {
        clientId = process.env.LINKEDIN_CLIENT_ID || config.linkedin?.clientId;
      }
      if (!clientSecret) {
        clientSecret = process.env.LINKEDIN_CLIENT_SECRET || config.linkedin?.clientSecret;
      }
      
      // Si toujours pas de credentials, retourner une erreur
      if (!clientId || !clientSecret) {
        console.error('❌ [OAuth] LinkedIn credentials manquants (admin doit configurer)');
        return res.json({ 
          success: false, 
          redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=linkedin_not_configured&message=${encodeURIComponent('LinkedIn OAuth n\'est pas configuré. L\'administrateur doit configurer les credentials LinkedIn.')}` 
        });
      }
      
      tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
      
      // ⚠️ CRITIQUE LinkedIn: Le redirect_uri doit être EXACTEMENT le même que lors de l'initiation
      // Utiliser celui stocké dans le state pour garantir la correspondance
      const linkedinRedirectUri = normalizedRedirectUri;
      
      console.log('🔧 [OAuth] LinkedIn - Redirect URI pour échange:', linkedinRedirectUri);
      console.log('🔧 [OAuth] LinkedIn - Redirect URI stocké dans state:', storedRedirectUri);
      console.log('🔧 [OAuth] LinkedIn - Redirect URI calculé:', redirectUri);
      console.log('🔧 [OAuth] LinkedIn - Client ID:', clientId ? clientId.substring(0, 8) + '...' : 'MANQUANT');
      
      tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: linkedinRedirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });
      
      console.log('🔧 [OAuth] LinkedIn - Token body (sans secret):', {
        grant_type: 'authorization_code',
        code: code.substring(0, 10) + '...',
        redirect_uri: linkedinRedirectUri,
        client_id: clientId ? clientId.substring(0, 8) + '...' : 'MANQUANT',
        client_secret: clientSecret ? 'PRÉSENT' : 'MANQUANT'
      });
    } else {
      // Google OAuth
      clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
      
      if (!clientId || !clientSecret) {
        console.error('❌ [OAuth] Credentials Google manquants');
        return res.json({ 
          success: false, 
          redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=config_missing` 
        });
      }
      
      tokenUrl = 'https://oauth2.googleapis.com/token';
      // ⚠️ CRITIQUE: Utiliser le redirect_uri normalisé (sans trailing slash)
      const finalRedirectUri = normalizedRedirectUri;
      console.log('🔧 [OAuth] Redirect URI final utilisé pour l\'échange:', finalRedirectUri);
      
      tokenBody = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: finalRedirectUri,
        grant_type: 'authorization_code',
      });
      
      // Logger le body pour debug (sans le secret)
      console.log('🔧 [OAuth] Token body (sans secret):', {
        code: code ? `${code.substring(0, 20)}...` : 'MANQUANT',
        client_id: clientId ? `${clientId.substring(0, 8)}...` : 'MANQUANT',
        redirect_uri: finalRedirectUri,
        grant_type: 'authorization_code'
      });
    }
    
    // ⚠️ PROTECTION: Vérifier si un credential existe déjà AVANT d'essayer d'échanger le code
    // Cela évite l'erreur "invalid_grant" si le code a déjà été utilisé
    const existingCredentialCheck = await db.query(
      'SELECT * FROM oauth_credentials WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    if (existingCredentialCheck.rows.length > 0) {
      console.log('✅ [OAuth] Credential existant trouvé, utilisation du credential existant au lieu d\'échanger le code');
      console.log('✅ [OAuth] Email du credential existant:', existingCredentialCheck.rows[0].email);
      // Supprimer le state après succès
      await db.query('DELETE FROM oauth_states WHERE state = $1', [state]).catch(() => {});
      return res.json({ 
        success: true, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_success=${provider}&email=${encodeURIComponent(existingCredentialCheck.rows[0].email || 'already_connected')}` 
      });
    }
    
    console.log('🔄 [OAuth] Aucun credential existant, procédure d\'échange du code...');
    
    console.log('🔄 [OAuth] Échange du code contre un token...');
    console.log('🔧 [OAuth] Redirect URI utilisé pour l\'échange:', redirectUri);
    console.log('🔧 [OAuth] Token URL:', tokenUrl);
    console.log('🔧 [OAuth] Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'MANQUANT');
    console.log('🔧 [OAuth] Code reçu (premiers caractères):', code ? `${code.substring(0, 20)}...` : 'MANQUANT');
    console.log('🔧 [OAuth] Longueur du code:', code ? code.length : 0);
    console.log('🔧 [OAuth] Provider:', provider);
    console.log('🔧 [OAuth] User ID:', userId);
    
    // ⚠️ NOTE: La vérification du redirect_uri est faite plus bas avec normalizedRedirectUri
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody,
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText };
      }
      
      console.error('❌ [OAuth] Erreur échange token:', errorJson);
      
      // ⚠️ Si le code a déjà été utilisé ou a expiré (invalid_grant), vérifier si un credential existe déjà
      if (errorJson.error === 'invalid_grant' || errorText.includes('code has been used') || errorText.includes('expired') || errorText.includes('AADSTS70000')) {
        console.warn('⚠️ [OAuth] Code OAuth invalide/expiré/déjà utilisé, vérification si credential existe...');
        const existingCredential = await db.query(
          'SELECT * FROM oauth_credentials WHERE user_id = $1 AND provider = $2',
          [userId, provider]
        );
        
        if (existingCredential.rows.length > 0) {
          console.log('✅ [OAuth] Credential existant trouvé malgré code invalide/expiré - c\'est normal si le code a déjà été utilisé');
          // Supprimer le state même si le code était invalide
          await db.query('DELETE FROM oauth_states WHERE state = $1', [state]).catch(() => {});
          return res.json({ 
            success: true, 
            redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_success=${provider}&email=${encodeURIComponent(existingCredential.rows[0].email || 'already_connected')}` 
          });
        } else {
          // Si aucun credential n'existe et le code a expiré, demander à réessayer
          console.warn('⚠️ [OAuth] Aucun credential existant trouvé, le code a expiré ou a déjà été utilisé.');
          console.warn('⚠️ [OAuth] Cela peut arriver si:');
          console.warn('   1. Le code a été utilisé deux fois (double appel du callback)');
          console.warn('   2. Le code a expiré (Google donne 10 minutes)');
          console.warn('   3. Le redirect_uri ne correspond pas exactement');
          console.warn('⚠️ [OAuth] L\'utilisateur doit réessayer en cliquant à nouveau sur "Connecter"');
          return res.json({ 
            success: false, 
            redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=code_expired` 
          });
        }
      }
      
      return res.json({ 
        success: false, 
        redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=token_exchange_failed` 
      });
    }
    
    const tokens = await tokenResponse.json();
    console.log('✅ [OAuth] Token obtenu');
    console.log('🔧 [OAuth] Tokens reçus de LinkedIn:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });
    
    // ⚠️ LinkedIn peut ne pas retourner refresh_token dans certaines conditions
    // Vérifier si refresh_token est présent, sinon logger un avertissement
    if (!tokens.refresh_token) {
      console.warn('⚠️ [OAuth] LinkedIn n\'a pas retourné de refresh_token');
      console.warn('⚠️ [OAuth] Cela peut arriver si:');
      console.warn('   1. L\'app LinkedIn n\'a pas les permissions nécessaires');
      console.warn('   2. L\'utilisateur a déjà connecté cette app (LinkedIn ne renvoie refresh_token qu\'à la première connexion)');
      console.warn('   3. Le scope w_member_social n\'est pas approuvé dans l\'app LinkedIn');
    }
    
    // Récupérer les infos utilisateur selon le provider
    console.log('🔄 [OAuth] Récupération des infos utilisateur...');
    console.log('🔧 [OAuth] Token d\'accès présent:', !!tokens.access_token);
    console.log('🔧 [OAuth] Token type:', tokens.token_type || 'Bearer');
    
    try {
      let userInfo, email, userPrincipalName;
      
      if (provider === 'microsoft') {
        // Microsoft Graph API
        const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `${tokens.token_type || 'Bearer'} ${tokens.access_token}`,
          },
        });
        
        console.log('🔧 [OAuth] Status userinfo Microsoft:', userInfoResponse.status, userInfoResponse.statusText);
        
        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text();
          console.error('❌ [OAuth] Erreur récupération userinfo Microsoft:', errorText);
          return res.json({ 
            success: false, 
            redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=userinfo_failed` 
          });
        }
        
        userInfo = await userInfoResponse.json();
        email = userInfo.mail || userInfo.userPrincipalName;
        const userPrincipalName = userInfo.userPrincipalName || email;
        console.log('✅ [OAuth] UserInfo Microsoft récupéré:', { email, userPrincipalName, id: userInfo.id });
      } else if (provider === 'linkedin') {
        // LinkedIn API v2
        const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: {
            Authorization: `${tokens.token_type || 'Bearer'} ${tokens.access_token}`,
          },
        });
        
        console.log('🔧 [OAuth] Status userinfo LinkedIn:', userInfoResponse.status, userInfoResponse.statusText);
        
        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text();
          console.error('❌ [OAuth] Erreur récupération userinfo LinkedIn:', errorText);
          return res.json({ 
            success: false, 
            redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=userinfo_failed` 
          });
        }
        
        userInfo = await userInfoResponse.json();
        email = userInfo.email;
        console.log('✅ [OAuth] UserInfo LinkedIn récupéré:', { email, sub: userInfo.sub });
      } else {
        // Google API
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `${tokens.token_type || 'Bearer'} ${tokens.access_token}`,
          },
        });
        
        console.log('🔧 [OAuth] Status userinfo Google:', userInfoResponse.status, userInfoResponse.statusText);
        
        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text();
          console.error('❌ [OAuth] Erreur récupération userinfo Google:', errorText);
          return res.json({ 
            success: false, 
            redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=userinfo_failed` 
          });
        }
        
        userInfo = await userInfoResponse.json();
        email = userInfo.email;
        console.log('✅ [OAuth] UserInfo Google récupéré:', { email, id: userInfo.id });
      }
      
      if (!email) {
        console.error('❌ [OAuth] Email manquant dans userInfo:', userInfo);
        return res.json({ 
          success: false, 
          redirectUrl: `${config.app.frontendUrl}/oauth/callback?oauth_error=email_missing` 
        });
      }
      
      console.log('✅ [OAuth] Email récupéré:', email);
      console.log('✅ [OAuth] Email récupéré:', email);
      
      // ⚠️ VÉRIFICATION: Vérifier si un credential existe déjà pour cet utilisateur et ce provider
      // pour éviter les doublons si le callback est appelé plusieurs fois
      const existingCredential = await db.query(
        'SELECT * FROM oauth_credentials WHERE user_id = $1 AND provider = $2 AND email = $3',
        [userId, provider, email]
      );
      
      let n8nCredential;
      if (existingCredential.rows.length > 0) {
        console.log('⚠️ [OAuth] Credential existant trouvé dans la base de données, vérification dans n8n...');
        const existing = existingCredential.rows[0];
        
        // ⚠️ CRITIQUE: Vérifier si le credential n8n existe toujours
        if (existing.n8n_credential_id) {
          try {
            const config = require('../config');
            const n8nUrl = config.n8n.url;
            const n8nApiKey = config.n8n.apiKey;
            
            const checkResponse = await fetch(`${n8nUrl}/api/v1/credentials/${existing.n8n_credential_id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': n8nApiKey,
              },
            });
            
            if (checkResponse.ok) {
              console.log('✅ [OAuth] Credential n8n existe toujours, mise à jour des tokens...');
              const existingN8nCred = await checkResponse.json();
              
              // Mettre à jour les tokens dans n8n
              const updateData = {
                ...existingN8nCred.data,
                oauthTokenData: {
                  access_token: tokens.access_token,
                  refresh_token: tokens.refresh_token,
                  token_type: tokens.token_type || 'Bearer',
                  expires_in: tokens.expires_in,
                  scope: tokens.scope || (provider === 'microsoft'
                    ? 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/User.Read offline_access'
                    : provider === 'google'
                    ? 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/presentations'
                    : provider === 'google_sheets' 
                    ? 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
                    : provider === 'google_drive'
                    ? 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file'
                    : provider === 'google_docs'
                    ? 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file'
                    : provider === 'linkedin'
                    ? 'openid profile email w_member_social'
                    : 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify'),
                  expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
                }
              };
              
              const updateResponse = await fetch(`${n8nUrl}/api/v1/credentials/${existing.n8n_credential_id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'X-N8N-API-KEY': n8nApiKey,
                },
                body: JSON.stringify({
                  ...existingN8nCred,
                  data: updateData
                }),
              });
              
              if (updateResponse.ok) {
                console.log('✅ [OAuth] Tokens mis à jour dans n8n');
              } else {
                console.warn('⚠️ [OAuth] Erreur lors de la mise à jour des tokens dans n8n, mais on continue...');
              }
              
              const providerName = provider === 'microsoft' ? 'Microsoft Outlook' : 
                                   provider === 'linkedin' ? 'LinkedIn' :
                                   provider === 'google_sheets' ? 'Google Sheets' :
                                   provider === 'google_drive' ? 'Google Drive' :
                                   provider === 'google_docs' ? 'Google Docs' : 'Gmail';
              n8nCredential = { id: existing.n8n_credential_id, name: existingN8nCred.name || `${providerName} - ${existing.email}` };
            } else {
              console.warn('⚠️ [OAuth] Credential n8n n\'existe plus, recréation...');
              // Le credential n8n n'existe plus, le recréer
              if (provider === 'microsoft') {
                n8nCredential = await createMicrosoftOutlookCredentialInN8n(tokens, email, userId, userPrincipalName);
              } else if (provider === 'google_sheets') {
                n8nCredential = await createGoogleSheetsCredentialInN8n(tokens, email, userId);
              } else if (provider === 'google_drive') {
                n8nCredential = await createGoogleDriveCredentialInN8n(tokens, email, userId);
              } else if (provider === 'google') {
                // Provider "google" unifié : créer des credentials pour tous les services Google
                n8nCredential = await createGoogleUnifiedCredentialsInN8n(tokens, email, userId);
              } else if (provider === 'google_docs') {
                n8nCredential = await createGoogleDocsCredentialInN8n(tokens, email, userId);
              } else if (provider === 'linkedin') {
                n8nCredential = await createLinkedInCredentialInN8n(tokens, email, userId);
              } else {
                n8nCredential = await createGmailCredentialInN8n(tokens, email, userId);
              }
              console.log('✅ [OAuth] Credential n8n recréé:', n8nCredential.id);
              
              // Mettre à jour le n8n_credential_id dans la base de données
              await db.query(
                'UPDATE oauth_credentials SET n8n_credential_id = $1, encrypted_data = $2, expires_at = $3, updated_at = NOW() WHERE id = $4',
                [
                  n8nCredential.id,
                  JSON.stringify(tokens),
                  tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
                  existing.id
                ]
              );
              console.log('✅ [OAuth] Credential mis à jour en base de données avec nouveau n8n_credential_id');
            }
          } catch (checkError) {
            console.error('❌ [OAuth] Erreur lors de la vérification du credential n8n:', checkError);
            console.warn('⚠️ [OAuth] Recréation du credential n8n par sécurité...');
            // En cas d'erreur, recréer le credential
            if (provider === 'microsoft') {
              n8nCredential = await createMicrosoftOutlookCredentialInN8n(tokens, email, userId, userPrincipalName);
            } else if (provider === 'google_sheets') {
              n8nCredential = await createGoogleSheetsCredentialInN8n(tokens, email, userId);
            } else if (provider === 'google_drive') {
              n8nCredential = await createGoogleDriveCredentialInN8n(tokens, email, userId);
            } else if (provider === 'google') {
              // Provider "google" unifié : créer des credentials pour tous les services Google
              n8nCredential = await createGoogleUnifiedCredentialsInN8n(tokens, email, userId);
            } else if (provider === 'google_docs') {
              n8nCredential = await createGoogleDocsCredentialInN8n(tokens, email, userId);
            } else {
              n8nCredential = await createGmailCredentialInN8n(tokens, email, userId);
            }
            console.log('✅ [OAuth] Credential n8n recréé:', n8nCredential.id);
            
            // Mettre à jour le n8n_credential_id dans la base de données
            await db.query(
              'UPDATE oauth_credentials SET n8n_credential_id = $1, encrypted_data = $2, expires_at = $3, updated_at = NOW() WHERE id = $4',
              [
                n8nCredential.id,
                JSON.stringify(tokens),
                tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
                existing.id
              ]
            );
            console.log('✅ [OAuth] Credential mis à jour en base de données avec nouveau n8n_credential_id');
          }
        } else {
          console.warn('⚠️ [OAuth] Credential existe mais n8n_credential_id manquant, recréation...');
          // Le credential existe mais n'a pas de n8n_credential_id, le créer
          if (provider === 'microsoft') {
            n8nCredential = await createMicrosoftOutlookCredentialInN8n(tokens, email, userId, userPrincipalName);
          } else if (provider === 'google_sheets') {
            n8nCredential = await createGoogleSheetsCredentialInN8n(tokens, email, userId);
          } else if (provider === 'google_drive') {
            n8nCredential = await createGoogleDriveCredentialInN8n(tokens, email, userId);
          } else if (provider === 'google') {
            // Provider "google" unifié : créer des credentials pour tous les services Google
            n8nCredential = await createGoogleUnifiedCredentialsInN8n(tokens, email, userId);
          } else if (provider === 'google_docs') {
            n8nCredential = await createGoogleDocsCredentialInN8n(tokens, email, userId);
          } else {
            n8nCredential = await createGmailCredentialInN8n(tokens, email, userId);
          }
          console.log('✅ [OAuth] Credential n8n créé:', n8nCredential.id);
          
          // Mettre à jour le n8n_credential_id dans la base de données
          await db.query(
            'UPDATE oauth_credentials SET n8n_credential_id = $1, encrypted_data = $2, expires_at = $3, updated_at = NOW() WHERE id = $4',
            [
              n8nCredential.id,
              JSON.stringify(tokens),
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
              existing.id
            ]
          );
          console.log('✅ [OAuth] Credential mis à jour en base de données avec n8n_credential_id');
        }
        
        // Mettre à jour les tokens dans la base de données (si pas déjà fait)
        if (!n8nCredential.id || n8nCredential.id === existing.n8n_credential_id) {
          await db.query(
            'UPDATE oauth_credentials SET encrypted_data = $1, expires_at = $2, updated_at = NOW() WHERE id = $3',
            [
              JSON.stringify(tokens),
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
              existing.id
            ]
          );
          console.log('✅ [OAuth] Credential mis à jour en base de données');
        }
      } else {
        // Créer le credential dans n8n
        console.log('🔄 [OAuth] Création du credential dans n8n...');
        if (provider === 'microsoft') {
          n8nCredential = await createMicrosoftOutlookCredentialInN8n(tokens, email, userId, userPrincipalName);
        } else if (provider === 'google_sheets') {
          n8nCredential = await createGoogleSheetsCredentialInN8n(tokens, email, userId);
        } else if (provider === 'google_drive') {
          n8nCredential = await createGoogleDriveCredentialInN8n(tokens, email, userId);
        } else if (provider === 'google') {
          // Provider "google" unifié : créer des credentials pour tous les services Google
          n8nCredential = await createGoogleUnifiedCredentialsInN8n(tokens, email, userId);
          
          // Sauvegarder TOUS les credentials créés dans la base de données
          if (n8nCredential.allCredentials) {
            console.log('💾 [OAuth] Sauvegarde de tous les credentials Google dans la base de données...');
            
            // Sauvegarder chaque credential individuellement
            await db.createOAuthCredential(
              userId,
              'google_sheets',
              JSON.stringify(tokens),
              n8nCredential.allCredentials.sheets.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            
            await db.createOAuthCredential(
              userId,
              'google_docs',
              JSON.stringify(tokens),
              n8nCredential.allCredentials.docs.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            
            await db.createOAuthCredential(
              userId,
              'google_drive',
              JSON.stringify(tokens),
              n8nCredential.allCredentials.drive.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            
            await db.createOAuthCredential(
              userId,
              'gmail',
              JSON.stringify(tokens),
              n8nCredential.allCredentials.gmail.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            
            await db.createOAuthCredential(
              userId,
              'google_calendar',
              JSON.stringify(tokens),
              n8nCredential.allCredentials.calendar.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            
            await db.createOAuthCredential(
              userId,
              'google_ads',
              JSON.stringify(tokens),
              n8nCredential.allCredentials.ads.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            
            await db.createOAuthCredential(
              userId,
              'google_tasks',
              JSON.stringify(tokens),
              n8nCredential.allCredentials.tasks.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            
            await db.createOAuthCredential(
              userId,
              'google_slides',
              JSON.stringify(tokens),
              n8nCredential.allCredentials.slides.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            
            console.log('✅ [OAuth] Tous les credentials Google sauvegardés en base de données (8 services)');
          } else {
            // Fallback : sauvegarder seulement le credential principal
            await db.createOAuthCredential(
              userId,
              provider,
              JSON.stringify(tokens),
              n8nCredential.id,
              email,
              tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
            );
            console.log('✅ [OAuth] Credential principal stocké en base de données');
          }
        } else if (provider === 'google_docs') {
          n8nCredential = await createGoogleDocsCredentialInN8n(tokens, email, userId);
        } else if (provider === 'linkedin') {
          n8nCredential = await createLinkedInCredentialInN8n(tokens, email, userId);
        } else {
          n8nCredential = await createGmailCredentialInN8n(tokens, email, userId);
        }
        
        // Pour les providers non-google unifié, sauvegarder normalement
        if (provider !== 'google') {
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
        }
      }
      
      // Supprimer le state utilisé (seulement après avoir terminé avec succès)
      await db.query('DELETE FROM oauth_states WHERE state = $1', [state]);
      console.log('✅ [OAuth] State supprimé après succès');
      
      // Retourner l'URL de redirection au lieu de rediriger directement
      const redirectUrl = `${config.app.frontendUrl}/oauth/callback?oauth_success=${provider}&email=${encodeURIComponent(email)}`;
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

// Créer un credential Google Sheets dans n8n avec injection automatique des tokens OAuth
async function createGoogleSheetsCredentialInN8n(tokens, email, userId) {
  const config = require('../config');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  // Pour Google Sheets OAuth2, n8n nécessite clientId et clientSecret
  const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  console.log('🔄 [OAuth] Création credential Google Sheets avec tokens OAuth injectés directement...');
  console.log('🔧 [OAuth] Tokens disponibles:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in
  });
  
  const credentialData = {
    name: `Google Sheets - ${email} - ${userId.substring(0, 8)}`,
    type: 'googleSheetsOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      allowedDomains: '', // Propriété requise par n8n pour Google Sheets (chaîne vide = tous les domaines)
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
  console.log('🔧 [OAuth] Création credential Google Sheets n8n avec tokens OAuth injectés:');
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
    console.error('❌ [OAuth] Erreur détaillée n8n pour Google Sheets:', errorText);
    console.error('❌ [OAuth] Payload envoyé:', JSON.stringify(credentialData, null, 2));
    throw new Error(`Erreur création credential Google Sheets n8n: ${createResponse.status} - ${errorText}`);
  }
  
  const credential = await createResponse.json();
  console.log('✅ [OAuth] Credential Google Sheets n8n créé avec succès:', credential.id);
  console.log('✅ [OAuth] Credential Name:', credential.name);
  
  // Vérifier que les tokens sont bien présents dans le credential créé
  if (credential.data?.oauthTokenData?.access_token) {
    console.log('✅ [OAuth] Access token présent dans oauthTokenData après création');
    console.log('✅ [OAuth] Credential Google Sheets créé avec tokens OAuth et prêt à être utilisé');
    return credential;
  } else {
    console.warn('⚠️ [OAuth] Aucun access token trouvé dans oauthTokenData après création');
    // Retourner quand même le credential, n8n pourra le mettre à jour plus tard
    return credential;
  }
}

// Créer un credential Google Drive dans n8n avec injection automatique des tokens OAuth
async function createGoogleDriveCredentialInN8n(tokens, email, userId) {
  const config = require('../config');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  // Pour Google Drive OAuth2, n8n nécessite clientId et clientSecret
  const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  console.log('🔄 [OAuth] Création credential Google Drive avec tokens OAuth injectés directement...');
  console.log('🔧 [OAuth] Tokens disponibles:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in
  });
  
  const credentialData = {
    name: `Google Drive - ${email} - ${userId.substring(0, 8)}`,
    type: 'googleDriveOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      allowedDomains: '', // Propriété requise par n8n pour Google Drive (chaîne vide = tous les domaines)
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
  console.log('🔧 [OAuth] Création credential Google Drive n8n avec tokens OAuth injectés:');
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
    console.error('❌ [OAuth] Erreur détaillée n8n pour Google Drive:', errorText);
    console.error('❌ [OAuth] Payload envoyé:', JSON.stringify(credentialData, null, 2));
    throw new Error(`Erreur création credential Google Drive n8n: ${createResponse.status} - ${errorText}`);
  }
  
  const credential = await createResponse.json();
  console.log('✅ [OAuth] Credential Google Drive n8n créé avec succès:', credential.id);
  console.log('✅ [OAuth] Credential Name:', credential.name);
  
  // Vérifier que les tokens sont bien présents dans le credential créé
  if (credential.data?.oauthTokenData?.access_token) {
    console.log('✅ [OAuth] Access token présent dans oauthTokenData après création');
    console.log('✅ [OAuth] Credential Google Drive créé avec tokens OAuth et prêt à être utilisé');
    return credential;
  } else {
    console.warn('⚠️ [OAuth] Aucun access token trouvé dans oauthTokenData après création');
    // Retourner quand même le credential, n8n pourra le mettre à jour plus tard
    return credential;
  }
}

// Créer un credential Google Docs dans n8n avec injection automatique des tokens OAuth
async function createGoogleDocsCredentialInN8n(tokens, email, userId) {
  const config = require('../config');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  // Pour Google Docs OAuth2, n8n nécessite clientId et clientSecret
  const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  console.log('🔄 [OAuth] Création credential Google Docs avec tokens OAuth injectés directement...');
  console.log('🔧 [OAuth] Tokens disponibles:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in
  });
  
  const credentialData = {
    name: `Google Docs - ${email} - ${userId.substring(0, 8)}`,
    type: 'googleDocsOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      allowedDomains: '', // Propriété requise par n8n pour Google Docs (chaîne vide = tous les domaines)
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
  console.log('🔧 [OAuth] Création credential Google Docs n8n avec tokens OAuth injectés:');
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
    console.error('❌ [OAuth] Erreur détaillée n8n pour Google Docs:', errorText);
    console.error('❌ [OAuth] Payload envoyé:', JSON.stringify(credentialData, null, 2));
    throw new Error(`Erreur création credential Google Docs n8n: ${createResponse.status} - ${errorText}`);
  }
  
  const credential = await createResponse.json();
  console.log('✅ [OAuth] Credential Google Docs n8n créé avec succès:', credential.id);
  console.log('✅ [OAuth] Credential Name:', credential.name);
  
  // Vérifier que les tokens sont bien présents dans le credential créé
  if (credential.data?.oauthTokenData?.access_token) {
    console.log('✅ [OAuth] Access token présent dans oauthTokenData après création');
    console.log('✅ [OAuth] Credential Google Docs créé avec tokens OAuth et prêt à être utilisé');
    return credential;
  } else {
    console.warn('⚠️ [OAuth] Aucun access token trouvé dans oauthTokenData après création');
    // Retourner quand même le credential, n8n pourra le mettre à jour plus tard
    return credential;
  }
}

// Créer un credential Google Calendar dans n8n avec injection automatique des tokens OAuth
async function createGoogleCalendarCredentialInN8n(tokens, email, userId) {
  const config = require('../config');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  const credentialData = {
    name: `Google Calendar - ${email} - ${userId.substring(0, 8)}`,
    type: 'googleCalendarOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      allowedDomains: '',
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
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
    console.error('❌ [OAuth] Erreur création credential Google Calendar n8n:', errorText);
    throw new Error(`Erreur création credential Google Calendar n8n: ${createResponse.status} - ${errorText}`);
  }
  
  const credential = await createResponse.json();
  console.log('✅ [OAuth] Credential Google Calendar n8n créé:', credential.id);
  return credential;
}

// Créer un credential Google Ads dans n8n avec injection automatique des tokens OAuth
async function createGoogleAdsCredentialInN8n(tokens, email, userId) {
  const config = require('../config');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  const credentialData = {
    name: `Google Ads - ${email} - ${userId.substring(0, 8)}`,
    type: 'googleAdsOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      allowedDomains: '',
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://www.googleapis.com/auth/adwords',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
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
    console.error('❌ [OAuth] Erreur création credential Google Ads n8n:', errorText);
    throw new Error(`Erreur création credential Google Ads n8n: ${createResponse.status} - ${errorText}`);
  }
  
  const credential = await createResponse.json();
  console.log('✅ [OAuth] Credential Google Ads n8n créé:', credential.id);
  return credential;
}

// Créer un credential Google Tasks dans n8n avec injection automatique des tokens OAuth
async function createGoogleTasksCredentialInN8n(tokens, email, userId) {
  const config = require('../config');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  const credentialData = {
    name: `Google Tasks - ${email} - ${userId.substring(0, 8)}`,
    type: 'googleTasksOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      allowedDomains: '',
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://www.googleapis.com/auth/tasks',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
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
    console.error('❌ [OAuth] Erreur création credential Google Tasks n8n:', errorText);
    throw new Error(`Erreur création credential Google Tasks n8n: ${createResponse.status} - ${errorText}`);
  }
  
  const credential = await createResponse.json();
  console.log('✅ [OAuth] Credential Google Tasks n8n créé:', credential.id);
  return credential;
}

// Créer un credential Google Slides dans n8n avec injection automatique des tokens OAuth
async function createGoogleSlidesCredentialInN8n(tokens, email, userId) {
  const config = require('../config');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  const credentialData = {
    name: `Google Slides - ${email} - ${userId.substring(0, 8)}`,
    type: 'googleSlidesOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      allowedDomains: '',
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
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
    console.error('❌ [OAuth] Erreur création credential Google Slides n8n:', errorText);
    throw new Error(`Erreur création credential Google Slides n8n: ${createResponse.status} - ${errorText}`);
  }
  
  const credential = await createResponse.json();
  console.log('✅ [OAuth] Credential Google Slides n8n créé:', credential.id);
  return credential;
}

// Créer des credentials Google unifiés dans n8n (tous les services avec le même token)
// Cette fonction crée 8 credentials n8n (Sheets, Docs, Drive, Gmail, Calendar, Ads, Tasks, Slides) avec le même token OAuth
async function createGoogleUnifiedCredentialsInN8n(tokens, email, userId) {
  console.log('🔗 [OAuth] Création des credentials Google unifiés pour tous les services...');
  
  // Créer les credentials pour tous les services Google
  const credentials = {
    sheets: await createGoogleSheetsCredentialInN8n(tokens, email, userId),
    docs: await createGoogleDocsCredentialInN8n(tokens, email, userId),
    drive: await createGoogleDriveCredentialInN8n(tokens, email, userId),
    gmail: await createGmailCredentialInN8n(tokens, email, userId),
    calendar: await createGoogleCalendarCredentialInN8n(tokens, email, userId),
    ads: await createGoogleAdsCredentialInN8n(tokens, email, userId),
    tasks: await createGoogleTasksCredentialInN8n(tokens, email, userId),
    slides: await createGoogleSlidesCredentialInN8n(tokens, email, userId)
  };
  
  console.log('✅ [OAuth] Tous les credentials Google créés:', {
    sheets: credentials.sheets.id,
    docs: credentials.docs.id,
    drive: credentials.drive.id,
    gmail: credentials.gmail.id,
    calendar: credentials.calendar.id,
    ads: credentials.ads.id,
    tasks: credentials.tasks.id,
    slides: credentials.slides.id
  });
  
  // Retourner un objet avec tous les credentials (on utilisera le premier comme référence principale)
  return {
    id: credentials.sheets.id, // ID principal (Sheets)
    name: `Google - ${email}`,
    allCredentials: credentials
  };
}

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
      allowedDomains: '', // Propriété requise par n8n pour Gmail (chaîne vide = tous les domaines)
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

// Créer un credential Microsoft Outlook dans n8n avec injection automatique des tokens OAuth
async function createMicrosoftOutlookCredentialInN8n(tokens, email, userId, userPrincipalName = null) {
  const config = require('../config');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  // Pour Microsoft Outlook OAuth2, n8n nécessite clientId et clientSecret
  const clientId = process.env.MICROSOFT_CLIENT_ID || config.microsoft?.clientId;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || config.microsoft?.clientSecret;
  
  if (!clientId || !clientSecret) {
    throw new Error('MICROSOFT_CLIENT_ID et MICROSOFT_CLIENT_SECRET sont requis pour créer le credential n8n');
  }
  
  // Si userPrincipalName n'est pas fourni, utiliser l'email comme userPrincipalName
  const principalName = userPrincipalName || email;
  
  console.log('🔄 [OAuth] Création credential Microsoft Outlook avec tokens OAuth injectés directement...');
  console.log('🔧 [OAuth] Tokens disponibles:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in
  });
  console.log('🔧 [OAuth] userPrincipalName:', principalName);
  
  const credentialData = {
    name: `Microsoft Outlook - ${email} - ${userId.substring(0, 8)}`,
    type: 'microsoftOutlookOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      userPrincipalName: principalName,
      serverUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/User.Read offline_access',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
  console.log('🔧 [OAuth] Création credential Microsoft Outlook n8n avec tokens OAuth injectés:');
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
  console.log('✅ [OAuth] Credential Microsoft Outlook n8n créé avec succès:', credential.id);
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const getResponse = await fetch(`${n8nUrl}/api/v1/credentials/${credential.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey,
        },
      });
      
      if (getResponse.ok) {
        const existingCredential = await getResponse.json();
        console.log('✅ [OAuth] Credential récupéré, injection des tokens via PUT...');
        
        const updatedData = {
          ...existingCredential.data,
          oauthTokenData: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_type: tokens.token_type || 'Bearer',
            expires_in: tokens.expires_in,
            scope: tokens.scope || 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/User.Read offline_access',
            expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
          }
        };
        
        const updatePayload = {
          name: existingCredential.name,
          type: existingCredential.type,
          data: updatedData
        };
        
        const updateResponse = await fetch(`${n8nUrl}/api/v1/credentials/${credential.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': n8nApiKey,
          },
          body: JSON.stringify(updatePayload),
        });
        
        if (updateResponse.ok) {
          const updatedCredential = await updateResponse.json();
          console.log('✅ [OAuth] Tokens OAuth injectés via PUT après création');
          return updatedCredential;
        } else {
          const errorText = await updateResponse.text();
          console.warn('⚠️ [OAuth] Échec injection tokens via PUT:', errorText);
        }
      }
    } catch (updateError) {
      console.error('⚠️ [OAuth] Erreur lors de la mise à jour:', updateError.message);
    }
  }
  
  console.log('✅ [OAuth] Credential Microsoft Outlook créé (tokens peuvent nécessiter une connexion manuelle)');
  return credential;
}

// Créer un credential LinkedIn dans n8n avec injection automatique des tokens OAuth
async function createLinkedInCredentialInN8n(tokens, email, userId) {
  const config = require('../config');
  const db = require('../database');
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  // Pour LinkedIn OAuth2, n8n nécessite clientId et clientSecret
  // Récupérer depuis admin_api_keys ou .env (partagé, comme Google)
  let clientId, clientSecret;
  
  try {
    const linkedinCreds = await db.query(
      'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
      ['linkedin_oauth']
    );
    
    if (linkedinCreds.rows.length > 0) {
      const credData = linkedinCreds.rows[0].api_key;
      if (credData.includes('|')) {
        const [id, secret] = credData.split('|');
        clientId = id;
        clientSecret = secret;
      } else {
        clientId = credData;
        // Le secret peut être dans une autre entrée
        const secretCreds = await db.query(
          'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
          ['linkedin_oauth_secret']
        );
        if (secretCreds.rows.length > 0) {
          clientSecret = secretCreds.rows[0].api_key;
        }
      }
      console.log('✅ [OAuth] LinkedIn credentials récupérés depuis admin_api_keys pour création credential n8n');
    }
  } catch (dbError) {
    console.warn('⚠️ [OAuth] Erreur récupération LinkedIn credentials depuis BDD:', dbError.message);
  }
  
  // Fallback vers .env si pas trouvé en BDD
  if (!clientId) {
    clientId = process.env.LINKEDIN_CLIENT_ID || config.linkedin?.clientId;
  }
  if (!clientSecret) {
    clientSecret = process.env.LINKEDIN_CLIENT_SECRET || config.linkedin?.clientSecret;
  }
  
  if (!clientId || !clientSecret) {
    throw new Error('LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET doivent être configurés dans la BDD (admin_api_keys avec service_name="linkedin_oauth") ou dans .env. L\'administrateur doit configurer les credentials LinkedIn une fois pour tous les utilisateurs.');
  }
  
  console.log('🔄 [OAuth] Création credential LinkedIn avec tokens OAuth injectés directement...');
  console.log('🔧 [OAuth] Tokens disponibles:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in
  });
  
  // ⚠️ CRITIQUE: n8n nécessite ces propriétés pour linkedInOAuth2Api (comme pour Gmail)
  const credentialData = {
    name: `LinkedIn - ${email} - ${userId.substring(0, 8)}`,
    type: 'linkedInOAuth2Api',
    data: {
      clientId: clientId,
      clientSecret: clientSecret,
      serverUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      sendAdditionalBodyProperties: false,
      additionalBodyProperties: '',
      allowedDomains: '', // Propriété requise par n8n pour LinkedIn (chaîne vide = tous les domaines)
      oauthTokenData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null, // Peut être null si LinkedIn ne le retourne pas
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in,
        scope: tokens.scope || 'openid profile email w_member_social',
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      }
    }
  };
  
  console.log('🔧 [OAuth] Création credential LinkedIn n8n avec tokens OAuth injectés:');
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
  console.log('✅ [OAuth] Credential LinkedIn n8n créé avec succès:', credential.id);
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedData = {
        ...credential.data,
        serverUrl: credential.data.serverUrl || 'https://www.linkedin.com/oauth/v2/authorization',
        sendAdditionalBodyProperties: credential.data.sendAdditionalBodyProperties !== undefined ? credential.data.sendAdditionalBodyProperties : false,
        additionalBodyProperties: credential.data.additionalBodyProperties || '',
        allowedDomains: credential.data.allowedDomains || '',
        oauthTokenData: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null, // Peut être null si LinkedIn ne le retourne pas
          token_type: tokens.token_type || 'Bearer',
          expires_in: tokens.expires_in,
          scope: tokens.scope || 'openid profile email w_member_social',
          expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
        }
      };
      
      const updatePayload = {
        ...credential,
        data: updatedData
      };
      
      const updateResponse = await fetch(`${n8nUrl}/api/v1/credentials/${credential.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey,
        },
        body: JSON.stringify(updatePayload),
      });
      
      if (updateResponse.ok) {
        const updatedCredential = await updateResponse.json();
        console.log('✅ [OAuth] Tokens OAuth injectés via PUT après création');
        return updatedCredential;
      } else {
        const errorText = await updateResponse.text();
        console.warn('⚠️ [OAuth] Échec injection tokens via PUT:', errorText);
      }
    } catch (updateError) {
      console.error('⚠️ [OAuth] Erreur lors de la mise à jour:', updateError.message);
    }
  }
  
  console.log('✅ [OAuth] Credential LinkedIn créé (tokens peuvent nécessiter une connexion manuelle)');
  return credential;
}

/**
 * Renouveler un access_token LinkedIn expiré en utilisant le refresh_token
 * Conforme à LinkedIn OAuth 2.0 : https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
 * 
 * @param {string} refreshToken - Le refresh_token stocké pour l'utilisateur
 * @param {string} userId - ID de l'utilisateur (pour récupérer les credentials admin)
 * @returns {Promise<Object>} Nouveaux tokens (access_token, refresh_token, expires_in, etc.)
 */
async function refreshLinkedInToken(refreshToken, userId) {
  const config = require('../config');
  const db = require('../database');
  
  // Récupérer les credentials LinkedIn (Client ID/Secret) depuis admin_api_keys ou .env
  let clientId, clientSecret;
  
  try {
    const linkedinCreds = await db.query(
      'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
      ['linkedin_oauth']
    );
    
    if (linkedinCreds.rows.length > 0) {
      const credData = linkedinCreds.rows[0].api_key;
      if (credData.includes('|')) {
        const [id, secret] = credData.split('|');
        clientId = id;
        clientSecret = secret;
      } else {
        clientId = credData;
        const secretCreds = await db.query(
          'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
          ['linkedin_oauth_secret']
        );
        if (secretCreds.rows.length > 0) {
          clientSecret = secretCreds.rows[0].api_key;
        }
      }
    }
  } catch (dbError) {
    console.warn('⚠️ [OAuth] Erreur récupération LinkedIn credentials depuis BDD:', dbError.message);
  }
  
  // Fallback vers .env
  if (!clientId) {
    clientId = process.env.LINKEDIN_CLIENT_ID || config.linkedin?.clientId;
  }
  if (!clientSecret) {
    clientSecret = process.env.LINKEDIN_CLIENT_SECRET || config.linkedin?.clientSecret;
  }
  
  if (!clientId || !clientSecret) {
    throw new Error('LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET doivent être configurés pour renouveler les tokens');
  }
  
  console.log('🔄 [OAuth] Renouvellement du token LinkedIn avec refresh_token...');
  
  // LinkedIn OAuth 2.0 Token Refresh Endpoint
  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  const tokenBody = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenBody,
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { error: errorText };
    }
    
    console.error('❌ [OAuth] Erreur renouvellement token LinkedIn:', errorJson);
    throw new Error(`Erreur renouvellement token LinkedIn: ${errorJson.error || errorText}`);
  }
  
  const newTokens = await tokenResponse.json();
  
  console.log('✅ [OAuth] Token LinkedIn renouvelé avec succès');
  console.log('🔧 [OAuth] Nouveaux tokens:', {
    hasAccessToken: !!newTokens.access_token,
    hasRefreshToken: !!newTokens.refresh_token,
    expiresIn: newTokens.expires_in,
    scope: newTokens.scope
  });
  
  // Mettre à jour le credential dans n8n et la BDD
  try {
    const oauthCreds = await db.getOAuthCredentials(userId, 'linkedin');
    if (oauthCreds && oauthCreds.length > 0 && oauthCreds[0].n8n_credential_id) {
      const n8nCredentialId = oauthCreds[0].n8n_credential_id;
      const n8nUrl = config.n8n.url;
      const n8nApiKey = config.n8n.apiKey;
      
      // Récupérer le credential actuel depuis n8n
      const getResponse = await fetch(`${n8nUrl}/api/v1/credentials/${n8nCredentialId}`, {
        headers: {
          'X-N8N-API-KEY': n8nApiKey,
        },
      });
      
      if (getResponse.ok) {
        const existingCredential = await getResponse.json();
        
        // Mettre à jour avec les nouveaux tokens
        const updatedData = {
          ...existingCredential.data,
          oauthTokenData: {
            ...existingCredential.data.oauthTokenData,
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || refreshToken, // Garder l'ancien si pas fourni
            token_type: newTokens.token_type || 'Bearer',
            expires_in: newTokens.expires_in,
            scope: newTokens.scope || existingCredential.data.oauthTokenData?.scope || 'openid profile email w_member_social',
            expiry_date: newTokens.expires_in ? Date.now() + (newTokens.expires_in * 1000) : null
          }
        };
        
        const updatePayload = {
          ...existingCredential,
          data: updatedData
        };
        
        const updateResponse = await fetch(`${n8nUrl}/api/v1/credentials/${n8nCredentialId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': n8nApiKey,
          },
          body: JSON.stringify(updatePayload),
        });
        
        if (updateResponse.ok) {
          console.log('✅ [OAuth] Credential n8n mis à jour avec nouveaux tokens LinkedIn');
        } else {
          const errorText = await updateResponse.text();
          console.warn('⚠️ [OAuth] Échec mise à jour credential n8n:', errorText);
        }
      }
      
      // Mettre à jour la BDD
      await db.query(
        'UPDATE oauth_credentials SET encrypted_data = $1, expires_at = $2, updated_at = NOW() WHERE id = $3',
        [
          JSON.stringify(newTokens),
          newTokens.expires_in ? new Date(Date.now() + newTokens.expires_in * 1000) : null,
          oauthCreds[0].id
        ]
      );
      console.log('✅ [OAuth] Tokens LinkedIn mis à jour dans la BDD');
    }
  } catch (updateError) {
    console.error('⚠️ [OAuth] Erreur lors de la mise à jour des tokens:', updateError.message);
    // Ne pas faire échouer la fonction, les tokens sont renouvelés même si la mise à jour échoue
  }
  
  return newTokens;
}

// Route pour renouveler un token LinkedIn expiré
router.post('/refresh-linkedin-token', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Récupérer le refresh_token depuis la BDD
    const oauthCreds = await db.getOAuthCredentials(userId, 'linkedin');
    
    if (!oauthCreds || oauthCreds.length === 0) {
      return res.status(404).json({ error: 'Aucun credential LinkedIn trouvé pour cet utilisateur' });
    }
    
    const encryptedData = oauthCreds[0].encrypted_data;
    const tokensData = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
    
    if (!tokensData.refresh_token) {
      return res.status(400).json({ error: 'Aucun refresh_token trouvé. L\'utilisateur doit se reconnecter via OAuth.' });
    }
    
    const newTokens = await refreshLinkedInToken(tokensData.refresh_token, userId);
    
    res.json({
      success: true,
      message: 'Token LinkedIn renouvelé avec succès',
      tokens: {
        hasAccessToken: !!newTokens.access_token,
        hasRefreshToken: !!newTokens.refresh_token,
        expiresIn: newTokens.expires_in
      }
    });
  } catch (error) {
    console.error('❌ [OAuth] Erreur renouvellement token LinkedIn:', error);
    res.status(500).json({
      error: 'Erreur lors du renouvellement du token',
      message: error.message
    });
  }
});

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
