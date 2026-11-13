# La mesure de la nuit

Note de travail pour les agents. Mesure fixe : une fois commitée, on ne retouche ni `donnees.ts`, ni `jeu/`, ni `captures.ts`, ni `score.ts`, ni `rubrique.md`. On change la page, pas la règle.

## Lancer

```
bun eval/score.ts --port 4304 --out eval/sorties/<nom>     # tout : banc, --check, captures, note sur 40 (≈ 3 min)
bun eval/score.ts --port 4304 --out eval/sorties/<nom> --sans-banc   # plus rapide pour itérer ; la note est éliminée, lire « sans les éliminatoires »
bun eval/captures.ts --port 4304 --out eval/sorties/<nom>  # seulement les captures et les mesures
bun eval/donnees.ts eval/jeu                               # refait le jeu d'essai (inutile : il est commité)
```

- Port 4199 ou plus, jamais 4117 ni 4118. Deux mesures en parallèle : deux ports différents (le banc prend le même port que les captures, l'un après l'autre).
- Rien de réel : copie temporaire de `eval/jeu`, faux `claude`, `gh`, `security`, `open`, `pbcopy` de `eval/faux/` en tête du PATH, relève éteinte, mail sur 127.0.0.1, Chrome sans fenêtre. Le serveur et Chrome sont arrêtés à la fin.
- `eval/sorties/` n'est pas commité.

## Ce qui sort

| Fichier | Contenu |
|---|---|
| `grand/<vue>.png`, `petit/<vue>.png` | chaque vue à 1280 × 860 et à 760 × 560 (taille minimale de la fenêtre) |
| `mesures/<vue>.json`, `mesures.json` | les mesures prises dans la page, aux deux tailles, plus le défilement horizontal à 720 × 480 |
| `gestes.json` | ⌘K, ↓, clic sur le bouton plein, bandeau « Annuler », envoi retenu 5 s |
| `impeccable.json` | constats du détecteur impeccable sur six vues |
| `score.json` | la note, ses composantes, le détail par vue |

Les 25 vues : `toi` (`#`), `rien`, `arrivees`, `client-arion|buckwell|garonne`, `demande-<id>` pour les 15 demandes du jeu, `preuve-avant|apres|video|plein` (sur `valider-interface`).

## Le jeu d'essai (`eval/jeu`, fabriqué par `donnees.ts`)

Trois clients (Arion, Buckwell qui laisse partir les bugs seuls, Garonne sans demande ouverte), quinze demandes aux ids fixes du contrat plus trois : `longue` (WhatsApp de groupe, cinq points), `en-cours` (deuxième demande en travail, pour que `file` reste en attente) et `arion-passee` (une seule preuve). Captures avant et après de vraies petites pages, une vidéo mp4. L'horloge de la page est arrêtée au 13 novembre 2026, 9 h 40 : les âges sont toujours les mêmes. `activite.json` garde `travail` et `en-cours` en travail avec leurs étapes, sans session de Claude (lu par `server.ts`, seulement s'il existe). Trois textes contiennent un piège HTML (`data-kaoly-xss`) : s'il devient une balise, la note est 0.

## La note automatique, sur 40

**Éliminatoire (note 0)** : banc ou `--check` en échec, captures impossibles, une vue vide, une exception ou une erreur HTTP dans la page, un défilement horizontal (1280, 760 ou 720 px), un piège HTML interprété.

| Composante | Points | Ce qui est mesuré dans la page (vue 1280 × 860) |
|---|---|---|
| Sobriété | 10 | mots que l'interface écrit elle-même dans le volet, sous les plafonds du contrat (demande 15, client 25, arrivées 30, vide 6 ; 0 point à trois fois le plafond) · mots fixes distincts de la colonne (12) · tous les mots du volet au premier écran (demande 120) · invites de 4 mots au plus |
| Regroupement | 8 | encadrés visibles : bordure sur 3 côtés, ombre, ou fond distinct de son parent, image de preuve comprise (3 au plus, 0 point à 9) · étiquettes sur fond coloré (aucune) |
| Cohérence | 7 | tailles de texte (5 au plus) · graisses (3 au plus, 600 au plus) · teintes vives (3 au plus : indigo, rouge de panne, vert d'en ligne) · boutons pleins (1 sur une demande à valider, à envoyer ou arrêtée ; 0 sur question, travail, attente, réglée) |
| Lisibilité | 5 | plus petit texte (12 px) · contraste le plus faible (4,5, 0 point à 2,5) · à 760 × 560, bouton plein visible et texte entier |
| Mise en page | 4 | les 9 titres de « À toi » visibles dans la colonne sans défiler · bouton plein visible au bon libellé (« Mettre en ligne… », « Envoyer… », « Relancer ») · preuve à 45 % de la largeur ou plus |
| Gestes | 3 | ⌘K met le curseur dans la barre · ↓ ouvre une autre demande · après le bouton plein, une autre demande s'ouvre · un « Annuler » apparaît et rouvre · rien n'est parti au serveur avant 5 s, ni après Annuler |
| Impeccable | 3 | constats moyens par vue du détecteur (`bunx impeccable@4.8.2 detect --cdp`, télémétrie coupée ; `cream-palette` ignoré, le contrat impose #fbfaf7) |

Comment c'est compté : seul le texte visible compte (dans la fenêtre, pas masqué, pas recouvert, au prorata des lignes visibles d'un texte replié). « Mots fixes » = sans le texte du client, de Claude, les titres, les noms et adresses du jeu (retirés par comparaison avec les données, en plus de `data-contenu`), sans les âges ni les dates. La colonne est le texte dont le centre est à moins de 300 px du bord gauche.

Étalonnage (13/11) : la page de départ (`b02981d`) fait **10,2 / 40** ; une page jetable écrite selon le contrat (colonne, fil, preuve à 580 px, gestes) fait **39,2 / 40**. Au-delà, c'est le juge qui départage.

## Le juge, sur 60

`eval/rubrique.md` : 30 questions fermées à 2 points, tranchées sur les captures. Note de la nuit = automatique (40) + juge (60).
