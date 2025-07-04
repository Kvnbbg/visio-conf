# Visio-Conf - Application de Vidéoconférence Connectée à une API

## Aperçu

**Visio-Conf** est une application de vidéoconférence simple et rapide à déployer, conçue pour intégrer des communications vidéo et audio en temps réel en s'appuyant sur le SDK de [ZEGOCLOUD](https://www.zegocloud.com/). Cette application utilise l'UI Kit préconstruit de ZEGOCLOUD pour minimiser le temps de développement, offrant des fonctionnalités essentielles comme rejoindre une réunion, activer/désactiver la caméra et le micro, et partager l'écran. Le projet utilise **React** pour le frontend, **Node.js/Express** pour un backend minimal (génération de tokens), et **Vercel** pour un déploiement rapide.

Cette application suit les meilleures pratiques modernes pour le développement d'applications, avec une architecture simple, une séparation des préoccupations, et une approche axée sur la rapidité de mise en œuvre.

## Fonctionnalités principales

- **Rejoindre une réunion** : Entrez un ID de réunion et un nom d'utilisateur pour rejoindre une vidéoconférence.
- **Contrôles de base** : Activer/désactiver la caméra et le micro, partager l'écran via l'UI Kit de ZEGOCLOUD.
- **Interface réactive** : Design minimaliste avec Tailwind CSS, adapté aux mobiles et desktops.
- **Déploiement rapide** : Intégration avec Vercel pour un déploiement automatisé avec CI/CD.
- **Backend minimal** : Génération sécurisée de tokens pour l'authentification ZEGOCLOUD.

## Prérequis

- **Node.js** (version >= 14)
- Compte [ZEGOCLOUD](https://www.zegocloud.com/) pour obtenir `APP_ID` et `SERVER_SECRET`
- Compte [Vercel](https://vercel.com/) pour le déploiement
- Compte GitHub pour gérer le dépôt
- Connaissance de base en React et JavaScript/TypeScript

## Installation et configuration

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/kvnbbg/visio-conf.git
   cd visio-conf
   ```

2. **Installer les dépendances du backend** :
   ```bash
   npm install
   ```

3. **Configurer ZEGOCLOUD** :
   - Inscrivez-vous sur [ZEGOCLOUD](https://www.zegocloud.com/) et créez un projet.
   - Récupérez votre `APP_ID` et `SERVER_SECRET` depuis le tableau de bord ZEGOCLOUD.
   - Ajoutez ces informations dans le fichier `server.js` :
     ```javascript
     const APP_ID = 'VOTRE_APP_ID'; // Remplacez par votre APP_ID
     const SERVER_SECRET = 'VOTRE_SERVER_SECRET'; // Remplacez par votre SERVER_SECRET
     ```

4. **Lancer le backend localement** (pour tester) :
   ```bash
   npm start
   ```

5. **Tester l'application localement** :
   - Ouvrez `index.html` dans un navigateur (nécessite un serveur local pour les appels API, par exemple, utilisez `npx serve`).
   - Alternativement, déployez sur Vercel pour tester l'application complète.

## Déploiement sur Vercel

1. **Créer un dépôt GitHub** :
   - Poussez le projet vers un dépôt GitHub (`kvnbbg/visio-conf`).

2. **Configurer Vercel** :
   - Connectez-vous à [Vercel](https://vercel.com/) et importez le dépôt.
   - Pour le frontend, spécifiez `index.html` comme fichier principal.
   - Pour le backend, assurez-vous que le fichier `vercel.json` est présent pour router les requêtes API vers `server.js`.

3. **Déployer** :
   - Cliquez sur "Deploy" dans Vercel. Le CI/CD automatisé construira et déploiera l'application.
   - Une fois déployé, accédez à l'URL fournie par Vercel, entrez un ID de réunion (par exemple, "room123") et un nom d'utilisateur, puis cliquez sur "Rejoindre".

## Structure du projet

```
visio-conf/
├── index.html         # Application React avec l'UI Kit ZEGOCLOUD
├── server.js          # Backend Node.js/Express pour la génération de tokens
├── package.json       # Dépendances et scripts du backend
├── vercel.json        # Configuration Vercel pour le déploiement
└── README.md          # Ce fichier
```

## Contribuer au projet

Pour contribuer rapidement à **Visio-Conf**, suivez ces étapes :

### Prérequis pour contribuer
- Familiarité avec **React**, **JavaScript/TypeScript**, et **Node.js**.
- Compréhension des API REST et des SDK de vidéoconférence.
- Accès au dépôt GitHub pour soumettre des pull requests.

### Étapes pour contribuer
1. **Forker le dépôt** :
   - Créez une fork du dépôt `kvnbbg/visio-conf` sur GitHub.
   - Clonez votre fork localement :
     ```bash
     git clone https://github.com/kvnbbg/visio-conf.git
     ```

2. **Créer une branche** :
   - Créez une branche pour votre fonctionnalité ou correction :
     ```bash
     git checkout -b feature/nouvelle-fonctionnalite
     ```

3. **Développer** :
   - **Frontend** : Modifiez `index.html` pour ajouter des composants React ou améliorer l'UI avec Tailwind CSS.
   - **Backend** : Ajoutez des endpoints dans `server.js` si nécessaire (par exemple, gestion de salles supplémentaires).
   - **Nouvelles fonctionnalités** : Intégrez des fonctionnalités comme le chat, les notifications push, ou l'observabilité avec Firebase Analytics.
   - Utilisez l'UI Kit de ZEGOCLOUD pour ajouter des fonctionnalités comme l'enregistrement de réunions ou la gestion avancée des participants.

4. **Tester** :
   - Testez localement avec `npm start` pour le backend et un serveur local pour le frontend.
   - Assurez-vous que les nouvelles fonctionnalités respectent les principes d'accessibilité (WCAG) et de sécurité (validation des entrées, chiffrement).

5. **Soumettre une Pull Request** :
   - Poussez vos modifications vers votre fork :
     ```bash
     git push origin feature/nouvelle-fonctionnalite
     ```
   - Créez une pull request vers le dépôt principal avec une description claire des changements.

### Bonnes pratiques pour contribuer
- **Focus sur la simplicité** : Priorisez les fonctionnalités essentielles (MoSCoW : Must have > Should have > Could have).
- **Séparation des préoccupations** : Gardez la logique UI dans `index.html`, la logique métier dans des composants React séparés, et la logique serveur dans `server.js`.
- **Tests** : Ajoutez des tests unitaires (par exemple, avec Jest pour React) pour les nouveaux composants.
- **Accessibilité** : Assurez-vous que les nouvelles fonctionnalités respectent les ratios de contraste WCAG (4.5:1 pour le texte normal) et sont compatibles avec les lecteurs d'écran.
- **Documentation** : Mettez à jour ce README ou ajoutez des commentaires dans le code pour documenter les nouvelles fonctionnalités.

## Fonctionnalités futures suggérées

- **Chat intégré** : Ajouter un module de chat textuel avec l'UI Kit ZEGOCLOUD.
- **Observabilité** : Intégrer Firebase Analytics ou OpenTelemetry pour suivre les métriques utilisateur et techniques.
- **Authentification avancée** : Implémenter l'authentification biométrique ou sans mot de passe.
- **Support hors ligne** : Ajouter une gestion basique des états hors ligne avec un cache local.
- **Personnalisation UI** : Ajouter des thèmes sombre/clair ou des options de personnalisation pour les utilisateurs.

## Ressources utiles

- [Documentation ZEGOCLOUD](https://www.zegocloud.com/docs) : Guide pour l'UI Kit et le SDK.
- [Documentation Vercel](https://vercel.com/docs) : Instructions pour le déploiement.
- [Tailwind CSS](https://tailwindcss.com/docs) : Référence pour le style de l'interface.
- [React](https://reactjs.org/docs) : Documentation pour le développement frontend.

## Licence

Ce projet est sous licence Mozilla. Consultez le fichier `LICENSE` pour plus de détails.
