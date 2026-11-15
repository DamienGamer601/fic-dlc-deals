// Récupération des DLC en promo depuis Steam (aucune clé API nécessaire)
const GAMES = {
  ets2: { appid: 227300, title: 'Euro Truck Simulator 2', short: 'ETS2' },
  ats:  { appid: 270880, title: 'American Truck Simulator', short: 'ATS' },
};

const CC = 'FR';
const LANG = 'french';
const MAX_TEXT = 3300; // Components V2 : 4000 caractères max pour tout le message

const eur = (cents) =>
  (Number(cents) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
    .replace(/ | /g, ' ');

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'fic-dlc-deals/1.0' } });
  if (!res.ok) throw new Error(`Steam HTTP ${res.status} sur ${url.split('?')[0]}`);
  return res.json();
}

async function getDlcIds(appid) {
  const data = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=${CC}&l=${LANG}`);
  const entry = data?.[appid];
  if (!entry?.success) throw new Error(`appdetails a échoué pour ${appid}`);
  return entry.data.dlc || [];
}

async function getItems(appids) {
  const out = [];
  for (let i = 0; i < appids.length; i += 50) {
    const input = {
      ids: appids.slice(i, i + 50).map((appid) => ({ appid })),
      context: { language: LANG, country_code: CC, steam_realm: 1 },
      data_request: { include_basic_info: false },
    };
    const url = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=' +
      encodeURIComponent(JSON.stringify(input));
    const data = await getJson(url);
    out.push(...(data?.response?.store_items || []));
  }
  return out;
}

// Échappe une chaîne pour l'insérer DANS une chaîne JSON (sans les guillemets autour)
const jsonEscape = (s) => JSON.stringify(s).slice(1, -1);

// Nettoie le markdown Discord dans les noms ([ ] cassent les liens)
const cleanName = (name, gameTitle) =>
  name.replace(new RegExp('^' + gameTitle + '\\s*[-–:]\\s*'), '')
      .replace(/[\[\]]/g, '')
      .trim();

async function buildDeals(key, minPct = 1) {
  const game = GAMES[key];
  if (!game) throw new Error('Jeu inconnu');

  const ids = await getDlcIds(game.appid);
  const items = await getItems([game.appid, ...ids]);

  let totalFinal = 0, totalOriginal = 0;
  const deals = [];

  for (const it of items) {
    const opt = it.best_purchase_option;
    if (!it.success || !it.visible || !opt || opt.final_price_in_cents == null) continue;
    const final = Number(opt.final_price_in_cents);
    const original = Number(opt.original_price_in_cents || opt.final_price_in_cents);
    if (it.appid !== game.appid) { totalFinal += final; totalOriginal += original; }
    if (!opt.discount_pct || opt.discount_pct < minPct) continue;

    const end = (opt.active_discounts || [])
      .map((d) => Number(d.discount_end_date)).filter(Boolean).sort((a, b) => a - b)[0] || null;

    deals.push({
      appid: it.appid,
      name: it.appid === game.appid ? game.title : cleanName(it.name, game.title),
      pct: opt.discount_pct,
      final, original, end,
      url: `https://s.team/a/${it.appid}`,
      isBase: it.appid === game.appid,
    });
  }

  // Jeu de base en premier, puis plus grosse réduction, puis nom
  deals.sort((a, b) => (b.isBase - a.isBase) || (b.pct - a.pct) || a.name.localeCompare(b.name, 'fr'));

  // Si toutes les promos finissent en même temps, on affiche la date une seule fois
  const endDates = [...new Set(deals.map((d) => d.end).filter(Boolean))];
  const commonEnd = endDates.length === 1 ? endDates[0] : null;

  const lines = [];
  let length = 0, hidden = 0;
  for (const d of deals) {
    const icon = d.pct >= 50 ? '🔥' : '🏷️';
    const ends = d.end && !commonEnd ? ` · fin <t:${d.end}:R>` : '';
    const line = `${icon} **-${d.pct}%** [${d.name}](${d.url}) **${eur(d.final)}** ~~${eur(d.original)}~~${ends}`;
    if (length + line.length + 1 > MAX_TEXT) { hidden++; continue; }
    lines.push(line); length += line.length + 1;
  }
  if (hidden) lines.push(`-# … et ${hidden} autre(s) promo(s) sur Steam`);

  const text = deals.length
    ? lines.join('\n')
    : `Aucun DLC ${game.short} en promo pour le moment.`;

  const saved = totalOriginal - totalFinal;
  const summary = totalOriginal
    ? `**Tous les DLC ${game.short} (${ids.length})** : ${eur(totalFinal)} au lieu de ${eur(totalOriginal)}` +
      (saved > 0 ? ` · tu économises ${eur(saved)} (${Math.round((saved / totalOriginal) * 100)} %)` : '')
    : '';

  const title = `## 🚛 Promos DLC ${game.short}\n` +
    (deals.length
      ? `**${deals.length}** promo(s) · jusqu'à **-${Math.max(...deals.map((d) => d.pct))}%**` +
        (commonEnd ? ` · fin <t:${commonEnd}:R> (<t:${commonEnd}:f>)` : '')
      : 'Pas de promo en cours');
  const steam_url = `https://store.steampowered.com/dlc/${game.appid}/`;

  return {
    game: game.short,
    has_deals: deals.length > 0 ? 'true' : 'false',
    count: deals.length,
    max_discount: deals.reduce((m, d) => Math.max(m, d.pct), 0),
    title, text, summary, steam_url,
    // Versions prêtes à coller dans le JSON BotGhost (guillemets et retours à la ligne échappés)
    title_escaped: jsonEscape(title),
    text_escaped: jsonEscape(text),
    summary_escaped: jsonEscape(summary),
    updated: Math.floor(Date.now() / 1000),
    deals,
  };
}

module.exports = { GAMES, buildDeals };
