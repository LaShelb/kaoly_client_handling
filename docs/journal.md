# Journal de la nuit (écarts au contrat et décisions, une ligne chacun)

- serveur · `authOk(header, from)` est plus strict que « dkim=pass ou spf=pass » : le pass doit porter sur le domaine de l'expéditeur (dkim header.i/d, spf smtp.mailfrom, ou dmarc header.from), et seul le premier en-tête Authentication-Results (celui de la boîte de Simon) compte. Sinon un domaine quelconque signé dkim passait pour claire@arion.fr.
- serveur · les preuves et pièces jointes ne servent que de vrais fichiers (`lstat().isFile()`) : un lien symbolique déposé dans preuves/ aurait été servi et joint au mail du client.
- serveur · curseurs : WhatsApp lit `Z_PK > last and <= top` et le mail `uid last+1:top`, puis enregistre le plus grand lu ; rien n'est enregistré si un tri échoue (`notes.tri`).
- serveur · `addTicket` ne recopie que les champs connus : une action de la barre ne peut plus imposer un id ou un état.
- serveur · `tickets.json` n'est lu qu'au démarrage du serveur, plus à l'import : `bun server.ts --check` ne touche jamais aux données de Simon.
- serveur · ImapFlow reçoit un écouteur d'erreur : une coupure réseau pendant la relève ne fait plus tomber l'application.
- page · ajout minimal seulement (jeton, ligne « Proposé : … · Appliquer ») ; la page est réécrite par les concepteurs. Elle doit garder `<meta name="jeton" content="__JETON__">` et l'en-tête `x-kaoly`.
- Swift · `main.swift` lit le nombre entre parenthèses du titre de la page pour le badge du Dock (compilé avec swiftc vers le scratchpad, `app/build.sh` non lancé). Reste à la page d'écrire `document.title = "Kaoly Clients (n)"`.
- banc · `sh eval/banc.sh <port>` : les corps JSON sont construits par jq, le sh de macOS (bash 3.2) déforme un JSON entre guillemets dans `$( )`.
