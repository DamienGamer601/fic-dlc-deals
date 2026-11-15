# fic-dlc-deals (version GitHub Actions)

Récupère les DLC **ETS2** et **ATS** en promo sur Steam (prix France) toutes les 3 heures et les enregistre dans `data/ets2.json` et `data/ats.json`. Le bot FIC sur **BotGhost** lit ces fichiers et poste le message Components V2.

Il n'y a ni serveur ni Render : tout tourne gratuitement sur GitHub.

## 1. Mise en place sur GitHub

1. Crée un repo **public** `DamienGamer601/fic-dlc-deals`, puis pousse ce dossier (dossier `.github` compris).
2. Va dans l'onglet **Actions**, active les workflows si GitHub le demande, ouvre **Promos DLC Steam** et clique sur **Run workflow**.
3. Après environ 30 secondes, vérifie dans le navigateur :
   `https://raw.githubusercontent.com/DamienGamer601/fic-dlc-deals/main/data/ets2.json`

Le repo doit être public pour que BotGhost puisse lire le fichier sans clé (il ne contient que des prix Steam).

## 2. Configuration dans BotGhost

Crée un **Timed Event** (par exemple tous les jours à 19 h) avec ces blocs :

1. **Send an API Request**
   - Nom : `dlc_ets2`
   - Méthode : `GET`
   - URL : `https://raw.githubusercontent.com/DamienGamer601/fic-dlc-deals/main/data/ets2.json`
2. **Condition** (facultatif) : `{dlc_ets2.response.has_deals}` égal à `true`
3. **Send or Edit a Message** : colle `botghost/message-ets2.json`.

Refais la même chose avec `dlc_ats`, le fichier `data/ats.json` et `botghost/message-ats.json`.

> Les variables sont écrites sous la forme `{dlc_ets2.response.text_escaped}`. Si le sélecteur de variables de BotGhost les affiche autrement, remplace-les par ce qu'il propose. Utilise bien les champs `_escaped`, sinon les retours à la ligne cassent le JSON.

Le mieux est d'utiliser **Edit a Message** sur un message fixe du salon : le panel reste à jour sans spam.

## Réglages

- **Ne garder que les grosses promos :** dans `.github/workflows/deals.yml`, remplace `MIN_PCT: "1"` par `MIN_PCT: "50"`.
- **Changer la fréquence :** modifie la ligne `cron` (heure UTC). GitHub peut décaler les tâches planifiées de quelques minutes.
- **Mises à jour sans changement :** le fichier n'est réécrit que si les promos ont changé, ce qui évite les commits inutiles.

## À savoir

- GitHub désactive les tâches planifiées d'un repo public **inactif depuis 60 jours**. Si ça arrive, GitHub envoie un mail : il suffit de cliquer sur **Enable workflow** dans l'onglet Actions.
- `raw.githubusercontent.com` garde les fichiers en cache environ 5 minutes. Ce n'est pas gênant pour un post quotidien.

## Test en local (cmd.exe)

```
cd C:\Users\damie\fic-dlc-deals
node generate.js
```
