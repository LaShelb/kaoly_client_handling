# Grille du juge — sur 60

Note de travail pour l'agent juge de la boucle (pas pour Simon). Le juge ne lit pas le code : il regarde les captures produites par `bun eval/score.ts --port <p> --out <dossier>` (ou `eval/captures.ts`), dans `<dossier>/grand/` (1280 × 860) et `<dossier>/petit/` (760 × 560).

## Comment juger

- 30 questions fermées. **Oui = 2 points, non = 0.** Pas de demi-point.
- Oui seulement si c'est **visible sur la capture citée**. Dans le doute, non. Une capture absente ou en erreur vaut non pour toutes les questions qui la citent.
- Quand une question cite `demande-*.png`, elle vaut pour toutes les demandes de l'état concerné ; un seul contre-exemple suffit pour répondre non.
- Le juge se met à la place de Simon : il gère ses clients, il se moque du code, il veut savoir en trois secondes ce qui l'attend et le faire en un geste, la preuve sous les yeux.
- Réponse attendue, un objet JSON par question, puis le total :

```json
{ "H1": { "rep": "oui", "capture": "grand/toi.png", "pourquoi": "compte 9 en haut de la colonne" }, "…": {}, "total": 46 }
```

`pourquoi` tient en dix mots au plus. La note de la nuit est : automatique (sur 40, `score.json`) + juge (sur 60) = sur 100.

## Hiérarchie — en trois secondes, Simon sait ce qui l'attend et quoi faire (12)

- **H1.** `grand/toi.png` : le nombre de choses qui attendent Simon se lit sans chercher, en haut de la colonne.
- **H2.** `grand/toi.png` : la file « À toi » est ce qui ressort le plus de la colonne ; ni une marque, ni un menu, ni des réglages ne passent devant.
- **H3.** `grand/demande-valider-interface.png` : l'œil va du titre à la preuve puis au bouton plein ; rien d'autre n'est aussi gros que le titre, et le bouton est le seul aplat foncé.
- **H4.** `grand/demande-*.png` : l'état de la demande (client, nature, en ligne ou pas, qui l'a envoyée, depuis quand) se lit en une phrase grise sous le titre, sans étiquette colorée.
- **H5.** `grand/demande-question.png` : la question de Claude est le texte le plus grand du volet après le titre, et on voit où répondre (la barre, avec une invite courte).
- **H6.** `grand/demande-panne.png` : la panne se repère au premier regard (un point rouge dans la colonne, la raison en une phrase), et le rouge reste sur un point ou un mot, jamais sur un bloc.

## Regroupement — ce qui est le même concept est ensemble, aucun encadré gratuit (10)

- **R1.** `grand/demande-valider-interface.png` : la preuve, ce que Claude a changé, le message au client et le bouton tiennent sur le même écran, sans défiler.
- **R2.** Toutes les captures `grand/` : aucun groupe de texte n'est entouré d'un cadre ni posé sur un fond blanc distinct (pas de carte) ; les groupes se font par un titre, de l'espace et des filets. Seuls la preuve, la barre et un champ en cours de saisie ont un cadre.
- **R3.** `grand/demande-valider-interface.png` : le fil se lit comme une conversation à trois voix nommées par qui parle (le prénom du client, « Claude », « À Claire · mail »), sans intertitre ni bloc séparé par voix.
- **R4.** `grand/client-arion.png` : demandes ouvertes et passées sont dans un seul registre à filets (ouvertes en encre, passées en gris), et les réglages du client sont sur le même écran, sans cadre.
- **R5.** `grand/demande-travail.png`, `grand/demande-envoyee.png`, `grand/demande-classee.png` : même squelette que la demande à valider (titre, phrase d'état, même place pour la preuve et le fil) ; « en cours » et « réglé » ne sont pas des pages d'un autre genre.

## Sobriété du texte — aucune phrase qui explique l'évidence, un seul vocabulaire (10)

- **S1.** Aucune capture n'a de phrase sous un titre (chapeau) ni de paragraphe d'aide permanent.
- **S2.** Aucune phrase n'explique l'évidence ou ne commente l'interface (« Ce qui attend une décision de ta part », « Voici… », « Cliquez pour… », « Le reste tourne sans toi »).
- **S3.** Un seul vocabulaire : « demande » (jamais « ticket »), « en ligne » (jamais « production », « PR », « merge », « déployer »), « Claude » (jamais « agent », « session », « IA ») ; aucun mot anglais hors GitHub, WhatsApp et Gmail.
- **S4.** Aucun nom de fichier, aucun identifiant WhatsApp brut (`336…@s.whatsapp.net`, `…@g.us`), aucun chemin ni code visible en dehors du Détail replié.
- **S5.** Libellés et boutons de trois mots au plus (sauf « Mettre en ligne et envoyer »), invite de la barre de quatre mots au plus ; ni « Veuillez », ni point d'exclamation, ni majuscules en série.

## Décision — valider, retoucher, envoyer : un geste, la preuve sous les yeux (12)

- **D1.** `grand/demande-valider-interface.png` : un seul bouton plein, dont le libellé dit ce qui va se passer (« Mettre en ligne et envoyer »).
- **D2.** `grand/preuve-avant.png` et `grand/preuve-apres.png` : la preuve occupe à peu près la moitié du volet ou plus, Avant et Après passent dans le même cadre, à la même taille, et le sélecteur (Vidéo · Après · Avant) dit lequel est affiché.
- **D3.** `grand/demande-valider-interface.png` : le message au client se lit en entier, il a l'air modifiable sur place sans cadre de formulaire au repos, et le destinataire est un prénom et un canal (« À Claire · mail »), pas une adresse brute.
- **D4.** La réserve de Claude (« À vérifier : … ») est en pointillé ou en tirets, pas seulement en couleur (`grand/demande-valider-interface.png`), et « Pas de capture » est en pointillé (`grand/demande-sans-preuve.png`).
- **D5.** `grand/demande-question.png`, `demande-travail.png`, `demande-file.png`, `demande-envoyee.png`, `demande-classee.png` : aucun bouton plein, rien n'invite à agir là où il n'y a rien à faire.
- **D6.** `grand/demande-valider-interface.png` : la barre est attachée au bas du volet, toujours visible, et une puce nomme la demande visée par la retouche.

## Le hub — l'état d'un client se lit d'un regard (8)

- **B1.** `grand/toi.png` : chaque ligne de la colonne donne le client et un verbe d'état court (« Arion · à valider »), et l'âge en chiffres à chasse fixe, alignés à droite.
- **B2.** `grand/toi.png` : dans la liste des clients, on voit sans ouvrir de fiche quel client attend depuis le plus longtemps (âge en mono à côté du nom, rien pour Garonne).
- **B3.** `grand/client-arion.png` et `grand/client-garonne.png` : une ligne de chiffres en mono, sans tuile, qui ne montre que les chiffres non nuls ; Garonne, sans demande ouverte, n'affiche ni zéro ni bloc vide.
- **B4.** `grand/toi.png` et `grand/demande-travail.png` : « Claude y travaille » est plus discret que « À toi » (gris), et la demande en cours dit où en est Claude en une ligne (dernière étape, durée), sans journal technique.

## Finition — alignements, rythme, états vides, largeur étroite, goûts de Simon (8)

- **F1.** `grand/demande-valider-interface.png` et `grand/client-arion.png` : les bords gauches tombent sur peu de verticales, les chiffres sont alignés à droite, les espacements sont réguliers (ni zone tassée, ni trou).
- **F2.** `grand/rien.png` dit « Rien ne t'attend. » seul, en gris, centré, sans illustration ni aide ; `grand/arrivees.png` n'a aucune phrase d'aide quand rien n'est en panne.
- **F3.** `petit/*.png` (760 × 560) : rien n'est coupé ni superposé, la colonne reste lisible, et le bouton plein des demandes à valider est visible sans défiler.
- **F4.** Goûts de Simon (`docs/recherche/gouts.html`), sur toutes les captures : fond clair unique, encre presque noire, une seule couleur vive (l'indigo) réservée à la sélection et au focus, rouge seulement pour une panne, vert seulement pour « en ligne » ; aucun dégradé, aucune ombre de carte, aucune bordure épaisse sur un seul côté, aucune icône plate en couleur.
