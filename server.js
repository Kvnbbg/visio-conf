const express = require('express');
const app = express();
const crypto = require('crypto');

app.use(express.json());

// Configuration ZEGOCLOUD (remplacez par vos identifiants)
const APP_ID = YOUR_ZEGOCLOUD_APP_ID; // Obtenir depuis le tableau de bord ZEGOCLOUD
const SERVER_SECRET = 'YOUR_ZEGOCLOUD_SERVER_SECRET'; // Obtenir depuis le tableau de bord ZEGOCLOUD

app.post('/api/generate-token', (req, res) => {
  const { roomID, userID } = req.body;

  if (!roomID || !userID) {
    return res.status(400).json({ error: 'roomID et userID sont requis' });
  }

  // Générer un token ZEGOCLOUD
  const effectiveTimeInSeconds = 3600; // Validité du token (1 heure)
  const payload = '';
  const nonce = Math.floor(Math.random() * 1000000);
  const timestamp = Math.floor(Date.now() / 1000);

  const hash = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(`${APP_ID}${timestamp}${nonce}${payload}`)
    .digest('base64');

  const token = `04${Buffer.from(
    JSON.stringify({
      app_id: APP_ID,
      user_id: userID,
      room_id: roomID,
      privilege: {
        1: 1, // login room
        2: 1, // publish stream
      },
      expired_ts: timestamp + effectiveTimeInSeconds,
      nonce,
      payload,
    })
  ).toString('base64')}.${hash}`;

  res.json({ token });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
