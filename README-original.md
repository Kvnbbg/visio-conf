# Visio-Conf MVP - Application de Vidéoconférence avec Authentification France Travail

Une application de vidéoconférence moderne intégrant l'authentification OAuth 2.0 de France Travail et la technologie ZEGOCLOUD pour les appels vidéo.

## 🚀 Fonctionnalités

- **Authentification sécurisée** : OAuth 2.0 avec PKCE via France Travail
- **Vidéoconférence** : Intégration ZEGOCLOUD pour des appels vidéo de haute qualité
- **Interface moderne** : Interface utilisateur responsive avec React et Tailwind CSS
- **Sécurité renforcée** : Gestion des sessions, validation des tokens, rate limiting
- **Architecture modulaire** : Code organisé en modules réutilisables
- **Tests complets** : Suite de tests unitaires et d'intégration

## 📋 Prérequis

- Node.js 14+ 
- Compte ZEGOCLOUD (pour les tokens de vidéoconférence)
- Compte développeur France Travail (pour l'authentification OAuth)

## 🛠️ Installation

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd visio-conf-mvp
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration de l'environnement**
   ```bash
   cp env.example .env
   ```
   
   Modifier le fichier `.env` avec vos vraies valeurs :
   ```env
   # Configuration ZEGOCLOUD
   ZEGOCLOUD_APP_ID=your_zegocloud_app_id
   ZEGOCLOUD_SERVER_SECRET=your_zegocloud_server_secret
   
   # Configuration France Travail OAuth
   FRANCETRAVAIL_CLIENT_ID=your_francetravail_client_id
   FRANCETRAVAIL_CLIENT_SECRET=your_francetravail_client_secret
   FRANCETRAVAIL_REDIRECT_URI=http://localhost:3000/auth/francetravail/callback
   
   # Configuration de session
   SESSION_SECRET=your_secure_session_secret
   
   # Configuration de l'application
   PORT=3000
   NODE_ENV=development
   ```

## 🚀 Démarrage

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 🧪 Tests

### Exécuter tous les tests
```bash
npm test
```

### Tests en mode watch
```bash
npm run test:watch
```

### Couverture de code
```bash
npm run test:coverage
```

## 📁 Structure du projet

```
visio-conf-mvp/
├── lib/                    # Modules réutilisables
│   ├── auth.js            # Gestion OAuth 2.0 / PKCE
│   ├── zegoToken.js       # Génération tokens ZEGOCLOUD
│   └── middleware.js      # Middlewares Express
├── tests/                 # Tests unitaires et d'intégration
│   ├── auth.test.js
│   ├── zegoToken.test.js
│   ├── server.test.js
│   └── integration.test.js
├── server.js              # Serveur Express principal
├── index.html             # Interface utilisateur React
├── package.json           # Configuration npm
├── .env                   # Variables d'environnement
└── README.md             # Documentation
```

## 🔧 API Endpoints

### Authentification
- `GET /auth/francetravail/login` - Initie l'authentification France Travail
- `GET /auth/francetravail/callback` - Callback OAuth 2.0
- `GET /api/auth/status` - Vérifie le statut d'authentification
- `POST /api/auth/logout` - Déconnexion

### Vidéoconférence
- `POST /api/generate-token` - Génère un token ZEGOCLOUD pour rejoindre une réunion
- `GET /api/user/profile` - Récupère le profil utilisateur

### Utilitaires
- `GET /health` - Health check de l'application

## 🔐 Sécurité

### Authentification OAuth 2.0 avec PKCE
- Utilisation du flow OAuth 2.0 avec PKCE (Proof Key for Code Exchange)
- Validation des paramètres `state` pour prévenir les attaques CSRF
- Gestion sécurisée des tokens d'accès et de rafraîchissement

### Sécurité des sessions
- Sessions chiffrées avec secret configurable
- Expiration automatique des sessions
- Protection contre les attaques de fixation de session

### Protection des API
- Rate limiting (100 requêtes par 15 minutes par défaut)
- Validation des paramètres d'entrée
- Gestion centralisée des erreurs
- Logs de sécurité

## 🏗️ Architecture

### Modules principaux

#### `lib/auth.js`
Gestion de l'authentification OAuth 2.0 :
- Génération des paramètres PKCE
- Construction des URLs d'autorisation
- Échange de code contre token
- Décodage des tokens JWT

#### `lib/zegoToken.js`
Génération des tokens ZEGOCLOUD :
- Validation des paramètres
- Génération de tokens sécurisés
- Vérification d'expiration

#### `lib/middleware.js`
Middlewares Express :
- Authentification requise
- Validation des requêtes
- Gestion d'erreurs
- Rate limiting
- Logging

### Flow d'authentification

1. **Initiation** : L'utilisateur clique sur "Se connecter avec France Travail"
2. **Redirection** : Redirection vers France Travail avec paramètres PKCE
3. **Autorisation** : L'utilisateur autorise l'application
4. **Callback** : France Travail redirige vers l'application avec un code
5. **Échange** : L'application échange le code contre un token d'accès
6. **Session** : Création d'une session utilisateur sécurisée

### Flow de vidéoconférence

1. **Authentification** : Vérification que l'utilisateur est connecté
2. **Saisie** : L'utilisateur saisit l'ID de la réunion
3. **Token** : Génération d'un token ZEGOCLOUD sécurisé
4. **Connexion** : Initialisation de l'interface ZEGOCLOUD
5. **Réunion** : Participation à la vidéoconférence

## 🔧 Configuration avancée

### Variables d'environnement

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `ZEGOCLOUD_APP_ID` | ID de l'application ZEGOCLOUD | `demo_app_id` |
| `ZEGOCLOUD_SERVER_SECRET` | Secret serveur ZEGOCLOUD | `demo_server_secret` |
| `FRANCETRAVAIL_CLIENT_ID` | ID client France Travail | `demo_client_id` |
| `FRANCETRAVAIL_CLIENT_SECRET` | Secret client France Travail | `demo_client_secret` |
| `FRANCETRAVAIL_REDIRECT_URI` | URI de redirection OAuth | `http://localhost:3000/auth/francetravail/callback` |
| `SESSION_SECRET` | Secret pour les sessions | `demo_session_secret` |
| `PORT` | Port du serveur | `3000` |
| `NODE_ENV` | Environnement d'exécution | `development` |

### Personnalisation du rate limiting

```javascript
// Dans server.js
app.use(rateLimit(200, 10 * 60 * 1000)); // 200 requêtes par 10 minutes
```

### Configuration des sessions

```javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS en production
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));
```

## 🚀 Déploiement

### Déploiement sur Vercel

1. Installer Vercel CLI : `npm i -g vercel`
2. Configurer les variables d'environnement dans Vercel
3. Déployer : `vercel --prod`

### Déploiement sur Heroku

1. Créer une application Heroku
2. Configurer les variables d'environnement
3. Déployer via Git

### Variables d'environnement de production

⚠️ **Important** : En production, utilisez des valeurs sécurisées :
- `SESSION_SECRET` : Générez une clé aléatoire forte
- `ZEGOCLOUD_*` : Utilisez vos vraies clés ZEGOCLOUD
- `FRANCETRAVAIL_*` : Utilisez vos vraies clés France Travail
- `NODE_ENV=production`

## 🐛 Dépannage

### Erreurs courantes

#### "Authentification requise"
- Vérifiez que l'utilisateur est bien connecté
- Vérifiez la configuration des sessions

#### "Erreur lors de la génération du token"
- Vérifiez les paramètres ZEGOCLOUD
- Vérifiez que roomID et userID sont fournis

#### "State invalide"
- Problème de session ou attaque CSRF potentielle
- Vérifiez la configuration des sessions

### Logs de débogage

En mode développement, les logs détaillés sont activés :
```bash
NODE_ENV=development npm start
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation France Travail
- Consulter la documentation ZEGOCLOUD

## 🔄 Changelog

### Version 1.0.0
- Authentification OAuth 2.0 avec France Travail
- Intégration ZEGOCLOUD pour la vidéoconférence
- Interface utilisateur React responsive
- Architecture modulaire et tests complets
- Sécurité renforcée avec rate limiting et validation