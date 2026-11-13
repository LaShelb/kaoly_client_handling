// Note automatique sur 40 : bun eval/score.ts --port <p> --out <dossier> [--sans-banc]
// Enchaîne le banc (eval/banc.sh), « bun server.ts --check » et les captures (eval/captures.ts), puis note les mesures.
// Éliminatoire (note 0) : banc ou vérification en échec, captures impossibles, vue vide ou en erreur, défilement horizontal,
// texte du client interprété par la page. Sinon : sobriété 10, regroupement 8, cohérence 7, lisibilité 5, mise en page 4,
// gestes 3, détecteur impeccable 3. Détail à l'écran et dans <out>/score.json. Ce fichier est la mesure fixe de la nuit : on ne le retouche pas.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const PORT = +(arg("--port") ?? 0), OUT = resolve(arg("--out") ?? ""), ICI = resolve(import.meta.dir, "..");
if (!PORT || !arg("--out")) { console.error("usage : bun eval/score.ts --port <p> --out <dossier> [--sans-banc]"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

async function lancer(cmd: string[], limite: number) {
  const p = Bun.spawn(cmd, { cwd: ICI, stdout: "pipe", stderr: "pipe" });
  const t = setTimeout(() => p.kill(), limite);
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]); clearTimeout(t);
  return { ok: code === 0, sortie: (out + err).trim() };
}

// ── seuils (le contrat, §2 et §6) ──
const PLAFOND_FIXES = { demande: 15, client: 25, arrivees: 30, vide: 6 } as const;     // mots que l'interface écrit elle-même, dans le volet
const PLAFOND_TOTAL = { demande: 120, client: 150, arrivees: 60, vide: 10 } as const;   // tous les mots du volet au premier écran
const PLAFOND_COLONNE = 12, PLAFOND_INVITE = 4, CADRES_MAX = 3;
const AVEC_BOUTON: Record<string, RegExp> = { valider: /mettre en ligne/i, message: /envoyer/i, erreur: /relancer/i }; // le bouton plein attendu, par état
const SANS_BOUTON = ["question", "travail", "file", "fini"];
const AVEC_PREUVE = ["valider-interface", "valider-bug", "en-ligne-seul", "longue", "envoyee"];
const IGNORES = ["cream-palette"]; // le contrat impose le fond #fbfaf7 de la fenêtre Swift

const lin = (x: number, bon: number, mauvais: number) => Math.max(0, Math.min(1, (mauvais - x) / (mauvais - bon))); // 1 si x ≤ bon, 0 si x ≥ mauvais
const moy = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;

export function noter(mesures: any[], impeccable: any, gestes: any, etapes: { banc: any; check: any; captures: any }) {
  const elim: string[] = [];
  if (!etapes.banc.ok) elim.push(`banc en échec : ${etapes.banc.sortie.split("\n").filter((l: string) => /ÉCHEC/.test(l))[0] ?? etapes.banc.sortie.slice(-200)}`);
  if (!etapes.check.ok) elim.push(`vérification en échec : ${etapes.check.sortie.slice(-200)}`);
  if (!etapes.captures.ok || !mesures.length) elim.push(`captures impossibles : ${etapes.captures.sortie.slice(-300)}`);
  for (const v of mesures) for (const t of ["grand", "petit"]) {
    const m = v[t]; if (!m) { elim.push(`${v.vue} (${t}) : pas de mesure`); continue; }
    if (m.erreurs.length) elim.push(`${v.vue} (${t}) en erreur : ${m.erreurs[0]}`);
    if (m.motsTotal < 3) elim.push(`${v.vue} (${t}) vide`);
    if (m.piege) elim.push(`${v.vue} (${t}) : texte du client interprété comme du HTML`);
  }
  for (const v of mesures) for (const t of ["grand", "petit", "etroit"]) if (v[t]?.debordement?.page) elim.push(`${v.vue} (${t}) : défilement horizontal`);

  const G = mesures.filter((v) => v.grand).map((v) => ({ ...v.grand, v }));
  const detail: Record<string, any> = {};
  const comp = (nom: string, max: number, parts: [string, number, number][]) => { // [libellé, part de 0 à 1, poids]
    const pts = parts.reduce((a, [, x, p]) => a + x * p, 0);
    detail[nom] = { points: r1(pts), max, parts: Object.fromEntries(parts.map(([l, x, p]) => [l, `${r1(x * p)}/${p}`])) };
    return pts; };

  // Sobriété : peu de mots, et ceux de l'interface sous les plafonds du contrat
  const fixes = G.map((m) => lin(m.mots.fixesVolet, PLAFOND_FIXES[m.v.sorte as keyof typeof PLAFOND_FIXES], 3 * PLAFOND_FIXES[m.v.sorte as keyof typeof PLAFOND_FIXES]));
  const colonne = G.map((m) => lin(m.mots.fixesColonneUniques, PLAFOND_COLONNE, 3 * PLAFOND_COLONNE));
  const total = G.map((m) => lin(m.mots.volet, PLAFOND_TOTAL[m.v.sorte as keyof typeof PLAFOND_TOTAL], 2.5 * PLAFOND_TOTAL[m.v.sorte as keyof typeof PLAFOND_TOTAL]));
  const invite = lin(Math.max(0, ...G.flatMap((m) => m.invites.map((i: any) => i.mots))), PLAFOND_INVITE, 3 * PLAFOND_INVITE);
  const sobriete = comp("sobriété", 10, [["mots fixes du volet", moy(fixes), 5], ["mots fixes de la colonne", moy(colonne), 1.5], ["mots du volet au premier écran", moy(total), 2.5], ["invites de 4 mots au plus", invite, 1]]);

  // Regroupement : peu d'encadrés, aucune étiquette sur fond coloré
  const regroupement = comp("regroupement", 8, [["3 cadres au plus", moy(G.map((m) => lin(m.cadres.length, CADRES_MAX, 3 * CADRES_MAX))), 6],
    ["aucune étiquette", moy(G.map((m) => lin(m.etiquettes.length, 0, 6))), 2]]);

  // Cohérence : 5 tailles, 3 graisses (600 au plus), 3 teintes vives au plus (indigo, rouge de panne, vert d'en ligne), le bon nombre de boutons pleins
  const boutons = G.map((m) => { const s = m.v.statut, n = m.pleins.length;
    if (m.v.plein) return n <= 1 ? 1 : 0;
    if (s && AVEC_BOUTON[s]) return n === 1 ? 1 : 0;
    if (s && SANS_BOUTON.includes(s)) return n === 0 ? 1 : 0;
    return n <= 1 ? 1 : 0; });
  const coherence = comp("cohérence", 7, [["5 tailles au plus", moy(G.map((m) => lin(m.tailles.length, 5, 7))), 2],
    ["3 graisses, 600 au plus", moy(G.map((m) => lin(m.graisses.length, 3, 5) * (Math.max(...m.graisses) > 600 ? 0.5 : 1))), 1.5],
    ["3 teintes vives au plus", moy(G.map((m) => lin(m.teintes.length, 3, 5))), 1.5], ["boutons pleins attendus", moy(boutons), 2]]);

  // Lisibilité : 12 px au moins, contraste AA, et la petite fenêtre garde le bouton plein et le texte entier
  const petit = mesures.filter((v) => v.petit).map((v) => { const m = v.petit, s = v.statut, rx = s && AVEC_BOUTON[s];
    const bouton = !rx || v.plein ? 1 : m.pleins.some((b: any) => b.visible && rx.test(b.texte)) ? 1 : 0;
    return bouton * (m.debordement.texteCoupe ? 0.5 : 1); });
  const lisibilite = comp("lisibilité", 5, [["texte de 12 px au moins", moy(G.map((m) => (m.plusPetit ?? 12) >= 12 ? 1 : (m.plusPetit ?? 0) >= 11 ? 0.5 : 0)), 1],
    ["contraste le plus faible ≥ 4,5", moy(G.map((m) => (m.contrasteMin == null ? 1 : lin(-m.contrasteMin, -4.5, -2.5)))), 2.5], ["fenêtre de 760 × 560", moy(petit), 1.5]]);

  // Mise en page : toute la file visible, le bon bouton plein sans défiler, la preuve à 45 % de la largeur ou plus
  const toi = G.find((m) => m.v.vue === "toi");
  const m2 = G.filter((m) => m.v.statut && AVEC_BOUTON[m.v.statut] && !m.v.plein).map((m) => (m.pleins.some((b: any) => b.visible && AVEC_BOUTON[m.v.statut].test(b.texte)) ? 1 : 0));
  const m6 = G.filter((m) => m.v.id && AVEC_PREUVE.includes(m.v.id) && !m.v.plein).map((m) => lin(-(m.images[0]?.largeur ?? 0) / 1280, -0.45, -0.2));
  const miseEnPage = comp("mise en page", 4, [["file entière dans la colonne", toi ? toi.titresAToi.vus / Math.max(1, toi.titresAToi.total) : 0, 1],
    ["bouton plein visible, bon libellé", moy(m2), 1.5], ["preuve à 45 % ou plus", moy(m6), 1.5]]);

  // Gestes : ⌘K, ↓, et après le bouton plein la demande suivante, « Annuler » qui rouvre, rien d'envoyé avant 5 s
  const ge = gestes ?? {};
  const gest = comp("gestes", 3, [["⌘K dans la barre", ge.cmdK ? 1 : 0, 0.5], ["↓ ouvre la suivante", ge.fleche ? 1 : 0, 0.5], ["clic : la suivante s'ouvre", ge.suivante ? 1 : 0, 0.7],
    ["bandeau « Annuler » qui rouvre", ge.annuler ? (ge.rouvre ? 1 : 0.5) : 0, 0.6], ["rien d'envoyé avant 5 s ni après Annuler", ge.suivante && ge.pasDEnvoiAvant5s ? (ge.annuleRienParti === false ? 0.5 : 1) : 0, 0.7]]);

  // Détecteur impeccable : constats moyens par vue scannée (0 → 3 points, 8 ou plus → 0)
  const scans = Object.entries(impeccable ?? {}).filter(([, x]) => Array.isArray(x)) as [string, any[]][];
  const parVue = scans.map(([, x]) => x.filter((c) => !IGNORES.includes(c.antipattern)).length);
  const regles = [...new Set(scans.flatMap(([, x]) => x.map((c) => c.antipattern)).filter((r) => !IGNORES.includes(r)))];
  const imp = comp("impeccable", 3, [["constats par vue", scans.length ? lin(moy(parVue), 0, 8) : 0, 3]]);
  detail.impeccable.regles = regles; detail.impeccable.vues = scans.length;

  const brut = sobriete + regroupement + coherence + lisibilite + miseEnPage + gest + imp;
  const vues = Object.fromEntries(G.map((m) => [m.v.vue, { fixes: m.mots.fixesVolet, volet: m.mots.volet, cadres: m.cadres.length, etiquettes: m.etiquettes.length, tailles: m.tailles.length,
    graisses: m.graisses.length, teintes: m.teintes.length, pleins: m.pleins.length, plusPetit: m.plusPetit, contraste: m.contrasteMin }]));
  return { total: elim.length ? 0 : r1(brut), sansEliminatoire: r1(brut), max: 40, eliminatoire: elim, composantes: detail, vues };
}

if (import.meta.main) {
  const sansBanc = process.argv.includes("--sans-banc");
  console.log(sansBanc ? "banc : sauté (--sans-banc, note éliminée)" : "banc…");
  const banc = sansBanc ? { ok: false, sortie: "sauté (--sans-banc)" } : await lancer(["sh", "eval/banc.sh", String(PORT)], 420_000);
  if (!sansBanc) console.log(banc.ok ? "banc : tout est juste" : `banc : ÉCHEC\n${banc.sortie.slice(-600)}`);
  const check = await lancer(["bun", "server.ts", "--check"], 60_000);
  console.log(check.ok ? "vérification : tout est juste" : `vérification : ÉCHEC\n${check.sortie.slice(-400)}`);
  console.log("captures…");
  const captures = await lancer(["bun", "eval/captures.ts", "--port", String(PORT), "--out", OUT], 900_000);
  if (!captures.ok) console.log(captures.sortie.slice(-600));
  const lire = (f: string, d: any) => { try { return existsSync(`${OUT}/${f}`) ? JSON.parse(readFileSync(`${OUT}/${f}`, "utf8")) : d; } catch { return d; } };
  const s = noter(captures.ok ? lire("mesures.json", []) : [], lire("impeccable.json", {}), lire("gestes.json", {}), { banc, check, captures });
  console.log("\nvue                         fixes volet cadres étiq. tailles graisses teintes pleins  px  contraste");
  for (const [k, v] of Object.entries<any>(s.vues)) console.log(`${k.padEnd(27)} ${[v.fixes, v.volet, v.cadres, v.etiquettes, v.tailles, v.graisses, v.teintes, v.pleins].map((x) => String(x).padStart(5)).join(" ")}  ${String(v.plusPetit).padStart(3)}  ${v.contraste}`);
  console.log("");
  for (const [k, c] of Object.entries<any>(s.composantes)) console.log(`${k.padEnd(13)} ${String(c.points).padStart(4)} / ${c.max}   ${Object.entries(c.parts).map(([l, x]) => `${l} ${x}`).join(" · ")}`);
  if (s.composantes.impeccable.regles.length) console.log(`              règles impeccable relevées : ${s.composantes.impeccable.regles.join(", ")}`);
  if (s.eliminatoire.length) console.log(`\nÉLIMINATOIRE (${s.eliminatoire.length}) :\n- ${[...new Set(s.eliminatoire)].slice(0, 12).join("\n- ")}`);
  console.log(`\nNOTE AUTOMATIQUE : ${s.total} / 40${s.eliminatoire.length ? ` (${s.sansEliminatoire} sans les éliminatoires)` : ""}`);
  writeFileSync(`${OUT}/score.json`, JSON.stringify({ date: new Date().toISOString(), ...s, banc: banc.ok, check: check.ok, captures: captures.ok }, null, 1));
}
