// Génère data/ets2.json et data/ats.json (lancé par GitHub Actions)
const fs = require('fs');
const path = require('path');
const { GAMES, buildDeals } = require('./steam');

const MIN = Number(process.env.MIN_PCT) || 1; // ex. 50 pour ne garder que les -50 % et plus

(async () => {
  let failed = false;
  for (const key of Object.keys(GAMES)) {
    const file = path.join(__dirname, 'data', `${key}.json`);
    try {
      const { deals, ...data } = await buildDeals(key, MIN);
      // On ne réécrit le fichier que si le contenu a changé (évite les commits inutiles)
      let old = null;
      try { old = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
      if (old && old.text === data.text && old.title === data.title && old.summary === data.summary) {
        console.log(`${key} : inchangé`);
        continue;
      }
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`${key} : ${data.count} promo(s) écrite(s)`);
    } catch (err) {
      console.error(`${key} : erreur ->`, err.message);
      failed = true; // on garde l'ancien fichier
    }
  }
  if (failed) process.exitCode = 1;
})();
