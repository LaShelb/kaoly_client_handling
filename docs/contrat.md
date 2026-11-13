# Contrat de la nuit — Kaoly Clients

Note de travail pour les agents (13/11/2026, branche `nuit-2026-11-13`). Elle tranche entre les trois propositions d'architecture et s'appuie sur `docs/recherche/*.html`. Ce qui est écrit ici fait foi. Pour changer une règle, notez la raison dans `docs/journal.md` (une ligne) et ne cassez jamais une règle marquée **[sécurité]**.

Base retenue : la proposition 2 (une fenêtre, trois fiches, adresses par ancre), avec trois greffes de la proposition 3 (le fil à trois voix nommées par qui parle, la ligne « arrivées » en tête de « À toi » quand elle casse, l'âge en mono à côté de chaque client) et deux de la proposition 1 (le tableau « même squelette pour tous les états », les puces de la barre qui proposent sans appliquer).

---

## 0. Le principe en une phrase

Une seule fenêtre : une colonne de 260 px qui liste **ce que Simon doit faire** et ses clients, et à droite **un seul objet ouvert**, une demande, un client ou les arrivées. Trois objets en tout : la demande (du message du client jusqu'à la réponse de Simon), le client, les arrivées. « En cours » et « Terminé » sont des moments d'une demande, pas des pages. Le menu liste des choses, jamais des états.

Ce qui est réuni, et pourquoi (à garder en tête pour chaque arbitrage) :

| Séparé aujourd'hui | C'est la même chose | Donc |
|---|---|---|
| « Mettre en production » puis « Envoyer », sur deux passages | un seul jugement : « c'est bon, on le dit au client » | preuve, message et bouton sur le même écran avant le premier clic, un seul bouton plein |
| résumé de Claude, captures, message au client | le même récit : pour toi en mots, en image, puis pour le client | une seule colonne de lecture à côté de l'image |
| quatre étiquettes : client, nature, état, production | une seule question : « où en est-on ? » | une phrase grise |
| À toi, En cours, Terminé | trois moments du même objet | deux groupes d'une liste ; le passé va chez le client |
| page Clients, Terminé, réglages | tout appartient au client | une fiche client |
| interrupteur, état du mail, état de WhatsApp, boîte mail, tri | « par où ça entre » | une fiche Arrivées, muette quand tout marche |
| zone de retouche de chaque carte, réponse à une question, barre | « écrire à Claude » | il ne reste que la barre |
| question de Claude, panne | « Claude est bloqué » | même place, en tête de « À toi », même traitement : une phrase et un geste |

---

## 1. Les vues et leurs adresses

Toute vue s'ouvre par son ancre. La page lit `location.hash` au chargement et à `hashchange`, et l'écrit à chaque navigation (avec `history.replaceState` quand on passe à la demande suivante après une action, pour ne pas remplir l'historique). La mesure capture chaque écran avec Chrome sans fenêtre (`--screenshot`) en ouvrant directement l'adresse.

| Adresse | Ce qui s'ouvre |
|---|---|
| `#` (vide) | la file : la colonne et, à droite, la première demande de « À toi ». S'il n'y en a pas, l'état vide. |
| `#d=<id>` | une demande précise, quel que soit son état, même réglée. Un id inconnu affiche l'état vide. |
| `#d=<id>&v=avant` / `&v=apres` / `&v=video` | la même demande, avec la preuve choisie |
| `#d=<id>&plein` | la même demande, avec la preuve en plein écran |
| `#c=<clientId>` | la fiche d'un client |
| `#arrivees` | la fiche Arrivées |
| `#rien` | l'état vide du volet droit (« Rien ne t'attend. »), quelle que soit la file. Sert à la mesure. |

Les clés se combinent par `&` et l'ordre n'a pas d'importance. Une clé inconnue est ignorée.

### Jeu d'essai : les ids fixes à capturer

Les agents de mesure fabriquent `eval/jeu/` (un dossier de données complet : `config.json`, `tickets.json`, `preuves/<id>/…`), qu'ils copient dans un dossier temporaire à chaque essai. Ces ids doivent exister, pour que tout le monde capture les mêmes écrans :

| id | état interne | ce qu'il montre |
|---|---|---|
| `valider-interface` | `valider`, kind `visible`, changed | changement d'interface à valider : avant, après, vidéo, change, reserve, brouillon de mail |
| `valider-bug` | `valider`, kind `bug`, client sans mise en ligne seule | bug corrigé à valider, avant et après sans vidéo, sans réserve |
| `en-ligne-seul` | `message`, shipped `auto` | bug parti seul en ligne, il ne reste que le message (WhatsApp) |
| `reponse` | `message`, changed false | simple réponse à une question du client, aucune preuve |
| `question` | `question` | Claude te demande quelque chose |
| `panne` | `erreur`, step `mise en ligne` | arrêtée sur une étape précise |
| `sans-preuve` | `valider`, changed, aucune preuve | changement sans capture (cadre en pointillé) |
| `ancien` | `valider`, seulement `summary` (pas de `change` ni de `reserve`) | demande créée par la version d'aujourd'hui : lisibilité de l'ancien format |
| `travail` | `travail` | Claude y travaille (voir plus bas : il faut un faux claude lent) |
| `file` | `file` | en attente d'une place |
| `envoyee` | `fini`, sentAt, shipped `validé` | réglée, lecture seule |
| `classee` | `fini`, dropped | classée |

Trois clients : `arion` (2 demandes ouvertes ou plus), `buckwell`, `garonne` (rien d'ouvert, deux demandes passées). Au moins six demandes dans « À toi », pour vérifier que la colonne tient sans défiler.

Comment lancer le serveur d'essai, sans rien toucher de réel :

```
KAOLY_CLIENTS_DIR=<copie temporaire de eval/jeu> PORT=4199 KAOLY_WA_DB=/nonexistent \
PATH="$PWD/eval/faux:$PATH" bun server.ts
```

- Jamais les ports 4117 et 4118. Utilisez 4199 ou plus haut, et arrêtez le serveur avant de finir.
- `config.json` du jeu : `auto: false`, `mail: { user: "simon@kaoly.fr", imap: "127.0.0.1", smtp: "127.0.0.1" }`. Tout essai de relève ou d'envoi de mail échoue en local, aucun paquet ne sort.
- `eval/faux/` doit contenir, en plus de `claude` et `gh`, un faux `security` (il renvoie `faux` pour `find-generic-password` et ne fait rien pour `add-generic-password` : le trousseau de Simon n'est jamais lu), un faux `open` et un faux `pbcopy` (ils écrivent leurs arguments dans `eval/faux/open.log` : WhatsApp ne s'ouvre jamais). **[sécurité]** Sans ces trois faux, ne lancez pas le serveur d'essai.
- Pour la demande `travail`, le serveur remet en `erreur` au démarrage tout ce qui était en `travail`. Mettez donc la demande en `file` dans le jeu, et placez devant `eval/faux` un faux `claude` lent (`eval/faux-lent/claude` : il attend 600 s si `$*` contient `stream-json`, sinon il délègue au faux normal). La demande passe en `travail` toute seule.

---

## 2. Chaque vue : ce qu'elle montre, dans l'ordre

Fenêtre de référence : 1280 × 860 (taille d'ouverture de l'application). Taille minimale : 720 × 480, sans défilement horizontal.

**Mots fixes** : les mots que l'interface écrit elle-même (libellés, boutons, verbes d'état, invites), sans compter ceux du client, de Claude, des titres de demande ni des noms. Pour qu'un script puisse les compter, tout texte qui vient du client ou de Claude est placé dans un élément qui porte l'attribut `data-contenu`.

### 2.1 La colonne (toujours là, 260 px)

Du haut vers le bas, sans bloc marque ni titre de page :

1. **« À toi »**, avec le compte à droite (en mono). Une ligne par chose à faire, dans cet ordre :
   1. la ligne des arrivées, seulement si la relève est éteinte ou si une source est en panne : « Relève éteinte » ou « Mail en panne », avec le geste en gris (« allumer », « relier ») ;
   2. ce qui bloque Claude : `question`, puis `erreur` ;
   3. le reste (`valider`, `message`), du client qui attend depuis le plus longtemps au plus récent (`createdAt` croissant).
2. **« Claude y travaille »**, avec le compte. Les lignes sont en gris. Le groupe disparaît s'il est vide.
3. Un filet, puis **« Clients »** : un nom par ligne, et à droite, en mono, l'âge de sa plus vieille demande à toi (« 3 j »), sinon rien. Un « + » apparaît au survol du titre « Clients » : il place le curseur dans la barre avec « Nouveau client : ».
4. **Tout en bas**, une ligne grise avec un point : « Relève · il y a 1 min ». C'est le lien vers `#arrivees`.

**Une ligne de demande** tient sur deux lignes de texte :
- ligne 1 : le titre, en encre et graisse 500 si la demande est à toi, en gris sinon. L'âge est à droite, en mono, compté depuis le message du client (`createdAt`) : « 12 min », « 2 h », « 3 j ».
- ligne 2, en gris : `Client · verbe`. Les verbes sont ceux du §5.1, et seulement ceux-là.
- Au plus un point de couleur par ligne, rouge, et seulement pour `erreur` et pour une source en panne.
- La ligne ouverte a un fond gris très léger (le même que le survol). Pas de bordure ni d'ombre.

Plafonds : 12 mots fixes pour toute la colonne (titres de groupes, ligne du bas), et 9 mots au plus par ligne, titre compris.

### 2.2 Une demande (`#d=<id>`)

Même squelette pour tous les états. De haut en bas :

1. **En-tête**, sur toute la largeur du volet :
   - le titre (20 px, graisse 500) ;
   - dessous, la phrase d'état en gris : `Client · nature, mise en ligne · Prénom par canal · âge`. Exemples : « Arion · interface modifiée, pas encore en ligne · Claire par WhatsApp · 2 h », « Buckwell · bug corrigé, en ligne sans toi · Marc par mail · hier ». Le nom du client est un lien vers sa fiche. Le type de demande n'est dit que là, jamais par une étiquette ;
   - « Classer », discret, n'apparaît qu'au survol de l'en-tête, à droite.
2. **Deux colonnes**, sans cadre autour :
   - **À gauche, la preuve**, aussi large que possible (environ 600 px à 1280). C'est un seul cadre, avec un petit sélecteur au-dessus : « Vidéo · Après · Avant ». On n'affiche que les choix qui existent, et aucun sélecteur s'il n'y a qu'une preuve. La vidéo s'ouvre par défaut, sinon « Après ». Avant et Après passent dans le même cadre, à la même taille, pour qu'on voie la différence en basculant (← →). Espace ou clic ouvre en plein écran (`&plein`). Aucun nom de fichier n'est affiché. S'il y a un changement sans preuve, un cadre en pointillé dit « Pas de capture ». S'il n'y a pas de changement de code (une simple réponse), il n'y a pas de colonne de preuve : la colonne de droite s'élargit jusqu'à 640 px au plus.
   - **À droite, le fil** (environ 340 px), trois voix nommées par qui parle, sans cartes ni intertitres :
     - **le prénom du client** (`source.name`, sinon le nom du client ; « Toi » si tu as ouvert la demande) : sa demande, deux lignes au plus, qui se déplient d'un clic ;
     - **« Claude »** : ce qui a changé, en une phrase (`change`). S'il y a une réserve (`reserve`), elle suit sur sa propre ligne, soulignée en pointillé : « À vérifier : l'emplacement du bouton ». Pour une ancienne demande sans `change`, on affiche les deux premières lignes de `summary` ;
     - **« À Claire · mail »** (ou « · WhatsApp ») : le message au client. Pour un mail, l'objet sur une ligne puis le texte. Les deux se modifient sur place, sans cadre au repos (fond gris au survol, filet fin au focus). Le destinataire se modifie d'un clic sur le nom ;
     - le **seul bouton plein**, sous le message, dont le libellé dit ce qui va se passer (voir le tableau). En dessous, en discret sur une ligne : « Une retouche » (il place le curseur dans la barre, avec la demande en puce) et « Seulement mettre en ligne » (seulement pour `valider`).
3. **« Détail », replié**, en bas du fil : le résumé complet (`summary`), le lien « Code sur GitHub » (vers `pr`, cliquable), les dernières étapes de Claude (`live`) et la liste des pièces jointes du client. Il est fermé par défaut, toujours.

Rien ne défile à 1280 × 860 pour atteindre le bouton plein. Si le message est long, c'est le fil qui défile, le bouton restant visible.

| État interne | Phrase d'état (nature, mise en ligne) | Ce qui prend la place principale | Bouton plein |
|---|---|---|---|
| `valider` | « interface modifiée » ou « bug corrigé », « pas encore en ligne » | preuve et fil | **Mettre en ligne et envoyer** |
| `message`, `shipped` | « bug corrigé, en ligne sans toi » (auto) ou « … en ligne » (validé) | preuve et fil | **Envoyer à Claire** |
| `message`, sans changement | « réponse prête » | le fil seul, élargi | **Envoyer à Claire** |
| `question` | « Claude te demande » | la question de Claude en grand (20 px), à la place de la preuve ; la demande du client en dessous | aucun : la barre prend le focus, invite « Ta réponse » |
| `erreur` | « arrêtée à : mise en ligne » (le nom de l'étape, `step`) | une phrase de raison (`error`, tronquée à 140 caractères, le reste dans Détail) | **Relancer** |
| `travail` | « Claude y travaille · 12 min » (depuis `startedAt`) | la demande du client ; la dernière étape de Claude en une ligne grise | aucun |
| `file` | « en attente d'une place » | la demande du client | aucun |
| `fini`, envoyée | « envoyée le 12 nov. », « préparée dans WhatsApp le 12 nov. », avec « · en ligne » si elle a été mise en ligne | la preuve et le message envoyé, en lecture seule | aucun |
| `fini`, classée | « classée le 12 nov. » | la demande du client et ce que Claude avait fait | aucun |

Après un clic sur le bouton plein ou sur « Classer » :
- la demande suivante de « À toi » prend sa place (ou l'état vide) ;
- un bandeau d'une ligne apparaît au-dessus de la barre pendant 5 s : « Envoyé à Claire · Annuler », « Classée · Annuler » ;
- **l'action n'est envoyée au serveur qu'à la fin des 5 s**. « Annuler » arrête le minuteur et rouvre la demande. *ponytail : l'annulation vit dans la page, le serveur n'a rien à défaire ; si l'application se ferme pendant les 5 s, rien n'est parti, ce qui est le bon côté de l'erreur.*
- Si le serveur refuse ensuite (envoi impossible, mise en ligne en échec), la demande revient dans « À toi » avec la raison dans le bandeau.

Plafonds : 15 mots fixes pour la demande (hors contenu). Pour Claude : `change` 25 mots, `reserve` 20 mots. Au premier écran, 120 mots visibles au plus, tout compris, en dehors du message au client.

### 2.3 Un client (`#c=<id>`)

1. Le nom, puis **une ligne de chiffres clés**, sans tuiles, avec les chiffres en mono et un libellé de deux ou trois mots : « 2 ouvertes · attend depuis 3 j · 7 réglées ce mois · dernier envoi le 10 nov. ». On n'affiche que les chiffres non nuls. Cette ligne recevra plus tard l'usage et les déploiements ; rien n'est affiché à leur place en attendant.
2. **Deux colonnes** :
   - à gauche, **un seul registre à filets**, une ligne par demande : la date en mono, le titre, puis l'issue ou le verbe. Les demandes ouvertes viennent d'abord, en encre, avec leur verbe du §5.1. Les passées suivent, en gris, avec leur issue : « envoyée », « classée », « en ligne sans toi puis envoyée ». Il n'y a pas d'intertitre entre les deux : la couleur suffit. Un clic ouvre `#d=<id>`. Le nom du client n'est pas répété sur ces lignes.
   - à droite, **les réglages** (240 px), trois lignes séparées par un filet, sans cadre : « Dépôt », « Contacts » (un par ligne) et « Bugs en ligne sans toi » (un interrupteur). On modifie une valeur en cliquant dessus, avec un fond gris au survol. La croix pour retirer un contact n'apparaît qu'au survol de sa ligne. « Retirer le client » apparaît au survol du bas de la colonne et passe par le bandeau « Annuler ». Le texte grisé du champ des contacts rappelle la règle (« mail, @domaine, numéro, groupe ») : il n'y a pas de phrase d'aide sous les réglages.
3. Un client sans demande : « Aucune demande. »

Plafond : 25 mots fixes, sans compter les lignes du registre.

### 2.4 Arrivées (`#arrivees`)

Des lignes séparées par un filet, sans titre de page autre que « Arrivées » :

1. **Relève** : l'interrupteur, puis en gris « toutes les 2 min · dernière il y a 1 min » (à partir de `lastPoll`). Éteinte : « éteinte, rien n'est lu ».
2. **Mail** : l'adresse, un point d'état. « Relier » ouvre en place deux champs (adresse, mot de passe d'application). L'aide Gmail est un lien « Comment ? », qui déplie une ligne. Les champs ne s'affichent que si la boîte n'est pas reliée ou en panne, ou après un clic sur « Relier ». En panne : la raison en une ligne.
3. **WhatsApp** : un point d'état. La phrase sur l'accès complet au disque n'apparaît que si la lecture est bloquée.
4. **Tri** : la dernière erreur de tri, seulement s'il y en a une.

Plafond : 30 mots fixes quand tout marche.

### 2.5 État vide du volet

« Rien ne t'attend. » en grand (20 px) et en gris, centré dans le volet. Rien d'autre : la colonne dit déjà ce que fait Claude et où en sont les clients. Une fiche client vide affiche « Aucune demande. ».

### 2.6 La barre

- Elle est attachée au bas du volet droit, sur toute sa largeur, et toujours visible. Le volet réserve sa hauteur, si bien qu'elle ne recouvre jamais rien. ⌘K y place le curseur.
- **La puce.** Sur une demande ouverte qui accepte une réponse (`question`, `valider`, `erreur`, ou `message` sans `shipped`), une puce grise à gauche du champ indique la cible : « Arion · Bouton Exporter ». Échap la retire. Avec une puce, ce qui est tapé part directement à la demande (`POST /api/ticket {action: "retouche"}`), sans passer par Claude pour le tri. Sans puce, le texte part à `/api/chat`.
- **L'invite**, quatre mots au plus, suit la cible : « Une retouche ? » (`valider`, `message`), « Ta réponse » (`question`), « Une consigne ? » (`erreur`), « Écris ou colle un message » (sans puce).
- Il n'y a pas de bouton « Envoyer » : Entrée envoie, Maj + Entrée passe à la ligne.
- **La réponse** s'affiche sur une ligne grise au-dessus du champ : la phrase de Claude (15 mots au plus), puis « ✓ » devant chaque action faite. Elle est remplacée à chaque envoi et s'efface au bout de 8 s. Elle ne recouvre jamais le bouton plein.
- **Les propositions.** Un ajout ou une modification de client demandé par la barre (`add_client`, `update_client`) n'est jamais appliqué directement **[sécurité]** : la ligne de réponse dit ce qui changerait (« Arion : bugs en ligne sans toi → oui ») et propose « Appliquer ». Le clic envoie `POST /api/config {client}`.
- Libre : jusqu'à trois exemples cliquables tant que rien n'a jamais été tapé (mémorisé dans `localStorage`, dans un try/catch).

### 2.7 Clavier

| Touche | Effet |
|---|---|
| ⌘K | curseur dans la barre |
| ↑ ↓ (hors saisie) | demande précédente ou suivante de la colonne |
| ⌘↵ | le bouton plein de la demande ouverte |
| ← → | Avant et Après |
| Espace (hors saisie) | preuve en plein écran ; Échap pour fermer |
| Échap | ferme le plein écran, sinon retire la puce de la barre |

---

## 3. Ce que la page demande au serveur

Rester au plus près de l'existant. `config.json` et `tickets.json` gardent leur forme : on n'ajoute que des champs facultatifs, et une ancienne demande sans ces champs s'affiche correctement.

### 3.1 `GET /` et le jeton

`GET /` sert `index.html` en remplaçant la chaîne `__JETON__` par un jeton aléatoire tiré au démarrage du serveur (`crypto.randomUUID()`). La page le lit (`<meta name="jeton" content="__JETON__">`) et l'envoie dans l'en-tête `x-kaoly` de chaque POST. **[sécurité]**

### 3.2 `GET /api/state`

```ts
{
  auto: boolean,
  lastPoll: string | null,          // NOUVEAU — ISO, fin de la dernière relève (réussie ou non)
  clients: { id, name, repo, contacts: string[], autoProd: boolean }[],
  notes: { mail?: string, whatsapp?: string, tri?: string },
  mail: { user: string, ok: boolean },
  whatsapp: boolean,
  tickets: {
    id: string, clientId: string, client: string,   // client = nom affiché
    title: string, request: string,
    kind: "bug" | "visible" | "question",
    status: "file" | "travail" | "question" | "valider" | "message" | "erreur" | "fini",
    source: { channel: "mail" | "whatsapp" | "toi", from?: string, name?: string, subject?: string, ref?: string },
    files: string[],                 // pièces jointes du client (chemins) ; la page n'affiche que le nom de fichier, dans Détail
    createdAt: string, updatedAt: string,
    startedAt?: string,              // NOUVEAU — début du travail en cours de Claude (pour « 12 min »)
    summary?: string,                // ancien résumé, 3 à 6 lignes : seulement dans Détail
    change?: string,                 // NOUVEAU — une phrase : ce qui a changé
    reserve?: string,                // NOUVEAU — une phrase ou "" : ce qui reste à vérifier
    question?: string, error?: string,
    step?: string,                   // NOUVEAU — dernière étape commencée, en français (§4, P1-1)
    draft?: { to: string, subject: string, body: string },
    changed?: boolean, shipped?: "auto" | "validé", pr?: string, dropped?: boolean,
    sentAt?: string,                 // NOUVEAU — heure de l'envoi (ou de l'ouverture dans WhatsApp)
    sentVia?: "mail" | "whatsapp",   // NOUVEAU
    proofs: string[],                // noms de fichiers dans preuves/<id>/ ; la page les range (§3.4)
    live?: string[]                  // 6 dernières étapes de Claude, seulement en `travail`
  }[]
}
```

Rien d'autre. Le tri, les verbes, les âges et les phrases d'état sont calculés dans la page.

### 3.3 Les POST

Tous exigent, **[sécurité]** : un en-tête `Origin` présent et égal à `http://127.0.0.1:PORT`, l'en-tête `x-kaoly` égal au jeton, et un `Host` égal à `127.0.0.1:PORT` (ou `localhost:PORT`). Le contrôle de `Host` vaut aussi pour tous les GET. Sinon, la réponse est 403. Chaque réponse est `state()` en cas de succès, ou `{ error }` avec le code 400.

| Route | Corps | Effet |
|---|---|---|
| `/api/ticket` | `{ id, action: "valider", send?: boolean, to?, subject?, body? }` | met en ligne ; si `send`, enregistre le brouillon transmis puis envoie. Sans `send`, la demande passe en `message` (« Seulement mettre en ligne »). |
| `/api/ticket` | `{ id, action: "envoyer", to, subject, body }` | inchangé (statut `message` exigé) ; enregistre `sentAt` et `sentVia` |
| `/api/ticket` | `{ id, action: "retouche", text }` | inchangé : répondre à une question ou demander une retouche |
| `/api/ticket` | `{ id, action: "relancer" }` | reprend **à l'étape où ça s'est arrêté** (§4, P1-1) |
| `/api/ticket` | `{ id, action: "fermer" }` | inchangé (« Classer ») ; ne doit plus être écrasé par la fin du travail (§4, P1-2) |
| `/api/config` | `{ auto }`, `{ client }`, `{ removeClient }`, `{ mail: { user, password } }` | inchangé |
| `/api/chat` | `{ text }` | renvoie `{ reply, done: string[], propose: Action[] }`. `create_ticket` et `answer_ticket` sont appliqués comme aujourd'hui ; `add_client` et `update_client` ne sont **jamais** appliqués : ils reviennent dans `propose` **[sécurité]**. |

### 3.4 Les preuves, rangées par la page

- La vidéo : `\.(mp4|webm|mov)$`.
- « Avant » : nom qui contient `avant`.
- « Après » : nom qui contient `apres` ou `après`, plus toute image qui ne contient ni l'un ni l'autre.
- S'il y a plusieurs paires, on les apparie par l'ordre alphabétique, et le sélecteur devient « Après 1 · 2 ».
- Les images se chargent par `/preuve/<id>/<nom>`, comme aujourd'hui.

---

## 4. Le travail du serveur, par priorité

Pour que Simon puisse allumer l'application demain matin. Chaque point est petit, et chaque règle pure ajoutée prend une ligne dans `--check`.

### P0 — avant d'allumer la relève (bloquant, sécurité ou perte de données)

1. **Origine, jeton, Host** (§3.1, §3.3). Un POST sans `Origin` est refusé (aujourd'hui `?? ORIGIN` le laisse passer : un simple `curl` valide, envoie ou met `autoProd` à vrai). Exiger le jeton et vérifier `Host` sur toutes les requêtes, GET compris : cela ferme la porte au détournement par DNS.
2. **Mise en ligne seule : il faut que le tri ET Claude disent « bug ».** Remplacer `strictest` par : `a === b ? a : "visible"`. Ajouter à `--check` le cas `strictest("question", "bug") === "visible"` et `strictest("bug", "question") === "visible"`. (Sans changement de code, `gate` rend toujours `message`.)
3. **Une file par dépôt** pour `fetch` et `worktree add` : une promesse chaînée par chemin de dépôt (`const locks = new Map<string, Promise<any>>()`). Aujourd'hui, deux demandes du même dépôt se bloquent sur `.git/config`.
4. **Écriture sûre** : `save()` écrit dans `<nom>.tmp`, puis `renameSync`. Un `tickets.json` tronqué fait aujourd'hui planter le démarrage, et la fenêtre reste blanche.
5. **Aucun message perdu, aucun message en double.**
   - Mail : le curseur avance jusqu'au plus grand `uid` réellement lu, pas jusqu'au `top` lu avant le `fetch`.
   - WhatsApp : même chose avec le plus grand `Z_PK` lu.
   - `intake()` trie d'abord tous les clients. Si un tri échoue, il ne crée aucune demande et n'avance aucun curseur : tout est relu à la relève suivante, et `notes.tri` dit pourquoi. Sinon, il crée les demandes et enregistre ensuite les deux curseurs.
6. **Un mail illisible ne bloque plus la boîte.** Mettre un `try` par message : un message illisible est noté dans `notes.mail` et sauté. Un nom de pièce jointe fait uniquement de points (`..`) ou vide devient `piece`.
7. **Expéditeur vérifié.** Un mail n'ouvre une demande que si l'en-tête `Authentication-Results` contient `dkim=pass` ou `spf=pass`. Sinon, il est ignoré et noté dans `notes.mail` (« mail de x@y non authentifié, ignoré »). Écrire la règle pure `authOk(header)` et l'ajouter à `--check`.
8. **La barre ne change plus les réglages d'un client sans clic** (`propose`, §3.3).
9. **Le destinataire n'est jamais un domaine.** Dans `work()`, `draft.to` = `source.from`, sinon le premier contact qui ne commence pas par `@`, sinon `""`. Si c'est vide, la page affiche « À qui ? » en pointillé et le bouton reste éteint.
10. **Claude ne lit pas le trousseau** : ajouter `"Bash(security:*)"` à `--disallowedTools` (garde-fou, comme les autres). Ajouter aussi `Bash(open:*)` et `Bash(osascript:*)`.

### P1 — pour que l'écran dise la vérité

1. **`step` et « Relancer » qui reprend où ça s'est arrêté.** `set(t, { step })` avant chaque étape, avec ces libellés : « copie du dépôt », « travail de Claude », « envoi du code », « mise en ligne », « envoi au client ». Découper `work()` en deux : le travail de Claude, puis `finish(t)` (commit, push, PR, `gate`). « Relancer » sur une demande dont `step` vient après « travail de Claude », avec un `draft` déjà là, appelle `finish(t)` sans relancer Claude. Aujourd'hui, un simple échec de `gh pr create` rappelle toute la session et crée un deuxième commit.
2. **« Classer » pendant que Claude travaille reste classé** : dans le `catch` de `work()`, ne rien écrire si `t.status === "fini"`.
3. **Le schéma demandé à Claude** : ajouter à `WORK_SCHEMA` `change` (une phrase de 25 mots au plus, ce que Simon verra de différent) et `reserve` (20 mots au plus, ou ""). `summary` reste, pour Détail et pour la PR. Dans `RULES`, nommer les preuves `avant-<sujet>.png`, `apres-<sujet>.png` et `video-<sujet>.mp4`, prises à la même taille de fenêtre (1280 × 800) et avec le même cadrage, la zone modifiée visible sans zoom.
4. **`sentAt`, `sentVia`** à l'envoi. Pour WhatsApp, la phrase dit « préparée dans WhatsApp » et non « envoyée » : l'application ne sait pas si Simon a appuyé sur Entrée.
5. **`startedAt`** quand une demande passe en `travail`, et **`lastPoll`** à la fin de chaque relève.
6. **Une PR déjà fusionnée à la main n'est pas une panne** : avant de fusionner, `ship()` lit `gh pr view <pr> --json state`. Si l'état est `MERGED`, la demande passe en `message` avec `shipped: "validé"`. Un conflit de fusion devient une `erreur` à l'étape « mise en ligne », avec sa raison.
7. **`action: "valider"` avec `send`** : `ship` puis `send`, dans la même requête. Si l'envoi échoue après la mise en ligne, la demande reste en `message` (déjà en ligne) et l'erreur revient à la page.

### P2 — si le temps le permet

1. **Ne plus lancer `security` toutes les 2 s** : mettre en cache `mail.ok`, recalculé au démarrage et après chaque `POST /api/config {mail}`.
2. **Le nombre « à toi » sur l'icône du Dock** : la page écrit `document.title = "Kaoly Clients (3)"`, et `app/main.swift` observe `web.title` pour remplir `NSApp.dockTile.badgeLabel`. Vérifiez la compilation avec `swiftc` vers le scratchpad. **Ne lancez jamais `app/build.sh`** : il installe dans `/Applications`.
3. **Les pièces jointes du client visibles** dans Détail, par une route `/piece/<id>/<nom>` qui ne sert que les fichiers listés dans `t.files`.

### Écarté cette nuit, et pourquoi

- **Le tri qui voit les demandes déjà ouvertes** (un « toujours cassé » ouvre une deuxième demande) : cela change le schéma du tri et la fusion des demandes, pour un cas que Simon règle d'un « Classer ». À reprendre avec de vrais volumes.
- **Les captures et les messages vocaux WhatsApp** (`ZTEXT is not null`) : il faudrait lire les médias de la base WhatsApp, qu'on n'a pas le droit d'ouvrir cette nuit.
- **Vérifier le déploiement après la fusion** : il n'existe pas de moyen commun à tous les clients. « En ligne » veut dire « fusionné dans la branche principale », comme aujourd'hui (le commentaire `ponytail` de `ship()` reste).
- **Notifications macOS** : le badge du Dock suffit pour commencer.
- **Annuler un envoi côté serveur** : remplacé par les 5 s de la page (§2.2).
- **Une vraie cloison pour Claude** (compte GitHub sans droit de pousser, bac à sable) : hors de portée cette nuit. Les interdits de `--disallowedTools` restent un garde-fou, et le commentaire `ponytail` le dit déjà.
- **Mode sombre** : Simon préfère le clair, et le sombre n'est qu'une option (gouts.html). Pas cette nuit.

---

## 5. Règles de texte

### 5.1 Un seul vocabulaire pour les états

| Situation (interne) | Verbe dans la colonne (ligne 2) | Phrase d'état (en-tête) |
|---|---|---|
| `valider` | « à valider » | « interface modifiée » ou « bug corrigé », « pas encore en ligne » |
| `message`, `shipped` | « en ligne · à envoyer » | « … en ligne sans toi » (auto) ou « … en ligne » |
| `message`, sans changement | « à envoyer » | « réponse prête » |
| `question` | « Claude demande » | « Claude te demande » |
| `erreur` | « arrêtée » (point rouge) | « arrêtée à : <step> » |
| `file` | « en attente » | « en attente d'une place » |
| `travail` | « 12 min » (en mono) | « Claude y travaille · 12 min » |
| `fini` | (pas dans la colonne) | « envoyée le 12 nov. », « préparée dans WhatsApp le 12 nov. », « classée le 12 nov. » |
| relève éteinte, source en panne | « Relève éteinte » · « allumer », « Mail en panne » · « relier » | — |

Les mots de l'interface :
- **demande**, jamais « ticket » ;
- **mettre en ligne** et **en ligne**, jamais « production », « déployer », « fusionner », « merge » ;
- **Claude**, jamais « agent », « session », « IA » ;
- **Classer** (fermer sans suite), **Relancer** (après une panne), **Une retouche** ;
- **Mettre en ligne et envoyer**, **Envoyer à <prénom>**, **Seulement mettre en ligne** ;
- **arrivées** et **relève** pour ce qui fait entrer les demandes ;
- **Code sur GitHub** est la seule mention du code, et seulement dans Détail.

### 5.2 Phrases et formes interdites

- Toute phrase sous un titre (chapeau de page), tout paragraphe d'aide permanent, tout exemple de plus de quatre mots dans un champ.
- « Ticket », « PR », « production », « Bash », « workflow », « onboarding », « dashboard », tout mot anglais (sauf un nom propre : GitHub, WhatsApp, Gmail).
- « Veuillez », « Êtes-vous sûr », « Succès », « Cliquez ici », « Aucune donnée disponible », « Oups ».
- Les points d'exclamation, les majuscules en série, les emojis.
- L'identifiant WhatsApp brut (`336…@s.whatsapp.net`) et les noms de fichiers des preuves.
- « Aucune capture… À vérifier toi-même » sur une demande déjà en ligne ou réglée. Le pointillé « Pas de capture » ne s'affiche que sur `valider`.
- Répéter une information déjà dite : le nom du client sur sa propre fiche, l'état dans une étiquette quand la phrase le dit, un « À toi » dans une étiquette quand on est dans « À toi ».

### 5.3 Longueurs

- Libellé ou bouton : trois mots au plus, sauf « Mettre en ligne et envoyer ».
- Ligne de la colonne : 9 mots, titre compris.
- Titre de demande : 6 mots visés. Au-delà, il est coupé par des points de suspension sur une ligne dans la colonne, et en entier dans l'en-tête.
- Tutoiement, français parlé.
- Dates : relatives en mono pour un âge (« 12 min », « 2 h », « hier », « 3 j »), absolues pour le passé (« le 12 nov. »).

---

## 6. Règles visuelles (tirées de `docs/recherche/gouts.html`)

C'est le registre « application », celui d'Observability, et pas celui du carnet.

- **Fond** clair, unique. La page et la fenêtre Swift (`window.backgroundColor`, aujourd'hui `#fbfaf7`) ont la même couleur, pour éviter un éclair au chargement. Si vous changez l'une, changez l'autre. Pas de mode sombre.
- **Encre** proche du noir (#171717), un gris pour le secondaire (#8a8a8a ou plus foncé, contraste AA sur le fond), filets `rgba(0,0,0,.07)`.
- **Une seule couleur vive**, l'indigo #615fff, pour une seule chose : le focus et la sélection (ligne ouverte, puce de la barre, filet du champ en saisie). Le **rouge** est réservé à la panne, le **vert** à « en ligne ». Le type de demande et le client ne sont jamais en couleur.
- **Le bouton plein est en encre** (fond #171717, texte blanc) : un seul par écran. Les autres actions sont du texte gris souligné au survol.
- **La hiérarchie passe par la taille et le gris.** La graisse la plus forte est 500 pour les titres, 600 au plus nulle part ailleurs. Quatre ou cinq tailles de police au plus (par exemple 12, 13/14, 16, 20 px). Les chiffres, âges et dates sont en mono `tabular-nums`, alignés à droite.
- **Un cadre seulement pour ce qui se regarde ou se modifie** : la preuve, la barre, un champ au focus. Il n'y a ni carte, ni encadré autour d'un groupe de texte, ni étiquette sur fond coloré. Les groupes se font par un titre, un compteur, de l'espace et un filet. Trois cadres au plus visibles à l'écran.
- **Ombre** : seulement sur ce qui flotte (le plein écran de la preuve et, à la rigueur, la barre). Un anneau très léger tout au plus.
- **Interdits** : dégradé décoratif, bordure épaisse sur un seul côté, icône plate en couleur, majuscules en série, carte ombrée.
- **L'incertain en tirets** (pointillé, souligné en tirets), jamais par une couleur seule : la réserve de Claude, « Pas de capture », « À qui ? ».
- **Une valeur modifiable n'a pas de cadre au repos** : fond gris au survol, filet fin au focus. La croix pour retirer n'apparaît qu'au survol de la ligne.
- **Police système** (SF Pro par `-apple-system`) et mono du système. Pas d'Inter, de Manrope ni d'IBM Plex.
- **Mouvement** : rien, sauf le bandeau (apparition en 150 ms) et le passage d'une demande à l'autre, sans animation de mise en page.

### Les mesures de la boucle (à 1280 × 860, sur le jeu d'essai)

| # | Mesure | Seuil |
|---|---|---|
| M1 | lignes de « À toi » visibles sans défiler dans la colonne | toutes (le jeu en a 6 au moins) |
| M2 | bouton plein visible sans défiler, sur chaque demande qui en a un | oui, `bottom ≤ 860` |
| M3 | cadres visibles (bordure, ombre ou fond distinct du fond de page, hors ligne ouverte) | 3 au plus |
| M4 | boutons pleins par écran | 1 (0 sur `question`, `travail`, `file`, `fini`) |
| M5 | points de couleur par ligne ; rouge hors panne | 1 au plus ; 0 |
| M6 | largeur affichée de la preuve ÷ largeur réelle (capture de 1280 px) | 45 % ou plus |
| M7 | mots fixes (hors `[data-contenu]`) | sous les plafonds du §2 |
| M8 | clics pour vider 5 demandes `valider` ou `message` du jeu | 5 (+ 5 s d'attente chacune) |
| M9 | tailles de police distinctes ; graisses distinctes | 5 au plus ; 3 au plus |
| M10 | défilement horizontal à 720 × 480 | aucun |
| M11 | texte venu du client affiché tel quel (`<script>` dans `request`, `title`, `draft`) | échappé, jamais exécuté |
| M12 | un POST sans `Origin`, sans jeton, ou avec un autre `Host` | 403 |

---

## 7. Ce qui reste libre pour les concepteurs de la page

- Les espacements, les rayons et les tailles exactes, dans le cadre du §6.
- La couleur exacte du fond (blanc cassé chaud comme la fenêtre Swift, ou #fafafa froid comme Observability), à condition de changer la fenêtre Swift avec.
- Le dessin du sélecteur de preuve (texte souligné, petits segments), et la façon de montrer qu'on bascule entre Avant et Après.
- La forme de la puce de la barre et du bandeau.
- Les icônes, au trait et d'une seule couleur, si elles servent vraiment. Aucune n'est exigée.
- Garder ou non les trois exemples cliquables de la barre.
- La façon de déplier la demande du client et Détail.
- Le comportement de la colonne au-delà d'une douzaine de demandes (défilement interne, avec les titres de groupe qui restent en haut, par exemple).
- La disposition en dessous de 1000 px de large : la preuve passe au-dessus du fil, ou le fil seul avec la preuve en bascule. Seule règle : le bouton plein reste visible sans défiler.

Le reste n'est pas libre : une seule page `index.html`, sans cadre ni étape de compilation ; tout texte du client ou de Claude passe par `esc()` ; aucune saisie en cours (brouillon de message, champ de réglage) n'est effacée par le rafraîchissement toutes les 2 s, les modifications du brouillon étant gardées en mémoire par id de demande jusqu'à l'envoi ; un message au client ne part jamais sans le clic de Simon.

---

## 8. Points à confirmer avec Simon (à montrer en tirets dans le rapport, aucun ne bloque)

- **Un clic pour « Mettre en ligne et envoyer ».** C'est la décision prise : Simon voit la preuve, la phrase de Claude et le message avant de cliquer, puis il a 5 s pour annuler. Repli prêt : « Seulement mettre en ligne » est déjà sur l'écran, et l'envoi suit d'un second clic sur la même demande.
- **La graisse des titres** : 500 retenu. Observability est à 700, le carnet à 400.
- **La ligne « Relève éteinte » en tête de « À toi »** tant que la relève est éteinte. Si Simon la garde éteinte exprès, elle devient du bruit. Repli : la ligne du bas seule.
- **La barre avec une puce envoie directement à la demande.** Coller le mail d'un autre client sans retirer la puce le transmettrait comme retouche. La puce visible et l'invite le disent ; à surveiller.
