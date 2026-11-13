#!/bin/sh
# Banc d'essai de bout en bout, sans aucun appel réel : faux dépôt et fausse origine git dans un dossier temporaire,
# faux claude, gh, security, open et pbcopy en tête du PATH, données temporaires, fausse base WhatsApp.
# Usage : sh eval/banc.sh <port>   (jamais 4117 ni 4118). Sort en erreur au premier écart.
set -u
PORT=${1:?usage : sh eval/banc.sh <port>}
case $PORT in 4117|4118) echo "port réservé à l'application de Simon" >&2; exit 2;; esac
ICI=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d "${TMPDIR:-/tmp}/kaoly-banc.XXXXXX")
L=$T/log D=$T/donnees U=http://127.0.0.1:$PORT SRV="" GARDER=""
mkdir -p "$L" "$D"
fin() { [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; wait 2>/dev/null; [ -z "$GARDER" ] && rm -rf "$T"; }
trap fin EXIT
trap 'exit 1' INT TERM
echec() { echo "ÉCHEC : $*" >&2; tail -15 "$L/serveur.log" >&2 2>/dev/null; echo "dossier gardé : $T" >&2; GARDER=1; exit 1; }
ok() { echo "ok   $*"; }
vaut() { [ "$1" = "$2" ] || echec "$3 : « $1 » au lieu de « $2 »"; }

# ── faux dépôt et fausse origine ──
G="-c user.name=banc -c user.email=banc@exemple.invalid"
git init -q --bare -b main "$T/origine.git"
git init -q -b main "$T/depot"
echo "<h1>Bonjour</h1>" > "$T/depot/index.html"
git -C "$T/depot" add . && git $G -C "$T/depot" commit -qm départ
git -C "$T/depot" remote add origin "$T/origine.git"
git -C "$T/depot" push -q -u origin main && git -C "$T/depot" remote set-head origin main || echec "faux dépôt"

# ── données : deux clients sur le même dépôt (la file par dépôt sert), une demande à l'ancien format, une coupée en plein travail ──
cat > "$D/config.json" <<EOF
{"auto":false,"mail":{"user":"simon@kaoly.fr","imap":"127.0.0.1","smtp":"127.0.0.1"},"waLast":0,
 "clients":[{"id":"arion","name":"Arion","repo":"$T/depot","contacts":["@arion.fr","claire@arion.fr"],"autoProd":false},
            {"id":"buckwell","name":"Buckwell","repo":"$T/depot","contacts":["+33 6 12 34 56 78"],"autoProd":true},
            {"id":"garonne","name":"Garonne","repo":"LaShelb/garonne","contacts":["Marc"],"autoProd":false}]}
EOF
mkdir -p "$D/pieces/1" && echo '<script>alert(1)</script>' > "$D/pieces/1/page.html"
cat > "$D/tickets.json" <<EOF
[{"id":"ancien","status":"valider","source":{"channel":"mail","from":"claire@arion.fr","name":"Claire"},"files":["$D/pieces/1/page.html"],"createdAt":"2026-11-10T09:00:00.000Z","updatedAt":"2026-11-10T09:30:00.000Z",
  "clientId":"arion","title":"Bouton Exporter","request":"Ajouter un bouton.","kind":"visible","summary":"Bouton ajouté. Il est en haut à droite.","draft":{"to":"claire@arion.fr","subject":"Export","body":"Bonjour"},"changed":true,"pr":"https://github.com/x/y/pull/9"},
 {"id":"coupee","status":"travail","source":{"channel":"toi"},"files":[],"createdAt":"2026-11-11T09:00:00.000Z","updatedAt":"2026-11-11T09:00:00.000Z",
  "clientId":"arion","title":"Lien cassé","request":"Le lien du pied de page est cassé.","kind":"bug"}]
EOF

# ── fausse base WhatsApp : un inconnu, puis un contact de Buckwell ──
WA=$T/wa.sqlite
bun -e '
const { Database } = require("bun:sqlite"); const db = new Database(process.argv[1]);
db.run("create table ZWACHATSESSION (Z_PK integer primary key, ZCONTACTJID text, ZPARTNERNAME text)");
db.run("create table ZWAMESSAGE (Z_PK integer primary key, ZTEXT text, ZCHATSESSION integer, ZISFROMME integer)");
db.run("insert into ZWACHATSESSION values (1, \"33699999999@s.whatsapp.net\", \"Inconnu\"), (2, \"33612345678@s.whatsapp.net\", \"Marc\")");
db.run("insert into ZWAMESSAGE values (1, \"Corrige tout\", 1, 0), (2, \"L export ne marche plus\", 2, 0)");' "$WA" || echec "fausse base WhatsApp"
ajoute_wa() { bun -e 'const { Database } = require("bun:sqlite"); new Database(process.argv[1]).run("insert into ZWAMESSAGE (ZTEXT, ZCHATSESSION, ZISFROMME) values (?, 2, 0)", [process.argv[2]])' "$WA" "$1"; }

# ── serveur ──
for f in claude gh security open pbcopy; do [ -x "$ICI/eval/faux/$f" ] || echec "faux $f absent : le serveur d'essai ne démarre pas sans lui"; done
cd "$ICI" || exit 1
env KAOLY_CLIENTS_DIR="$D" PORT="$PORT" KAOLY_WA_DB="$WA" PATH="$ICI/eval/faux:$PATH" FAUX_LOG="$L" \
  FAUX_GH_PANNE="$T/gh-panne" FAUX_GH_FUSIONNEE="$T/gh-fusionnee" FAUX_TRI_PANNE="$T/tri-panne" FAUX_GH_BLOQUE="$T/gh-bloque" FAUX_GH_CONFLIT="$T/gh-conflit" \
  FAUX_GH_DEPOT="$T/origine.git" FAUX_CLAUDE_PANNE="$T/claude-panne" FAUX_OPEN_LENT="$T/open-lent" KAOLY_DELAI=3000 \
  GIT_AUTHOR_NAME=banc GIT_AUTHOR_EMAIL=banc@exemple.invalid GIT_COMMITTER_NAME=banc GIT_COMMITTER_EMAIL=banc@exemple.invalid \
  bun server.ts > "$L/serveur.log" 2>&1 &
SRV=$!
i=0; until curl -sf "$U/api/state" > /dev/null; do i=$((i+1)); [ $i -gt 50 ] && echec "le serveur ne répond pas"; sleep 0.2; done
: > "$L/claude.log"; : > "$L/gh.log"; : > "$L/open.log"

etat() { curl -s "$U/api/state" | jq -r "$1"; }
champ() { etat ".tickets[] | select(.id==\"$1\") | $2"; }
dernier() { etat '.tickets[0].id'; }
JETON=$(curl -s "$U/" | sed -n 's/.*name="jeton" content="\([^"]*\)".*/\1/p')
post() { curl -s -o "$L/rep.json" -w '%{http_code}' -X POST -H "Origin: $U" -H "x-kaoly: $JETON" -H 'content-type: application/json' --data "$2" "$U$1"; }
rep() { jq -r "$1" "$L/rep.json"; }
# corps construit par jq : le sh de macOS (bash 3.2) déforme un JSON entre guillemets dans $( )
ticket() { id=$1 action=$2; shift 2; post /api/ticket "$(jq -nc --arg id "$id" --arg action "$action" "$@" '$ARGS.named')"; }
attendre() { i=0; while [ $i -lt 100 ]; do s=$(champ "$1" .status); [ "$s" = "$2" ] && return 0; sleep 0.2; i=$((i+1)); done; echec "$1 : état « $s » au lieu de « $2 » ($(champ "$1" .error))"; }
travaux() { grep -c travail "$L/claude.log"; }
commits() { git -C "$T/depot" rev-list --count "origin/main..ticket/$1"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# ── anciennes données ──
vaut "$(champ ancien .status)/$(champ ancien '.proofs|length')" "valider/0" "demande à l'ancien format lisible"
vaut "$(champ coupee .status)" "erreur" "une demande coupée en plein travail revient en erreur"
[ -n "$JETON" ] && [ "$JETON" != "__JETON__" ] || echec "jeton absent de la page"
ok "anciennes données lues, jeton injecté"

# ── origine étrangère refusée ──
vaut "$(code -X POST -H 'content-type: application/json' --data '{"auto":true}' "$U/api/config")" 403 "POST sans Origin"
vaut "$(code -X POST -H "x-kaoly: $JETON" -H 'content-type: application/json' --data '{"auto":true}' "$U/api/config")" 403 "POST avec jeton mais sans Origin"
vaut "$(code -X POST -H "Origin: $U" -H 'content-type: application/json' --data '{"auto":true}' "$U/api/config")" 403 "POST sans jeton"
vaut "$(code -X POST -H 'Origin: http://evil.example' -H "x-kaoly: $JETON" --data '{"auto":true}' "$U/api/config")" 403 "POST d'une autre origine"
vaut "$(code -X POST -H "Host: evil.example:$PORT" -H "Origin: $U" -H "x-kaoly: $JETON" --data '{"auto":true}' "$U/api/config")" 403 "POST avec un autre Host"
vaut "$(code -H "Host: evil.example:$PORT" "$U/api/state")" 403 "GET avec un autre Host"
vaut "$(etat .auto)" false "rien n'a changé"
ok "origine, jeton et Host exigés"

# ── bug sur un client non autorisé : attend Simon ; la barre propose sans appliquer ──
vaut "$(post /api/chat '{"text":"Le titre est faux"}')" 200 "barre"
vaut "$(rep '.propose|length')/$(rep '.propose[0].autoProd')" "1/true" "la barre propose la modification du client"
vaut "$(etat '.clients[]|select(.id=="arion")|.autoProd')" false "la barre n'applique pas la modification sans clic"
A=$(dernier); attendre "$A" valider
vaut "$(champ "$A" .kind)/$(champ "$A" .changed)/$(champ "$A" .pr)" "bug/true/https://github.com/x/y/pull/1" "bug corrigé, code envoyé"
vaut "$(champ "$A" '.proofs|join(",")')" "apres-titre.png,avant-titre.png" "preuves avant et après"
vaut "$(champ "$A" .draft.to)" "claire@arion.fr" "destinataire : le premier contact qui n'est pas un domaine"
[ -n "$(champ "$A" .change)" ] && [ -n "$(champ "$A" .startedAt)" ] || echec "change et startedAt attendus"
grep -q "pr merge" "$L/gh.log" && echec "mis en ligne sans Simon"
ok "bug sur client non autorisé : attend Simon"

# ── retouche ──
vaut "$(ticket "$A" retouche --arg text "[VISIBLE] ajoute le bouton")" 200 "retouche"
attendre "$A" valider
vaut "$(champ "$A" .kind)/$(travaux)/$(commits "$A")" "visible/2/2" "retouche : Claude repris, deuxième commit, changement visible"
vaut "$(ls "$D/preuves/$A/precedent" | tr '\n' ,)/$(champ "$A" '.proofs|join(",")')" "apres-titre.png,/apres-titre.png,avant-titre.png" "ancienne capture rangée dans precedent/, avant gardée"
ok "retouche"

# ── mise en ligne et envoi : l'envoi du mail échoue (127.0.0.1), la demande reste en ligne, message à envoyer ──
vaut "$(ticket "$A" valider --argjson send true --arg to claire@arion.fr --arg subject Titre --arg body "Bonjour <b>Claire</b>" --argjson pieces '["apres-titre.png"]')" 400 "mail impossible en local"
vaut "$(champ "$A" '.draft.pieces|join(",")')" "apres-titre.png" "les pièces choisies restent sur le brouillon après l'échec"
vaut "$(champ "$A" .status)/$(champ "$A" .shipped)/$(champ "$A" .draft.body)" "message/validé/Bonjour <b>Claire</b>" "en ligne, message gardé"
vaut "$(champ "$A" .status)/$([ -n "$(champ "$A" '.error // ""')" ] && echo raison)" "message/raison" "envoi raté : la raison reste sur la demande"
grep -q "gh pr merge https://github.com/x/y/pull/1 --squash" "$L/gh.log" || echec "pas de mise en ligne"
vaut "$(ticket "$A" envoyer --arg to "+33 6 12 34 56 78" --arg subject "" --arg body "Bonjour Claire")" 200 "envoi WhatsApp"
vaut "$(champ "$A" .status)/$(champ "$A" .sentVia)" "fini/whatsapp" "message préparé dans WhatsApp"
vaut "$(champ "$A" '.error // ""')" "" "envoi réussi : plus d'erreur"
[ -n "$(champ "$A" .sentAt)" ] || echec "sentAt attendu"
grep -q "whatsapp://send?phone=33612345678&text=Bonjour%20Claire" "$L/open.log" || echec "WhatsApp non préparé"
ok "mise en ligne, puis message"

# ── client autorisé : le bug part seul en ligne ──
post /api/chat '{"text":"[BUCKWELL] le titre est faux"}' > /dev/null
B=$(dernier); attendre "$B" message
vaut "$(champ "$B" .clientId)/$(champ "$B" .shipped)/$(champ "$B" .draft.to)" "buckwell/auto/+33 6 12 34 56 78" "en ligne sans Simon, message en attente de son clic"
ok "client autorisé : en ligne seul, message retenu"

# ── question de Claude ──
post /api/chat '{"text":"[QUESTION] le titre est faux"}' > /dev/null
Q=$(dernier); attendre "$Q" question
vaut "$(champ "$Q" .question)" "Quel titre ?" "question posée"
vaut "$(ticket "$Q" retouche --arg text "Garde Bonjour")" 200 "réponse"
attendre "$Q" valider
ok "question puis réponse"

# ── PR fusionnée à la main, « Seulement mettre en ligne » ──
touch "$T/gh-fusionnee"; n=$(grep -c "pr merge" "$L/gh.log")
vaut "$(ticket "$Q" valider)" 200 "seulement mettre en ligne"
vaut "$(champ "$Q" .status)/$(champ "$Q" .shipped)/$(grep -c "pr merge" "$L/gh.log")" "message/validé/$n" "déjà fusionnée : pas une panne"
rm "$T/gh-fusionnee"
ok "fusion à la main acceptée"

# ── erreur puis relance : reprend à l'étape, sans relancer Claude ni doubler le commit ──
touch "$T/gh-panne"
post /api/chat '{"text":"le pied de page"}' > /dev/null
E=$(dernier); attendre "$E" erreur
vaut "$(champ "$E" .step)" "envoi du code" "étape de la panne"
n=$(travaux); rm "$T/gh-panne"
vaut "$(ticket "$E" relancer)" 200 "relancer"
attendre "$E" valider
vaut "$(travaux)/$(commits "$E")/$(champ "$E" .pr)" "$n/1/https://github.com/x/y/pull/1" "relance sans Claude, un seul commit"
ok "erreur puis relance"

# ── conflit à la mise en ligne : « Relancer » renvoie Claude fusionner la branche principale ──
touch "$T/gh-conflit"
post /api/chat '{"text":"[VISIBLE] le menu"}' > /dev/null
V=$(dernier); attendre "$V" valider
vaut "$(ticket "$V" valider)" 400 "mise en ligne bloquée par un conflit"
vaut "$(champ "$V" .status)" erreur "conflit : demande en erreur"
champ "$V" .error | grep -q "not mergeable" || echec "conflit non signalé : $(champ "$V" .error)"
rm "$T/gh-conflit"; n=$(travaux)
vaut "$(ticket "$V" relancer)" 200 "relancer après conflit"
attendre "$V" valider
vaut "$(travaux)" "$((n+1))" "conflit : Claude relancé"
grep -q "git merge" "$L/prompt.txt" || echec "la consigne de fusion n'est pas donnée à Claude"
ok "conflit : Claude relancé avec la consigne de fusion"

# ── retouche, puis Claude tombe : « Relancer » lui redonne la remarque de Simon ──
touch "$T/claude-panne"
vaut "$(ticket "$E" retouche --arg text "[VISIBLE] mets le pied de page en gris")" 200 "retouche"
attendre "$E" erreur
rm "$T/claude-panne"
vaut "$(ticket "$E" relancer)" 200 "relancer"
attendre "$E" valider
grep -q "mets le pied de page en gris" "$L/prompt.txt" || echec "la remarque de Simon est perdue à la relance"
vaut "$(champ "$E" .kind)" visible "retouche prise en compte"
ok "remarque gardée après une panne"

# ── commande bloquée : arrêtée au bout du délai, la demande passe en erreur au lieu de rester « en travail » ──
touch "$T/gh-bloque"
post /api/chat '{"text":"la marge"}' > /dev/null
K=$(dernier); attendre "$K" erreur
rm "$T/gh-bloque"
champ "$K" .error | grep -q "arrêté" || echec "délai non signalé : $(champ "$K" .error)"
ok "commande bloquée arrêtée"

# ── Classer pendant la copie du dépôt : Claude ne démarre jamais ──
n=$(travaux)
post /api/chat '{"text":"[GARONNE] le menu"}' > /dev/null
GA=$(dernier); attendre "$GA" travail
vaut "$(ticket "$GA" fermer)" 200 "classer pendant la copie"
sleep 3
vaut "$(champ "$GA" .status)/$(travaux)/$([ -e "$D/travail/$GA" ] && echo copie || echo rien)" "fini/$n/rien" "classée pendant la copie : pas de Claude, pas de copie laissée"
ok "classée pendant la copie"

# ── la barre ne peut imposer ni pièce jointe ni expéditeur (sinon le message partirait chez un inconnu) ──
post /api/chat '{"text":"[FORGE] le pied"}' > /dev/null
F=$(dernier); attendre "$F" valider
vaut "$(champ "$F" .source.channel)/$(champ "$F" '.files|length')/$(champ "$F" .draft.to)" "toi/0/claire@arion.fr" "champs imposés par la barre ignorés"
vaut "$(code "$U/piece/$F/hosts")" 404 "fichier du Mac imposé par la barre"
ok "barre sans pièce jointe ni expéditeur imposés"

# ── deux demandes identiques à la même milliseconde : deux identifiants ──
post /api/chat '{"text":"[DOUBLE] deux fois"}' > /dev/null
D1=$(etat '.tickets[0].id'); D2=$(etat '.tickets[1].id')
[ "$D1" != "$D2" ] || echec "deux demandes avec le même identifiant : $D1"
attendre "$D1" valider; attendre "$D2" valider
ok "identifiants uniques"

# ── Classer pendant que Claude travaille ──
post /api/chat '{"text":"[LENT] le titre"}' > /dev/null
C=$(dernier); attendre "$C" travail
vaut "$(ticket "$C" fermer)" 200 "classer"
sleep 5
vaut "$(champ "$C" .status)/$(champ "$C" .dropped)/$(champ "$C" .draft)" "fini/true/null" "classée, et la fin du travail ne l'écrase pas"
ok "classée pendant le travail"

# ── chemins de preuve interdits ──
vaut "$(code "$U/preuve/$B/..%2F..%2Fconfig.json")" 404 "remontée de dossier"
vaut "$(code "$U/preuve/$B/%2E%2E%2Ftickets.json")" 404 "remontée encodée"
vaut "$(code "$U/preuve/..%2Fpreuves/config.json")" 404 "id forgé"
ln -s "$D/config.json" "$D/preuves/$B/apres-lien.png"
vaut "$(code "$U/preuve/$B/apres-lien.png")/$(champ "$B" '.proofs|index("apres-lien.png")')" "404/null" "lien vers un autre fichier du Mac"
vaut "$(code "$U/piece/$B/config.json")" 404 "pièce jointe hors de la demande"
vaut "$(code "$U/preuve/$B/apres-titre.png")" 200 "vraie preuve"
curl -s -D - -o /dev/null "$U/piece/ancien/page.html" | grep -qi "content-security-policy: sandbox" || echec "pièce jointe HTML servie sans bac à sable"
ok "chemins de preuve interdits, pièces jointes en bac à sable"

# ── double clic sur « Envoyer » : un seul message ──
touch "$T/open-lent"
ticket "$B" envoyer --arg to "+33 6 12 34 56 78" --arg subject "" --arg body "Double envoi" > /dev/null & P1=$!
ticket "$B" envoyer --arg to "+33 6 12 34 56 78" --arg subject "" --arg body "Double envoi" > /dev/null & P2=$!
wait $P1 $P2; rm "$T/open-lent"
vaut "$(grep -c "text=Double%20envoi" "$L/open.log")/$(champ "$B" .status)" "1/fini" "un seul envoi pour deux clics"
ok "double clic : un seul envoi"

# ── classer une demande en ligne dont le message n'est pas parti : pas « envoyée » ──
vaut "$(ticket "$Q" fermer)" 200 "classer une demande en ligne sans message"
vaut "$(champ "$Q" .unsent)/$(champ "$Q" .dropped)" "true/false" "en ligne, sans message : marquée comme telle"
ok "classée en ligne sans message"

# ── relève : les inconnus ne déclenchent rien ; un tri en échec ne crée rien et ne perd rien ──
wa() { etat '[.tickets[]|select(.source.channel=="whatsapp")]|length'; }
relever() { avant=$(etat .lastPoll); post /api/config '{"auto":true}' > /dev/null; i=0; while [ "$(etat .lastPoll)" = "$avant" ]; do i=$((i+1)); [ $i -gt 100 ] && echec "relève sans fin"; sleep 0.2; done; }
relever
vaut "$(wa)/$(etat '.tickets[]|select(.source.channel=="whatsapp")|.clientId')/$(jq .waLast "$D/config.json")" "1/buckwell/2" "un seul message connu, curseur au dernier lu"
ajoute_wa "Le bouton ne marche plus"; touch "$T/tri-panne"
relever
[ -n "$(etat .notes.tri)" ] || echec "panne de tri non signalée"
vaut "$(wa)/$(jq .waLast "$D/config.json")" "1/2" "tri en échec : rien créé, curseur immobile"
rm "$T/tri-panne"; relever
vaut "$(wa)/$(jq .waLast "$D/config.json")/$(etat '.notes.tri // ""')" "2/3/" "relu à la relève suivante"
post /api/config '{"auto":false}' > /dev/null
ok "relève WhatsApp"

# ── texte du client avec balises : échappé dans la page ──
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "$CHROME" ]; then
  "$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$T/chrome" --virtual-time-budget=6000 --dump-dom "$U/" > "$L/page.html" 2>/dev/null &
  P=$!; ( sleep 45; kill $P 2>/dev/null ) & W=$!
  wait $P; kill $W 2>/dev/null
  grep -q 'onerror=alert(1)&gt;' "$L/page.html" || echec "le titre du client n'apparaît pas échappé dans la page"
  grep -q '<img src="x"' "$L/page.html" && echec "balise du client interprétée par la page"
  grep -q '<script>alert(1)' "$L/page.html" && echec "script du client inséré dans la page"
  ok "texte du client échappé"
  # le fil ne dit que la première phrase du résumé ; le reste n'est que dans le Détail
  "$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$T/chrome" --virtual-time-budget=6000 --dump-dom "$U/#d=ancien" > "$L/fil.html" 2>/dev/null &
  P=$!; ( sleep 45; kill $P 2>/dev/null ) & W=$!
  wait $P; kill $W 2>/dev/null
  vaut "$(grep -c 'Il est en haut' "$L/fil.html")" "1" "résumé entier hors du Détail"
  ok "fil en une phrase"
else echo "--   Chrome absent : échappement non vérifié"; fi

# ── la barre trouve avant de demander à Claude : « exporter » puis ↓ Entrée ouvre la demande, « garonne » le client, un texte long rien ──
if [ -x "$CHROME" ]; then
  cat > "$T/trouve.ts" <<'EOF'
const [chrome, url, profil] = process.argv.slice(2);
const p = Bun.spawn([chrome, "--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${profil}`, "about:blank"], { stdout: "ignore", stderr: "pipe" });
const lec = p.stderr.getReader(), dec = new TextDecoder(); let tam = "", ws = "";
while (!ws) { const { value, done } = await lec.read(); if (done) process.exit(3); tam += dec.decode(value); ws = tam.match(/listening on (ws:\/\/\S+)/)?.[1] ?? ""; }
const s = new WebSocket(ws); await new Promise((ok) => (s.onopen = ok));
let n = 0; const att = new Map<number, any>(); s.onmessage = (e) => { const m = JSON.parse(String(e.data)); att.get(m.id)?.(m); };
const env = (method: string, params: any = {}, sessionId?: string): Promise<any> => new Promise((ok) => { att.set(++n, ok); s.send(JSON.stringify({ id: n, method, params, sessionId })); });
const { result: { targetId } } = await env("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await env("Target.attachToTarget", { targetId, flatten: true });
await env("Page.navigate", { url: `${url}/#arrivees` }, sessionId); await Bun.sleep(1500);
const js = async (x: string) => (await env("Runtime.evaluate", { expression: x, returnByValue: true }, sessionId)).result?.result?.value;
const taper = (v: string) => js(`(() => { const s = document.querySelector("#say"); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event("input")); return [...document.querySelectorAll("#trouve a")].map((a) => a.textContent).join("|"); })()`);
const touche = (k: string) => js(`document.querySelector("#say").dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, bubbles: true, cancelable: true })); location.hash`);
const bon = [];
bon.push((await taper("EXPORTÉ")).includes("Bouton Exporter") ? "" : "exporter ne trouve pas Bouton Exporter");
await touche("Enter");
bon.push((await js("location.hash")) === "#d=ancien" ? "" : "Entrée sur la ligne ne l'ouvre pas");
await js(`location.hash = "#arrivees"`); await Bun.sleep(300); await taper("garonne"); await touche("Enter");
bon.push((await js("location.hash")) === "#c=garonne" ? "" : "garonne n'ouvre pas le client");
bon.push((await taper("a\nb\nc")) === "" ? "" : "un texte long est filtré");
bon.push((await taper("zzzz")) === "" ? "" : "une ligne sans rapport");
// sans faux pas : avec une puce (#d=ancien), « garonne » + Entrée ouvre le client sans rien envoyer ; ⌘↵ envoie la barre, jamais le bouton plein
await js(`location.hash = "#d=ancien"`); await Bun.sleep(600);
await js(`window.__p = []; const f = fetch; window.fetch = (u, o) => { if (o && o.method === "POST") window.__p.push(String(u) + " " + String(o.body)); return f(u, o); }; 0`);
await taper("garonne"); await touche("Enter");
bon.push((await js("location.hash")) === "#c=garonne" && (await js("window.__p.length")) === 0 ? "" : "avec une puce, garonne + Entrée envoie ou n'ouvre pas le client");
await js(`location.hash = "#d=ancien"`); await Bun.sleep(600);
const ligne = await taper("exporter");
bon.push(ligne.endsWith("Envoyer en retouche⌘↵") && (await js(`document.querySelector("#trouve .on")?.textContent`)).includes("Bouton Exporter") ? "" : "dernière ligne ou première ligne choisie absente : " + ligne);
await js(`document.querySelector("#say").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })); 0`);
bon.push((await js(`document.querySelectorAll("#trouve a").length`)) === 0 && (await js(`document.querySelector("#puce").hidden`)) === false ? "" : "Échap ne ferme pas d'abord la liste");
await taper("plus gros");
await js(`document.querySelector("#say").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true, cancelable: true })); 0`); await Bun.sleep(6000); // la retouche attend 5 s
const envoyes = await js("window.__p.join(' ; ')");
bon.push(envoyes.includes('"retouche"') && !envoyes.includes('"valider"') && !envoyes.includes('"envoyer"') ? "" : "⌘↵ dans la barre : " + envoyes);
p.kill(); console.log(bon.filter(Boolean).join(" ; "));
EOF
  ( sleep 60; pkill -f "$T/chrome2" 2>/dev/null ) & W=$!
  R=$(bun "$T/trouve.ts" "$CHROME" "$U" "$T/chrome2" 2>&1) || echec "essai de la barre : $R"
  kill $W 2>/dev/null
  [ -z "$R" ] || echec "la barre qui trouve : $R"
  ok "la barre trouve avant de demander à Claude"
fi

grep -qi "unhandled\|TypeError\|ReferenceError" "$L/serveur.log" && echec "erreur dans le journal du serveur"
echo "banc : tout est juste"
