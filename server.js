const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import custom modules
const { generateZegoToken, validateTokenParams } = require('./lib/zegoToken');
const { 
    generatePKCE, 
    generateState, 
    buildAuthUrl, 
    exchangeCodeForToken, 
    decodeIdToken, 
    validateState 
} = require('./lib/auth');
const { 
    requireAuth, 
    validateRequest, 
    errorHandler, 
    notFoundHandler, 
    requestLogger,
    rateLimit 
} = require('./lib/middleware');

const app = express();

// Configuration CORS
app.use(cors({
    origin: true,
    credentials: true
}));

// Configuration des sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'demo_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));

app.use(express.json());
app.use(express.static('.'));

// Add middleware
app.use(requestLogger);
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Configuration ZEGOCLOUD
const ZEGOCLOUD_APP_ID = process.env.ZEGOCLOUD_APP_ID || 'demo_app_id';
const ZEGOCLOUD_SERVER_SECRET = process.env.ZEGOCLOUD_SERVER_SECRET || 'demo_server_secret';

// Configuration France Travail OAuth
const FRANCETRAVAIL_CLIENT_ID = process.env.FRANCETRAVAIL_CLIENT_ID || 'demo_client_id';
const FRANCETRAVAIL_CLIENT_SECRET = process.env.FRANCETRAVAIL_CLIENT_SECRET || 'demo_client_secret';
const FRANCETRAVAIL_REDIRECT_URI = process.env.FRANCETRAVAIL_REDIRECT_URI || 'http://localhost:3000/auth/francetravail/callback';

// URLs France Travail (mode bac à sable pour le développement)
const FRANCETRAVAIL_AUTH_URL = 'https://authentification-candidat.francetravail.fr/connexion/oauth2/authorize';
const FRANCETRAVAIL_TOKEN_URL = 'https://authentification-candidat.francetravail.fr/connexion/oauth2/access_token';
const FRANCETRAVAIL_API_BASE = 'https://api.francetravail.io';

// France Travail OAuth configuration
const franceTravailConfig = {
    clientId: FRANCETRAVAIL_CLIENT_ID,
    clientSecret: FRANCETRAVAIL_CLIENT_SECRET,
    redirectUri: FRANCETRAVAIL_REDIRECT_URI,
    authUrl: FRANCETRAVAIL_AUTH_URL,
    tokenUrl: FRANCETRAVAIL_TOKEN_URL
};

// Route pour servir la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Route pour vérifier le statut de connexion
app.get('/api/auth/status', (req, res) => {
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

// Route pour initier l'authentification France Travail
app.get('/auth/francetravail/login', (req, res) => {
    try {
        // Générer PKCE
        const { codeVerifier, codeChallenge } = generatePKCE();
        
        // Stocker le code_verifier en session
        req.session.codeVerifier = codeVerifier;
        
        // Générer un state pour la sécurité
        const state = generateState();
        req.session.oauthState = state;

        // Construire l'URL d'autorisation
        const authUrl = buildAuthUrl(franceTravailConfig, state, codeChallenge);

        res.redirect(authUrl);
    } catch (error) {
        console.error('Erreur lors de l\'initiation de l\'authentification:', error);
        res.status(500).json({ error: 'Erreur lors de l\'initiation de l\'authentification' });
    }
});

// Route de callback pour l'authentification France Travail
app.get('/auth/francetravail/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;

        // Vérifier s'il y a une erreur
        if (error) {
            console.error('Erreur OAuth:', error);
            return res.redirect('/?error=oauth_error');
        }

        // Vérifier le state
        if (!validateState(state, req.session.oauthState)) {
            console.error('State invalide');
            return res.redirect('/?error=invalid_state');
        }

        // Vérifier la présence du code
        if (!code) {
            console.error('Code d\'autorisation manquant');
            return res.redirect('/?error=missing_code');
        }

        // Échanger le code contre un token
        const tokenData = await exchangeCodeForToken(franceTravailConfig, code, req.session.codeVerifier);
        const { access_token, id_token, refresh_token } = tokenData;

        // Décoder l'ID token pour obtenir les informations utilisateur
        const userInfo = id_token ? decodeIdToken(id_token) : {};

        // Stocker les informations utilisateur en session
        req.session.user = {
            id: userInfo.sub || 'user_' + Date.now(),
            name: userInfo.name || userInfo.given_name || 'Utilisateur',
            email: userInfo.email,
            accessToken: access_token,
            refreshToken: refresh_token
        };

        // Nettoyer les données temporaires de session
        delete req.session.codeVerifier;
        delete req.session.oauthState;

        // Rediriger vers la page d'accueil avec succès
        res.redirect('/?auth=success');

    } catch (error) {
        console.error('Erreur lors du callback OAuth:', error);
        res.redirect('/?error=callback_error');
    }
});

// Route pour se déconnecter
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erreur lors de la déconnexion:', err);
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        res.json({ success: true });
    });
});

// Route pour générer un token ZEGOCLOUD
app.post('/api/generate-token', 
    requireAuth,
    validateRequest(['roomID', 'userID']),
    (req, res, next) => {
        try {
            const { roomID, userID } = req.body;

            // Utiliser l'ID utilisateur de la session si disponible
            const effectiveUserID = req.session.user.id || userID;

            const token = generateZegoToken(roomID, effectiveUserID, ZEGOCLOUD_APP_ID, ZEGOCLOUD_SERVER_SECRET);
            
            res.json({ 
                token,
                user: {
                    id: effectiveUserID,
                    name: req.session.user.name
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Route pour obtenir les informations utilisateur depuis France Travail
app.get('/api/user/profile', requireAuth, async (req, res, next) => {
    try {
        // Exemple d'appel à l'API France Travail pour obtenir le profil
        // Note: L'endpoint exact dépend de l'API disponible
        if (req.session.user.accessToken) {
            try {
                const axios = require('axios');
                const profileResponse = await axios.get(`${FRANCETRAVAIL_API_BASE}/individu/v1/profil`, {
                    headers: {
                        'Authorization': `Bearer ${req.session.user.accessToken}`
                    }
                });
                
                return res.json(profileResponse.data);
            } catch (apiError) {
                console.warn('France Travail API not available, using session data');
            }
        }
        
        // Si l'API n'est pas disponible ou retourne une erreur, retourner les infos de session
        res.json({
            id: req.session.user.id,
            name: req.session.user.name,
            email: req.session.user.email
        });
    } catch (error) {
        next(error);
    }
});

// Add error handling middleware at the end
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Export app for testing
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Serveur démarré sur le port ${PORT}`);
        console.log(`URL locale: http://localhost:${PORT}`);
        console.log(`Callback URL: ${FRANCETRAVAIL_REDIRECT_URI}`);
    });
}

module.exports = app;


