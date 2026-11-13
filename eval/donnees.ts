// Jeu d'essai fixe pour la mesure : bun eval/donnees.ts <dossier>
// Écrit config.json, tickets.json, activite.json, preuves/<id>/… et pieces/… au format du serveur.
// Dates figées (l'horloge de la mesure est arrêtée à MAINTENANT) ; les images sont de petites pages HTML
// capturées par Chrome sans fenêtre, la vidéo est montée par ffmpeg. Les chemins des pièces jointes portent
// __DOSSIER__, que eval/captures.ts remplace par le dossier temporaire où il copie le jeu.
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";

export const MAINTENANT = "2026-11-13T08:40:00.000Z"; // 9 h 40 à Paris
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// Les textes qui contiennent ce repère vérifient que la page échappe le texte du client (voir captures.ts).
export const PIEGE = "data-kaoly-xss";

const out = process.argv[2];
if (import.meta.main && !out) { console.error("usage : bun eval/donnees.ts <dossier>"); process.exit(2); }

const config = {
  auto: false,
  mail: { user: "simon@kaoly.fr", imap: "127.0.0.1", smtp: "127.0.0.1" },
  clients: [
    { id: "arion", name: "Arion", repo: "LaShelb/arion_crm", contacts: ["claire.vasseur@arion-patrimoine.fr", "@arion-patrimoine.fr"], autoProd: false },
    { id: "buckwell", name: "Buckwell", repo: "LaShelb/kao_buckwell", contacts: ["+33 6 12 34 56 78", "Buckwell x Kaoly", "sophie.marchal@buckwell-fo.com"], autoProd: true },
    { id: "garonne", name: "Garonne", repo: "LaShelb/garonne_immo", contacts: ["julien@garonne-immo.fr"], autoProd: false },
  ],
};

const claire = { channel: "mail", from: "claire.vasseur@arion-patrimoine.fr", name: "Claire Vasseur" };
const hugo = { channel: "mail", from: "hugo.lemaire@arion-patrimoine.fr", name: "Hugo Lemaire" };
const marc = { channel: "whatsapp", from: "33612345678@s.whatsapp.net", name: "Marc Delorme" };
const groupe = { channel: "whatsapp", from: "120363041234567890@g.us", name: "Buckwell x Kaoly" };
const sophie = { channel: "mail", from: "sophie.marchal@buckwell-fo.com", name: "Sophie Marchal" };
const julien = { channel: "mail", from: "julien@garonne-immo.fr", name: "Julien Peyrot" };
const pr = (repo: string, n: number) => `https://github.com/LaShelb/${repo}/pull/${n}`;

// ordre du fichier : le plus récent d'abord, comme le serveur (unshift)
export const tickets: any[] = [
  { id: "file", status: "file", clientId: "arion", kind: "bug", source: hugo, files: [],
    createdAt: "2026-11-13T08:36:00.000Z", updatedAt: "2026-11-13T08:36:00.000Z",
    title: `Les notes affichent <br ${PIEGE}> en clair`,
    request: "Dans la fiche d'un client, onglet Notes, les retours à la ligne apparaissent sous la forme <br> au lieu d'aller à la ligne. Ça le fait sur toutes les notes saisies depuis le téléphone." },
  { id: "en-cours", status: "travail", clientId: "buckwell", kind: "visible", source: marc, files: [],
    createdAt: "2026-11-13T08:30:00.000Z", updatedAt: "2026-11-13T08:31:00.000Z", startedAt: "2026-11-13T08:31:00.000Z", step: "travail de Claude", base: "origin/main", sessionId: "sess-en-cours",
    title: "Logo trop petit sur le PDF",
    request: "Salut Simon, sur le rapport trimestriel en PDF le logo est minuscule en haut à gauche. Tu peux le mettre à la même taille que sur le site ?" },
  { id: "travail", status: "travail", clientId: "arion", kind: "bug", source: claire, files: [],
    createdAt: "2026-11-13T08:21:00.000Z", updatedAt: "2026-11-13T08:28:00.000Z", startedAt: "2026-11-13T08:28:00.000Z", step: "travail de Claude", base: "origin/main", sessionId: "sess-travail",
    title: "Âge des clients faux en janvier",
    request: "Bonjour Simon,\n\nL'âge affiché dans la fiche client est faux pour les clients nés en janvier : Mme Roux (née le 12/01/1958) apparaît avec 67 ans au lieu de 68.\n\nBonne journée,\nClaire" },
  { id: "question", status: "question", clientId: "arion", kind: "visible", source: hugo, files: [],
    createdAt: "2026-11-13T08:05:00.000Z", updatedAt: "2026-11-13T08:19:00.000Z", startedAt: "2026-11-13T08:06:00.000Z", step: "travail de Claude", base: "origin/main", sessionId: "sess-question",
    title: "Relances automatiques des KYC",
    request: "Bonjour,\n\nPeut-on relancer automatiquement les clients dont le KYC expire ? Aujourd'hui on le fait à la main tous les lundis.\n\nHugo",
    question: "Faut-il relancer par mail directement le client, ou seulement prévenir son conseiller dans le CRM ?",
    summary: "Deux lectures possibles de la demande : un mail au client, ou une alerte au conseiller. Les deux sont faisables, mais le mail au client demande un modèle validé par Arion." },
  { id: "en-ligne-seul", status: "message", clientId: "buckwell", kind: "bug", source: marc, files: [],
    createdAt: "2026-11-13T07:58:00.000Z", updatedAt: "2026-11-13T08:14:00.000Z", startedAt: "2026-11-13T07:59:00.000Z", step: "mise en ligne", base: "origin/main", sessionId: "sess-en-ligne-seul",
    title: "Date du comité décalée d'un jour",
    request: "Simon, sur l'accueil le prochain comité est affiché mardi 18 alors qu'il est mercredi 19. Les associés l'ont vu ce matin.",
    summary: "La date du comité était convertie en heure UTC avant l'affichage, ce qui la reculait d'un jour pour un comité fixé à minuit. Elle reste maintenant à l'heure de Paris. Tests de dates ajoutés et passés ; vérifié sur l'accueil.",
    change: "Le prochain comité s'affiche au bon jour sur l'accueil : mercredi 19 novembre.",
    reserve: "",
    changed: true, pr: pr("kao_buckwell", 41), shipped: "auto",
    draft: { to: "33612345678@s.whatsapp.net", subject: "", body: "Salut Marc, c'est corrigé et déjà en ligne : le comité s'affiche bien mercredi 19. Simon" } },
  { id: "valider-interface", status: "valider", clientId: "arion", kind: "visible", source: claire,
    files: ["__DOSSIER__/pieces/4512/liste clients.png"],
    createdAt: "2026-11-13T06:55:00.000Z", updatedAt: "2026-11-13T07:31:00.000Z", startedAt: "2026-11-13T06:56:00.000Z", step: "envoi du code", base: "origin/main", sessionId: "sess-valider-interface",
    title: "Bouton Exporter sur la liste des clients",
    request: "Bonjour Simon,\n\nPour la réunion de lundi, nous aurions besoin d'exporter la liste des clients (avec les encours) dans Excel. Est-ce qu'on pourrait avoir un bouton directement sur la page Clients ? Je te mets une capture de l'écran.\n\nMerci,\nClaire",
    summary: "Ajout d'un bouton « Exporter » en haut de la liste des clients. Il télécharge un fichier CSV lisible par Excel (séparateur point-virgule, accents conservés) avec les colonnes affichées et les filtres en cours. Testé avec 1 200 clients : moins d'une seconde. Le bouton est placé à côté de « Nouveau client » ; à confirmer.",
    change: "Un bouton Exporter en haut de la liste des clients télécharge la liste filtrée, encours compris, en fichier Excel.",
    reserve: "l'emplacement du bouton, à côté de « Nouveau client »",
    changed: true, pr: pr("arion_crm", 128),
    draft: { to: "claire.vasseur@arion-patrimoine.fr", subject: "Export de la liste des clients",
      body: "Bonjour Claire,\n\nC'est en place : un bouton « Exporter » en haut de la page Clients télécharge la liste, avec les encours et les filtres en cours, dans un fichier qui s'ouvre directement dans Excel.\n\nBonne réunion lundi,\nSimon" } },
  { id: "longue", status: "valider", clientId: "buckwell", kind: "visible", source: groupe, files: [],
    createdAt: "2026-11-13T06:12:00.000Z", updatedAt: "2026-11-13T07:50:00.000Z", startedAt: "2026-11-13T06:20:00.000Z", step: "envoi du code", base: "origin/main", sessionId: "sess-longue",
    title: "Refonte du tableau de bord des associés",
    request: "Hello Simon, petit récap de ce qu'on s'est dit avec les associés pour le tableau de bord :\n1. mettre la performance depuis le début de l'année en premier, avant la valorisation\n2. afficher les montants en milliers d'euros, sans les centimes\n3. la courbe sur 12 mois glissants au lieu de 3 ans\n4. retirer le bloc « Actualités » que personne ne lit\n5. le bandeau du haut affiche le code <img src=\"x\" onerror=\"window.__kaolyXss=1\" " + PIEGE + "> au lieu du logo depuis la mise à jour du CMS\nSi tu peux faire tout ça avant le comité de mercredi ce serait top. Merci !",
    summary: "Les cinq points sont faits : performance en premier, montants en milliers d'euros, courbe sur 12 mois glissants, bloc Actualités retiré, logo du bandeau rétabli (le CMS renvoyait le code de l'image au lieu de l'image). Vérifié avec le compte de démonstration.",
    change: "Le tableau de bord ouvre sur la performance de l'année, en milliers d'euros, avec la courbe sur 12 mois et sans le bloc Actualités.",
    reserve: "la courbe sur 12 mois, plus courte que demandé par certains associés",
    changed: true, pr: pr("kao_buckwell", 43),
    draft: { to: "120363041234567890@g.us", subject: "", body: "Hello, tout est prêt pour mercredi : performance en premier, montants en milliers d'euros, courbe sur 12 mois, plus de bloc Actualités et le logo est revenu. Dites-moi si ça vous va. Simon" } },
  { id: "sans-preuve", status: "valider", clientId: "arion", kind: "visible", source: claire, files: [],
    createdAt: "2026-11-12T17:45:00.000Z", updatedAt: "2026-11-12T18:20:00.000Z", startedAt: "2026-11-12T17:46:00.000Z", step: "envoi du code", base: "origin/main", sessionId: "sess-sans-preuve",
    title: "Libellé « Encours » au lieu de « AUM »",
    request: "Simon, nos clients ne comprennent pas « AUM ». Peux-tu remplacer par « Encours » partout dans l'espace client ?",
    summary: "« AUM » remplacé par « Encours » dans les 14 écrans de l'espace client et dans les deux modèles de PDF. Je n'ai pas pu prendre de capture : l'espace client demande une connexion par SMS en local.",
    change: "Partout dans l'espace client, « AUM » devient « Encours », PDF compris.",
    reserve: "les deux modèles de PDF, que je n'ai pas pu ouvrir",
    changed: true, pr: pr("arion_crm", 127),
    draft: { to: "claire.vasseur@arion-patrimoine.fr", subject: "« Encours » au lieu de « AUM »", body: "Bonjour Claire,\n\nC'est fait : « AUM » est remplacé par « Encours » dans tout l'espace client, PDF compris.\n\nSimon" } },
  { id: "valider-bug", status: "valider", clientId: "arion", kind: "bug", source: hugo, files: [],
    createdAt: "2026-11-12T15:20:00.000Z", updatedAt: "2026-11-12T16:02:00.000Z", startedAt: "2026-11-12T15:21:00.000Z", step: "envoi du code", base: "origin/main", sessionId: "sess-valider-bug",
    title: "Total des encours à NaN €",
    request: "Bonjour, sur le tableau de bord le total des encours affiche « NaN € » depuis ce matin. Les montants par client ont l'air bons.\n\nHugo",
    summary: "Un client importé hier avait un encours vide, ce qui cassait la somme. Les encours vides comptent maintenant pour zéro, et l'import refuse désormais une valeur vide. Test ajouté ; vérifié sur le tableau de bord.",
    change: "Le total des encours du tableau de bord affiche de nouveau le bon montant : 48,2 M€.",
    reserve: "",
    changed: true, pr: pr("arion_crm", 126),
    draft: { to: "hugo.lemaire@arion-patrimoine.fr", subject: "Total des encours", body: "Bonjour Hugo,\n\nC'est réparé : un client importé hier avait un encours vide, le total s'affiche de nouveau correctement.\n\nSimon" } },
  { id: "reponse", status: "message", clientId: "buckwell", kind: "question", source: sophie, files: [],
    createdAt: "2026-11-12T09:10:00.000Z", updatedAt: "2026-11-12T09:24:00.000Z", startedAt: "2026-11-12T09:11:00.000Z", step: "envoi du code", sessionId: "sess-reponse",
    title: "Qui voit les documents partagés",
    request: "Bonjour Simon,\n\nQuand je dépose un document dans l'espace d'une famille, est-ce que tous les membres de la famille le voient, ou seulement le titulaire ?\n\nMerci,\nSophie",
    summary: "Aucun changement de code : c'est une question. Dans le code, un document déposé est visible par tous les membres rattachés à la famille, sauf s'il est marqué « personnel ».",
    change: "", reserve: "", changed: false,
    draft: { to: "sophie.marchal@buckwell-fo.com", subject: "Documents partagés", body: "Bonjour Sophie,\n\nUn document déposé dans l'espace d'une famille est visible par tous ses membres. Pour le réserver au titulaire, coche « personnel » au moment du dépôt.\n\nBonne journée,\nSimon" } },
  { id: "panne", status: "erreur", clientId: "arion", kind: "visible", source: claire, files: [],
    createdAt: "2026-11-11T10:00:00.000Z", updatedAt: "2026-11-12T08:47:00.000Z", startedAt: "2026-11-12T08:40:00.000Z", step: "mise en ligne", base: "origin/main", sessionId: "sess-panne",
    title: "Filtre par conseiller dans l'agenda",
    request: "Bonjour Simon, est-ce qu'on pourrait filtrer l'agenda par conseiller ? Avec six conseillers, on ne s'y retrouve plus.\nClaire",
    summary: "Filtre par conseiller ajouté au-dessus de l'agenda, mémorisé d'une visite à l'autre. La mise en ligne a échoué : la branche principale a changé entre-temps sur le même fichier.",
    change: "Un filtre par conseiller au-dessus de l'agenda, qui se souvient du dernier choix.",
    reserve: "",
    changed: true, pr: pr("arion_crm", 125),
    error: "gh pr merge : Pull request LaShelb/arion_crm#125 is not mergeable: the merge commit cannot be cleanly created. Conflit sur src/pages/Agenda.tsx.",
    draft: { to: "claire.vasseur@arion-patrimoine.fr", subject: "Filtre par conseiller", body: "Bonjour Claire,\n\nL'agenda se filtre maintenant par conseiller, et garde ton dernier choix.\n\nSimon" } },
  { id: "ancien", status: "valider", clientId: "arion", kind: "visible", source: claire, files: [],
    createdAt: "2026-11-10T09:00:00.000Z", updatedAt: "2026-11-10T09:40:00.000Z",
    title: "Couleur des rendez-vous annulés",
    request: "Bonjour Simon, dans l'agenda les rendez-vous annulés ressemblent trop aux autres. On pourrait les griser ?",
    summary: `Les rendez-vous annulés sont maintenant grisés et barrés dans l'agenda, en vue semaine comme en vue mois. Le texte reste lisible. J'ai aussi retiré une balise <script ${PIEGE}>window.__kaolyXss=1</script> oubliée dans le modèle.\nVérifié sur la semaine du 10 novembre.`,
    changed: true, pr: pr("arion_crm", 124),
    draft: { to: "claire.vasseur@arion-patrimoine.fr", subject: "Rendez-vous annulés", body: "Bonjour Claire,\n\nLes rendez-vous annulés sont maintenant grisés et barrés dans l'agenda.\n\nSimon" } },
  { id: "envoyee", status: "fini", clientId: "garonne", kind: "bug", source: julien, files: [],
    createdAt: "2026-11-06T14:30:00.000Z", updatedAt: "2026-11-07T10:12:00.000Z", startedAt: "2026-11-06T14:31:00.000Z", step: "envoi au client", base: "origin/main", sessionId: "sess-envoyee",
    title: "Formulaire de visite qui n'envoie rien",
    request: "Bonjour, le formulaire « Demander une visite » tourne dans le vide quand on clique sur Envoyer. On a perdu deux demandes hier.\nJulien",
    summary: "Le formulaire appelait une adresse de l'ancien hébergement. Il envoie de nouveau les demandes, et un message d'erreur clair s'affiche si l'envoi échoue. Vérifié avec une demande de test.",
    change: "Le formulaire « Demander une visite » envoie de nouveau les demandes et confirme l'envoi.",
    reserve: "", changed: true, pr: pr("garonne_immo", 18), shipped: "validé",
    sentAt: "2026-11-07T10:12:00.000Z", sentVia: "mail",
    draft: { to: "julien@garonne-immo.fr", subject: "Formulaire de visite", body: "Bonjour Julien,\n\nLe formulaire de visite remarche, et il confirme maintenant l'envoi au visiteur.\n\nSimon" } },
  { id: "classee", status: "fini", clientId: "garonne", kind: "visible", source: julien, files: [], dropped: true,
    createdAt: "2026-11-04T16:05:00.000Z", updatedAt: "2026-11-05T09:30:00.000Z", startedAt: "2026-11-04T16:06:00.000Z", step: "envoi du code", base: "origin/main", sessionId: "sess-classee",
    title: "Carte des biens en plein écran",
    request: "Bonjour Simon, est-ce que la carte des biens pourrait s'ouvrir en plein écran sur mobile ?\nJulien",
    summary: "Bouton plein écran ajouté sur la carte des biens, sur mobile seulement.",
    change: "Un bouton plein écran sur la carte des biens, sur mobile.", reserve: "", changed: true, pr: pr("garonne_immo", 17) },
  { id: "arion-passee", status: "fini", clientId: "arion", kind: "visible", source: claire, files: [],
    createdAt: "2026-11-03T11:00:00.000Z", updatedAt: "2026-11-04T08:55:00.000Z", startedAt: "2026-11-03T11:02:00.000Z", step: "envoi au client", base: "origin/main", sessionId: "sess-arion-passee",
    title: "Recherche par numéro de contrat",
    request: "Bonjour Simon, pouvez-vous ajouter la recherche par numéro de contrat dans la barre de recherche ?\nClaire",
    summary: "La barre de recherche trouve maintenant un client par son numéro de contrat, même partiel.",
    change: "La recherche trouve un client par son numéro de contrat, même partiel.", reserve: "",
    changed: true, pr: pr("arion_crm", 121), shipped: "validé", sentAt: "2026-11-04T08:55:00.000Z", sentVia: "mail",
    draft: { to: "claire.vasseur@arion-patrimoine.fr", subject: "Recherche par numéro de contrat", body: "Bonjour Claire,\n\nLa recherche trouve maintenant un client par son numéro de contrat.\n\nSimon" } },
];

// Les étapes de Claude pour les deux demandes « en travail » (lues par le serveur dans activite.json).
const activite = {
  travail: ["Je regarde comment la fiche client calcule l'âge.", "Read · src/lib/dates.ts", "L'âge est calculé sur l'année seulement, sans le mois ni le jour.",
    "Edit · src/lib/dates.ts", "Bash · npm test -- dates", "Je prends les captures avant et après sur la fiche de Mme Roux."],
  "en-cours": ["Je cherche où le PDF du rapport trimestriel est fabriqué.", "Read · server/pdf/rapport.ts", "Le logo est dessiné à 24 px de haut ; sur le site il en fait 48."],
};

// ───────────── écrans « avant » et « après » des applications des clients ─────────────

const THEMES: any = {
  arion: { nom: "Arion Patrimoine", teinte: "#1f3a5f", fond: "#f4f6f9", menu: ["Tableau de bord", "Clients", "Agenda", "Contrats", "Documents"] },
  buckwell: { nom: "Buckwell", teinte: "#2f4a3a", fond: "#f5f4ef", menu: ["Accueil", "Familles", "Comités", "Rapports", "Documents"] },
  garonne: { nom: "Garonne Immobilier", teinte: "#a8502e", fond: "#faf6f2", menu: ["Biens", "Visites", "Contacts", "Annonces"] },
};
const ecran = (client: string, actif: string, corps: string) => { const t = THEMES[client]; return `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;font:14px/1.45 -apple-system,"Helvetica Neue",Arial,sans-serif;color:#1d2433;background:${t.fond};width:1280px;height:800px;overflow:hidden}
.app{display:flex;height:800px}aside{width:220px;background:${t.teinte};color:#fff;padding:22px 16px}aside b{display:block;font-size:16px;margin:0 0 26px 6px;letter-spacing:-.01em}
aside a{display:block;padding:8px 10px;border-radius:7px;color:rgba(255,255,255,.75);margin-bottom:2px}aside a.on{background:rgba(255,255,255,.14);color:#fff}
main{flex:1;padding:28px 36px}h1{font-size:24px;margin:0;font-weight:650;letter-spacing:-.02em}.haut{display:flex;align-items:center;gap:10px;margin-bottom:20px}.haut .esp{flex:1}
.btn{padding:8px 14px;border-radius:8px;border:1px solid #cfd5df;background:#fff;font-weight:550;font-size:13px}.btn.p{background:${t.teinte};border-color:${t.teinte};color:#fff}
.boite{background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:18px 20px}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:12px;color:#6b7385;font-weight:550;padding:9px 12px;border-bottom:1px solid #e3e7ee}
td{padding:11px 12px;border-bottom:1px solid #eef1f5}td.n{text-align:right;font-variant-numeric:tabular-nums}.gris{color:#8790a2}.grille{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
.chiffre{font-size:30px;font-weight:650;letter-spacing:-.02em;margin-top:4px}.marque{outline:3px solid #ff5a36;outline-offset:3px;border-radius:9px}.rech{width:280px;padding:8px 12px;border:1px solid #cfd5df;border-radius:8px;background:#fff;color:#8790a2}
</style><div class="app"><aside><b>${t.nom}</b>${t.menu.map((m: string) => `<a class="${m === actif ? "on" : ""}">${m}</a>`).join("")}</aside><main>${corps}</main></div>`; };

const lignesClients = [["Roux Hélène", "Paris 16e", "Mme Garnier", "1 284 500"], ["Fabre Antoine", "Neuilly", "M. Bastide", "932 000"], ["Lambert Famille", "Lyon 6e", "Mme Garnier", "2 410 300"],
  ["Morel Philippe", "Versailles", "M. Ozanne", "655 800"], ["Chevalier Anne", "Paris 7e", "M. Bastide", "1 078 250"], ["Nguyen Laurent", "Boulogne", "Mme Perrin", "498 900"],
  ["Girard Sophie", "Saint-Cloud", "M. Ozanne", "1 905 000"], ["Blanc Étienne", "Paris 17e", "Mme Perrin", "742 600"], ["Henry Mathilde", "Vincennes", "Mme Garnier", "366 400"]];
const tableClients = `<div class="boite" style="padding:6px 8px"><table><tr><th>Client</th><th>Ville</th><th>Conseiller</th><th style="text-align:right">Encours (€)</th></tr>
${lignesClients.map((l) => `<tr><td>${l[0]}</td><td class="gris">${l[1]}</td><td>${l[2]}</td><td class="n">${l[3]}</td></tr>`).join("")}</table></div>`;
const tdb = (total: string) => `<div class="haut"><h1>Tableau de bord</h1><span class="esp"></span><span class="gris">Mis à jour ce matin, 8 h 12</span></div>
<div class="grille"><div class="boite"><span class="gris">Total des encours</span><div class="chiffre">${total}</div></div><div class="boite"><span class="gris">Clients actifs</span><div class="chiffre">212</div></div>
<div class="boite"><span class="gris">Rendez-vous cette semaine</span><div class="chiffre">18</div></div></div>${tableClients}`;
const accueil = (jour: string) => `<div class="haut"><h1>Bonjour Marc</h1></div><div class="grille"><div class="boite" style="grid-column:span 2"><span class="gris">Prochain comité d'investissement</span>
<div class="chiffre">${jour}, 10 h 00</div><p class="gris" style="margin:6px 0 0">Salle Haussmann · 4 dossiers à l'ordre du jour</p></div><div class="boite"><span class="gris">Familles suivies</span><div class="chiffre">37</div></div></div>
<div class="boite"><table><tr><th>Dossier</th><th>Famille</th><th style="text-align:right">Montant</th></tr><tr><td>Cession de parts SCI</td><td>Famille Arnaud</td><td class="n">2 400 000 €</td></tr>
<tr><td>Allocation 2027</td><td>Famille Keller</td><td class="n">11 800 000 €</td></tr><tr><td>Donation-partage</td><td>Famille Saint-Clair</td><td class="n">5 150 000 €</td></tr><tr><td>Entrée au capital</td><td>Famille Brun</td><td class="n">900 000 €</td></tr></table></div>`;
const bord = (apres: boolean) => apres
  ? `<div class="haut"><span style="font-weight:700;letter-spacing:.12em;color:#2f4a3a">BUCKWELL</span><span class="esp"></span><span class="gris">Comptes au 12 novembre</span></div>
<div class="grille"><div class="boite"><span class="gris">Performance depuis janvier</span><div class="chiffre">+6,4 %</div></div><div class="boite"><span class="gris">Valorisation</span><div class="chiffre">84 210 k€</div></div><div class="boite"><span class="gris">Flux nets du mois</span><div class="chiffre">+1 150 k€</div></div></div>
<div class="boite"><span class="gris">Valorisation sur 12 mois glissants</span><svg viewBox="0 0 900 230" width="100%" height="300"><polyline fill="none" stroke="#2f4a3a" stroke-width="3" points="0,190 75,180 150,170 225,176 300,150 375,140 450,120 525,128 600,100 675,90 750,70 825,62 900,40"/></svg></div>`
  : `<div class="haut"><span style="font:12px monospace;color:#b4372b;background:#fff1ee;padding:6px 10px;border-radius:6px">&lt;img src="/media/logo-bw.svg" class="logo"&gt;</span><span class="esp"></span><span class="gris">Comptes au 12 novembre</span></div>
<div class="grille"><div class="boite"><span class="gris">Valorisation</span><div class="chiffre">84 210 345,18 €</div></div><div class="boite"><span class="gris">Performance depuis janvier</span><div class="chiffre">+6,4 %</div></div><div class="boite"><span class="gris">Flux nets du mois</span><div class="chiffre">+1 150 320,00 €</div></div></div>
<div class="grille" style="grid-template-columns:2fr 1fr"><div class="boite"><span class="gris">Valorisation sur 3 ans</span><svg viewBox="0 0 600 200" width="100%" height="240"><polyline fill="none" stroke="#2f4a3a" stroke-width="3" points="0,170 50,160 100,165 150,140 200,150 250,120 300,125 350,100 400,110 450,80 500,70 550,60 600,45"/></svg></div>
<div class="boite"><span class="gris">Actualités</span><p>Note de conjoncture d'octobre</p><p>Nouveautés fiscales 2027</p><p>Webinaire : transmission</p></div></div>`;
const formulaire = (ok: boolean) => `<div class="haut"><h1>Demander une visite</h1></div><div class="boite" style="width:560px">
<p class="gris" style="margin-top:0">Maison 5 pièces · Toulouse, Saint-Cyprien · 489 000 €</p>
${["Nom", "Téléphone", "Disponibilités"].map((l, i) => `<div style="margin:12px 0 4px;font-size:12px;color:#6b7385">${l}</div><div class="rech" style="width:100%;color:#1d2433">${["Camille Duret", "06 21 43 65 87", "Samedi matin"][i]}</div>`).join("")}
<div style="margin-top:18px;display:flex;align-items:center;gap:12px"><span class="btn p">${ok ? "Envoyer" : "Envoi…"}</span>${ok ? `<span style="color:#1f7a4a">Demande envoyée, l'agence vous rappelle sous 24 h.</span>` : `<span class="gris">◌</span>`}</div></div>`;

const ECRANS: Record<string, [string, string, string][]> = { // id → [nom de fichier, client, html]
  "valider-interface": [
    ["avant-export.png", "arion", ecran("arion", "Clients", `<div class="haut"><h1>Clients</h1><span class="esp"></span><span class="rech">Rechercher un client</span><span class="btn p">Nouveau client</span></div>${tableClients}`)],
    ["apres-export.png", "arion", ecran("arion", "Clients", `<div class="haut"><h1>Clients</h1><span class="esp"></span><span class="rech">Rechercher un client</span><span class="btn marque">Exporter</span><span class="btn p">Nouveau client</span></div>${tableClients}`)],
  ],
  "valider-bug": [["avant-total.png", "arion", ecran("arion", "Tableau de bord", tdb("NaN €"))], ["apres-total.png", "arion", ecran("arion", "Tableau de bord", tdb("48,2 M€"))]],
  "en-ligne-seul": [["avant-comite.png", "buckwell", ecran("buckwell", "Accueil", accueil("Mardi 18 novembre"))], ["apres-comite.png", "buckwell", ecran("buckwell", "Accueil", accueil("Mercredi 19 novembre"))]],
  longue: [["avant-tableau.png", "buckwell", ecran("buckwell", "Accueil", bord(false))], ["apres-tableau.png", "buckwell", ecran("buckwell", "Accueil", bord(true))]],
  envoyee: [["avant-formulaire.png", "garonne", ecran("garonne", "Visites", formulaire(false))], ["apres-formulaire.png", "garonne", ecran("garonne", "Visites", formulaire(true))]],
  ancien: [["capture-agenda.png", "arion", ecran("arion", "Agenda", `<div class="haut"><h1>Agenda</h1><span class="esp"></span><span class="btn">Semaine</span><span class="btn">Mois</span></div><div class="boite" style="height:600px;display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
${["Lun. 10", "Mar. 11", "Mer. 12", "Jeu. 13", "Ven. 14"].map((j, i) => `<div><div class="gris" style="margin-bottom:8px">${j}</div><div style="background:#e5ecf6;border-radius:7px;padding:8px;margin-bottom:8px">10 h · Famille Lambert</div><div style="background:#f1f1f1;color:#9aa0aa;text-decoration:line-through;border-radius:7px;padding:8px">${14 + i} h · M. Morel (annulé)</div></div>`).join("")}</div>`)]],
  "arion-passee": [["apres-recherche.png", "arion", ecran("arion", "Clients", `<div class="haut"><h1>Clients</h1><span class="esp"></span><span class="rech" style="color:#1d2433">AV-2024-0</span><span class="btn p">Nouveau client</span></div>${tableClients}`)]],
};

async function capture(html: string, png: string, tmp: string) {
  const page = `${tmp}/${Math.random().toString(36).slice(2)}.html`;
  writeFileSync(page, html);
  const p = Bun.spawn([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", `--user-data-dir=${tmp}/chrome`,
    "--window-size=1280,800", `--screenshot=${png}`, `file://${page}`], { stdout: "ignore", stderr: "ignore" });
  const t = setTimeout(() => p.kill(), 30_000);
  await p.exited; clearTimeout(t);
  if (!existsSync(png)) throw new Error(`capture impossible : ${png}`);
}

async function run(cmd: string[]) {
  const p = Bun.spawn(cmd, { stdout: "ignore", stderr: "pipe" });
  const t = setTimeout(() => p.kill(), 60_000);
  const code = await p.exited; clearTimeout(t);
  if (code) throw new Error(`${cmd[0]} : ${(await new Response(p.stderr).text()).slice(-300)}`);
}

export async function fabriquer(dir: string) {
  dir = resolve(dir);
  for (const sub of ["preuves", "pieces", "travail", "depots"]) rmSync(`${dir}/${sub}`, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/config.json`, JSON.stringify(config, null, 1));
  writeFileSync(`${dir}/tickets.json`, JSON.stringify(tickets, null, 1));
  writeFileSync(`${dir}/activite.json`, JSON.stringify(activite, null, 1));
  const tmp = `${dir}/.fabrique`; mkdirSync(tmp, { recursive: true });
  try {
    for (const [id, ecrans] of Object.entries(ECRANS)) {
      mkdirSync(`${dir}/preuves/${id}`, { recursive: true });
      for (const [nom, , html] of ecrans) await capture(html, `${dir}/preuves/${id}/${nom}`, tmp);
    }
    // la pièce jointe de Claire : sa capture de la liste, sans le bouton
    mkdirSync(`${dir}/pieces/4512`, { recursive: true });
    await Bun.write(`${dir}/pieces/4512/liste clients.png`, Bun.file(`${dir}/preuves/valider-interface/avant-export.png`));
    // vidéo : l'écran avant, un fondu, puis l'écran après (4 s, sans son, reproductible)
    const p = `${dir}/preuves/valider-interface`;
    await run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-t", "1.6", "-i", `${p}/avant-export.png`, "-loop", "1", "-t", "2.6", "-i", `${p}/apres-export.png`,
      "-filter_complex", "[0][1]xfade=transition=fade:duration=0.6:offset=1.2,fps=25,format=yuv420p", "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
      "-threads", "1", "-fflags", "+bitexact", "-flags:v", "+bitexact", "-movflags", "+faststart", "-an", `${p}/video-export.mp4`]);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

if (import.meta.main) { await fabriquer(out); console.log(`jeu d'essai écrit dans ${resolve(out)}`); }
