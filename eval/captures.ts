// Captures et mesures de chaque vue : bun eval/captures.ts --port <p> --out <dossier>
// Lance le serveur sur une copie temporaire de eval/jeu (faux claude, gh, security, open en tête du PATH, relève éteinte),
// ouvre chaque adresse du contrat dans Chrome sans fenêtre, piloté par le protocole DevTools : horloge arrêtée à MAINTENANT,
// stockage vidé, animations coupées. Pour chaque vue et chaque taille : une capture PNG et des mesures prises dans la page.
// Sortie : <out>/grand/<vue>.png (1280×860), <out>/petit/<vue>.png (760×560), <out>/mesures/<vue>.json, <out>/mesures.json,
// <out>/impeccable.json. Le serveur et Chrome sont arrêtés à la fin, même en cas d'échec.
import { mkdirSync, cpSync, readFileSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import { MAINTENANT, PIEGE, fabriquer } from "./donnees.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const PORT = +(arg("--port") ?? 0), OUT = resolve(arg("--out") ?? "");
if (!PORT || !arg("--out")) { console.error("usage : bun eval/captures.ts --port <p> --out <dossier>"); process.exit(2); }
if ([4117, 4118].includes(PORT) || PORT < 4199) { console.error("port 4199 ou plus (4117 et 4118 sont à l'application de Simon)"); process.exit(2); }

const ICI = resolve(import.meta.dir, ".."), JEU = `${ICI}/eval/jeu`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const U = `http://127.0.0.1:${PORT}`;
export const TAILLES = { grand: [1280, 860], petit: [760, 560], etroit: [720, 480] } as const;
const COLONNE = 300; // à 1280 px, tout texte dont le centre est à gauche de 300 px appartient à la colonne

// Les vues : nom → adresse, sorte (pour les plafonds de mots), demande montrée.
const IDS = ["valider-interface", "valider-bug", "en-ligne-seul", "reponse", "question", "panne", "sans-preuve", "ancien", "longue", "travail", "en-cours", "file", "envoyee", "classee", "arion-passee"];
export const VUES: { nom: string; adresse: string; sorte: "demande" | "client" | "arrivees" | "vide"; id?: string; plein?: boolean }[] = [
  { nom: "toi", adresse: "#", sorte: "demande" },
  { nom: "rien", adresse: "#rien", sorte: "vide" },
  { nom: "arrivees", adresse: "#arrivees", sorte: "arrivees" },
  ...["arion", "buckwell", "garonne"].map((c) => ({ nom: `client-${c}`, adresse: `#c=${c}`, sorte: "client" as const })),
  ...IDS.map((id) => ({ nom: `demande-${id}`, adresse: `#d=${id}`, sorte: "demande" as const, id })),
  ...["avant", "apres", "video"].map((v) => ({ nom: `preuve-${v}`, adresse: `#d=valider-interface&v=${v}`, sorte: "demande" as const, id: "valider-interface" })),
  { nom: "preuve-plein", adresse: "#d=valider-interface&plein", sorte: "demande", id: "valider-interface", plein: true },
];

// ───────────────────────── mesure prise dans la page (sérialisée telle quelle) ─────────────────────────
function mesurer(contenus: string[], titresAToi: string[], colonne: number, piege: string) {
  const W = innerWidth, H = innerHeight, S = (e: Element) => getComputedStyle(e);
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const rgba = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const sur = (a: number[], b: number[]) => { const al = a[3]; return [a[0] * al + b[0] * (1 - al), a[1] * al + b[1] * (1 - al), a[2] * al + b[2] * (1 - al), 1]; };
  const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const contraste = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c: number[]) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const teinte = (c: number[]) => { // teinte vive (saturation et luminosité moyennes) ou null pour un gris
    const [r, g, b] = c.slice(0, 3).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (d < 0.0001) return null; const s = d / (1 - Math.abs(2 * l - 1));
    if (s < 0.35 || l < 0.12 || l > 0.93 || (c[3] ?? 1) < 0.3) return null;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    return Math.round(h / 30) % 12; };
  const visible = (el: Element | null) => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = S(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; } return true; };
  const opacite = (el: Element) => { let o = 1; for (let e: Element | null = el; e; e = e.parentElement) o *= +S(e).opacity; return o; };
  // rectangle visible : coupé par les ancêtres qui masquent leur débordement, puis par la fenêtre
  const coupe = (el: Element, r: DOMRect | { left: number; top: number; right: number; bottom: number }, fenetre = true) => {
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const s = S(e); if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const q = e.getBoundingClientRect();
      if (s.overflowX !== "visible") { x1 = Math.max(x1, q.left); x2 = Math.min(x2, q.right); }
      if (s.overflowY !== "visible") { y1 = Math.max(y1, q.top); y2 = Math.min(y2, q.bottom); }
    }
    if (fenetre) { x1 = Math.max(x1, 0); y1 = Math.max(y1, 0); x2 = Math.min(x2, W); y2 = Math.min(y2, H); }
    return x2 - x1 >= 1 && y2 - y1 >= 1 ? { left: x1, top: y1, right: x2, bottom: y2 } : null; };
  const devant = (el: Element, r: { left: number; top: number; right: number; bottom: number }) => { // rien ne le recouvre (barre fixe, plein écran)
    const h = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    return !!h && (h === el || el.contains(h) || h.contains(el)); };
  const fondDe = (el: Element | null): number[] | null => { // fond effectif sous un élément, ou null sous une image ou un dégradé
    const couches: number[][] = [];
    for (let e = el; e; e = e.parentElement) { const s = S(e); if (s.backgroundImage !== "none") return null; const c = rgba(s.backgroundColor); if (c && c[3] > 0) { couches.push(c); if (c[3] >= 1) break; } }
    let f = [255, 255, 255, 1]; for (const c of couches.reverse()) f = sur(c, f); return f; };

  // ── texte visible ──
  const contenusN = contenus.map(norm).filter((s) => s.length >= 2).sort((a, b) => b.length - a.length);
  const contenusMin = contenusN.map((s) => s.toLowerCase());
  const estContenu = (t: string) => { const x = norm(t).replace(/[…\.]+$/, "").toLowerCase(); return x.length >= 4 && contenusMin.some((c) => c.includes(x)); };
  const sansContenu = (t: string) => { let x = norm(t); for (const c of contenusN) if (c.length <= 80 && x.includes(c)) x = x.split(c).join(" "); return x; };
  const MOIS = "janv|févr|fév|mars|avr|mai|juin|juil|août|sept|oct|nov|déc";
  const mots = (t: string) => t.replace(new RegExp(`\\b\\d{1,2}\\s(${MOIS})\\.?`, "giu"), " ").replace(/\d+\s?(min|h|j|s|mois|ans?)\b/giu, " ")
    .split(/[\s·•|,;:!?()«»"“”\/\-–—…+✓×]+/u).filter((w) => /\p{L}/u.test(w));
  const textes: any[] = [], tailles = new Set<number>(), graisses = new Set<number>(), couleursTexte = new Set<string>(), teintes = new Set<number>();
  let plusPetit = Infinity, plusPetitTexte = "", pire = Infinity, pireTexte = "", sousAA = 0, debordeTexte = 0;
  const marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n: Node | null; (n = marche.nextNode());) {
    const t = n.nodeValue ?? ""; if (!t.trim()) continue;
    const el = n.parentElement!; if (el.closest("script,style,noscript,template,textarea,select,option") || !visible(el)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    let vu: any = null, lignes = 0; const rs = [...rg.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    for (const r of rs) { const nu = coupe(el, r, false); if (nu && nu.right > W + 1) debordeTexte++; const c = coupe(el, r); if (c && devant(el, c)) { vu ??= c; lignes++; } }
    if (!vu) continue;
    const part = lignes / Math.max(1, rs.length); // texte replié (deux lignes sur six) : on ne compte que la part visible
    const s = S(el), px = Math.round(parseFloat(s.fontSize) * 2) / 2, w = +s.fontWeight;
    const fg = rgba(s.color)!, fond = fondDe(el); const coul = [fg[0], fg[1], fg[2], fg[3] * opacite(el)];
    const region = (vu.left + vu.right) / 2 < colonne ? "colonne" : "volet";
    const contenu = !!el.closest("[data-contenu]") || estContenu(t), editable = !!el.closest("[contenteditable]:not([contenteditable=false])");
    textes.push({ t: norm(t), part, region, contenu, editable, mono: /mono|menlo|courier|consolas/i.test(s.fontFamily) || s.fontVariantNumeric.includes("tabular") });
    tailles.add(px); graisses.add(w); if (px < plusPetit) { plusPetit = px; plusPetitTexte = norm(t).slice(0, 40); }
    if (fond) { const c = sur(coul, fond); couleursTexte.add(hex(c)); const k = contraste(c, fond); const tt = teinte(c); if (tt != null) teintes.add(tt);
      if (k < pire) { pire = k; pireTexte = `${norm(t).slice(0, 40)} (${hex(c)} sur ${hex(fond)})`; } if (k < 4.5) sousAA++; }
  }
  const compte = (region: string, fixe: boolean, uniques = false) => {
    const ws = textes.filter((x) => x.region === region && !x.editable && !(fixe && x.contenu)).flatMap((x) => { const m = mots(fixe ? sansContenu(x.t) : x.t); return m.slice(0, Math.ceil(m.length * x.part)); }).map((w) => w.toLowerCase());
    return uniques ? new Set(ws).size : ws.length; };

  // ── encadrés, étiquettes, boutons pleins ──
  const cadres: any[] = [], etiquettes: any[] = [], pleins: any[] = [], images: any[] = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect(), c = coupe(el, r); if (!c) continue;
    const w = c.right - c.left, h = c.bottom - c.top, s = S(el), tag = el.tagName.toLowerCase();
    const rect = [c.left, c.top, w, h].map(Math.round), double = () => cadres.some((k) => k.rect.every((v: number, i: number) => Math.abs(v - rect[i]) <= 3)); // enveloppe et contenu de même taille : un seul cadre
    if (tag === "img" || tag === "video" || tag === "canvas") { if (w >= 200 && h >= 120) { images.push({ tag, largeur: Math.round(w), haut: Math.round(c.top), bas: Math.round(c.bottom) }); if (!double()) cadres.push({ tag, pourquoi: "image", rect }); } continue; }
    if (["input", "select"].includes(tag) && /checkbox|radio|range/.test((el as HTMLInputElement).type)) continue;
    const bg = rgba(s.backgroundColor), parentFond = fondDe(el.parentElement), propre = bg && bg[3] > 0.02 && parentFond ? sur(bg, parentFond) : null;
    const fondDistinct = !!(propre && parentFond && Math.max(...[0, 1, 2].map((i) => Math.abs(propre[i] - parentFond[i]))) >= 3);
    const bouton = tag === "button" || tag === "a" || el.getAttribute("role") === "button" || (tag === "input" && /submit|button/.test((el as HTMLInputElement).type));
    if (bouton && propre && parentFond && bg![3] >= 0.5 && contraste(propre, parentFond) >= 3) { pleins.push({ texte: norm(el.textContent ?? "").slice(0, 40), bas: Math.round(r.bottom), x: Math.round((c.left + c.right) / 2), y: Math.round((c.top + c.bottom) / 2), visible: r.bottom <= H && r.top >= 0 && devant(el, c) }); continue; }
    if (w < 40 || h < 18) continue;
    const cotes = ["Top", "Right", "Bottom", "Left"].filter((k) => { const bw = parseFloat((s as any)[`border${k}Width`]), st = (s as any)[`border${k}Style`], col = rgba((s as any)[`border${k}Color`]); return bw >= 0.5 && st !== "none" && st !== "hidden" && col && col[3] > 0.05; }).length;
    const ombre = s.boxShadow !== "none" && /rgba?\(/.test(s.boxShadow) && s.boxShadow.split(/,(?![^(]*\))/).some((o) => { const col = rgba(o); const nums = (o.replace(/rgba?\([^)]*\)/, "").match(/-?[\d.]+px/g) ?? []).map(parseFloat); return col && col[3] > 0.03 && nums.some((v) => v !== 0); });
    const pourquoi = cotes >= 3 ? "bordure" : ombre ? "ombre" : fondDistinct ? "fond" : "";
    if (!pourquoi) continue;
    if (pourquoi === "fond" && c.right <= colonne + 10 && w >= 150 && h <= 72) continue; // la ligne ouverte de la colonne
    if (pourquoi === "fond" && h <= 30 && el.parentElement?.querySelector(":scope > input, :scope > textarea, :scope > [contenteditable]")) continue; // la puce posée dans la barre
    if (pourquoi === "fond" && h <= 30 && w <= 240 && (el.textContent ?? "").trim()) { etiquettes.push({ texte: norm(el.textContent ?? "").slice(0, 30) }); continue; }
    if (double()) continue;
    cadres.push({ tag, pourquoi, rect });
  }
  for (const el of document.body.querySelectorAll("*")) { const s = S(el); if (!visible(el)) continue;
    for (const k of ["backgroundColor", "borderTopColor", "borderLeftColor"]) { const c = rgba((s as any)[k]); if (!c || c[3] < 0.3) continue; if (k !== "backgroundColor" && parseFloat(s[k.replace("Color", "Width") as any]) < 0.5) continue;
      const r = el.getBoundingClientRect(); if (!coupe(el, r)) continue; const t = teinte(c); if (t != null) teintes.add(t); } }

  // ── la colonne montre-t-elle toutes les demandes de « À toi » sans défiler ? ──
  const enColonne = textes.filter((x) => x.region === "colonne").map((x) => x.t.replace(/…$/, "").toLowerCase());
  const titresVus = titresAToi.filter((ti) => { const t = norm(ti).toLowerCase(); return enColonne.some((x) => x.length >= 6 && (t.startsWith(x) || x.startsWith(t.slice(0, 18)))); }).length;
  const champs = [...document.querySelectorAll("input[placeholder],textarea[placeholder],[data-placeholder],[aria-placeholder]")].filter((e) => visible(e) && coupe(e, e.getBoundingClientRect()))
    .map((e) => e.getAttribute("placeholder") ?? e.getAttribute("data-placeholder") ?? e.getAttribute("aria-placeholder") ?? "");
  const de = document.documentElement;
  const defilants = [...document.body.querySelectorAll("*")].filter((e) => { const s = S(e); return /auto|scroll/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1 && visible(e); }).length;
  return {
    mots: { colonne: compte("colonne", false), volet: compte("volet", false), fixesColonne: compte("colonne", true), fixesColonneUniques: compte("colonne", true, true), fixesVolet: compte("volet", true) },
    texteVolet: textes.filter((x) => x.region === "volet" && !x.contenu).map((x) => x.t).join(" | ").slice(0, 1500),
    cadres, etiquettes, pleins, images: images.sort((a, b) => b.largeur - a.largeur),
    tailles: [...tailles].sort((a, b) => a - b), graisses: [...graisses].sort((a, b) => a - b), couleursTexte: [...couleursTexte], teintes: [...teintes].sort((a, b) => a - b),
    plusPetit: plusPetit === Infinity ? null : plusPetit, plusPetitTexte, contrasteMin: pire === Infinity ? null : Math.round(pire * 100) / 100, contrasteMinTexte: pireTexte, sousAA,
    debordement: { page: Math.max(de.scrollWidth, document.body.scrollWidth) > W + 1, texteCoupe: debordeTexte, defilants },
    titresAToi: { vus: titresVus, total: titresAToi.length },
    invites: champs.map((p) => ({ texte: p, mots: p.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length })),
    piege: (window as any).__kaolyXss === 1 || !!document.querySelector(`[${piege}]`),
    motsTotal: textes.length ? textes.flatMap((x) => mots(x.t)).length : 0,
  };
}

// ───────────────────────── Chrome par le protocole DevTools ─────────────────────────
async function chrome(profil: string) {
  const p = Bun.spawn([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio", "--disable-extensions",
    "--force-device-scale-factor=1", "--remote-debugging-port=0", `--user-data-dir=${profil}`, "about:blank"], { stdout: "ignore", stderr: "pipe" });
  const lecteur = p.stderr.getReader(), dec = new TextDecoder(); let tampon = "", url = "";
  const limite = Date.now() + 20_000;
  while (!url && Date.now() < limite) { const { value, done } = await lecteur.read(); if (done) break; tampon += dec.decode(value); url = tampon.match(/DevTools listening on (ws:\/\/\S+)/)?.[1] ?? ""; }
  if (!url) { p.kill(); throw new Error("Chrome sans fenêtre ne démarre pas"); }
  (async () => { try { while (!(await lecteur.read()).done); } catch {} })(); // vider stderr
  const ws = new WebSocket(url); await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  let seq = 0; const attente = new Map<number, any>(), ecoutes: ((m: any) => void)[] = [];
  ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); const a = m.id && attente.get(m.id); if (a) { attente.delete(m.id); m.error ? a.ko(new Error(`${a.methode} : ${m.error.message}`)) : a.ok(m.result); } else ecoutes.forEach((f) => f(m)); };
  const envoi = (methode: string, params: any = {}, sessionId?: string): Promise<any> => new Promise((ok, ko) => {
    const id = ++seq; attente.set(id, { ok, ko, methode }); ws.send(JSON.stringify({ id, method: methode, params, sessionId }));
    setTimeout(() => attente.has(id) && (attente.delete(id), ko(new Error(`${methode} : pas de réponse`))), 30_000); });
  const port = +new URL(url).port;
  return { p, ws, envoi, ecoutes, port, fermer: () => { try { ws.close(); } catch {} p.kill(); } };
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!existsSync(`${JEU}/tickets.json`)) await fabriquer(JEU);
  const tmp = mkdtempSync(`${tmpdir()}/kaoly-mesure-`), D = `${tmp}/donnees`;
  cpSync(JEU, D, { recursive: true });
  writeFileSync(`${D}/tickets.json`, readFileSync(`${D}/tickets.json`, "utf8").replaceAll("__DOSSIER__", D));
  for (const s of ["grand", "petit", "mesures"]) { rmSync(`${OUT}/${s}`, { recursive: true, force: true }); mkdirSync(`${OUT}/${s}`, { recursive: true }); }
  mkdirSync(`${tmp}/log`);
  let srv: any = null, br: any = null;
  const fin = () => { br?.fermer(); srv?.kill(); try { rmSync(tmp, { recursive: true, force: true }); } catch {} };
  process.on("SIGINT", () => { fin(); process.exit(130); }); process.on("SIGTERM", () => { fin(); process.exit(143); });
  try {
    for (const f of ["claude", "gh", "security", "open", "pbcopy"]) if (!existsSync(`${ICI}/eval/faux/${f}`)) throw new Error(`faux ${f} absent : pas de serveur d'essai sans lui`);
    srv = Bun.spawn(["bun", "server.ts"], { cwd: ICI, stdout: Bun.file(`${tmp}/log/serveur.log`), stderr: "pipe",
      env: { ...process.env, KAOLY_CLIENTS_DIR: D, PORT: String(PORT), KAOLY_WA_DB: "/nonexistent", PATH: `${ICI}/eval/faux:${process.env.PATH}`, FAUX_LOG: `${tmp}/log`, KAOLY_DELAI: "3000" } });
    let etat: any = null;
    for (let i = 0; i < 60 && !etat; i++) { await pause(250); etat = await fetch(`${U}/api/state`).then((r) => (r.ok ? r.json() : null), () => null); }
    if (!etat) throw new Error(`le serveur ne répond pas sur ${U} : ${(await new Response(srv.stderr).text()).slice(-400)}`);
    const tickets = etat.tickets, attendus = JSON.parse(readFileSync(`${JEU}/tickets.json`, "utf8"));
    const ecarts = attendus.filter((a: any) => tickets.find((t: any) => t.id === a.id)?.status !== a.status).map((a: any) => a.id);
    if (ecarts.length) throw new Error(`le serveur n'a pas gardé l'état du jeu d'essai : ${ecarts.join(", ")}`);
    // tout ce qui vient du client, de Claude ou de la configuration : retiré du compte des mots fixes
    const prenoms = tickets.map((t: any) => String(t.source?.name ?? "").split(" ")[0]);
    const contenus = [...new Set([...tickets.flatMap((t: any) => [t.title, t.request, t.summary, t.change, t.reserve, t.question, t.error, t.draft?.to, t.draft?.subject, t.draft?.body,
      t.source?.name, t.source?.from, t.source?.subject, t.client, t.pr, t.step, ...(t.live ?? []), ...(t.files ?? []).map((f: string) => f.split("/").pop()), ...t.request.split("\n"), ...String(t.summary ?? "").split("\n"), ...String(t.draft?.body ?? "").split("\n")]),
      ...prenoms, ...etat.clients.flatMap((c: any) => [c.name, c.repo, ...c.contacts]), etat.mail.user].filter((s) => typeof s === "string" && s.trim().length >= 2))];
    const aToi = tickets.filter((t: any) => ["question", "valider", "message", "erreur"].includes(t.status)).map((t: any) => t.title);

    br = await chrome(`${tmp}/chrome`);
    const { targetId } = await br.envoi("Target.createTarget", { url: "about:blank" });
    const { sessionId: sid } = await br.envoi("Target.attachToTarget", { targetId, flatten: true });
    const e = (m: string, p: any = {}) => br.envoi(m, p, sid);
    let erreurs: string[] = [];
    br.ecoutes.push((m: any) => { if (m.sessionId !== sid) return;
      if (m.method === "Runtime.exceptionThrown") erreurs.push(`exception : ${m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text}`.slice(0, 300));
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") erreurs.push(`console : ${m.params.args.map((a: any) => a.value ?? a.description).join(" ")}`.slice(0, 300));
      if (m.method === "Network.responseReceived" && m.params.response.status >= 400 && m.params.response.url.startsWith(U) && !m.params.response.url.endsWith("/favicon.ico")) erreurs.push(`HTTP ${m.params.response.status} : ${m.params.response.url.slice(U.length)}`); });
    await Promise.all(["Page.enable", "Runtime.enable", "Network.enable"].map((m) => e(m)));
    await e("Emulation.setFocusEmulationEnabled", { enabled: true });
    await e("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
    const fige = Date.parse(MAINTENANT);
    await e("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { if (location.protocol !== "http:") return; const V = Date, d = ${fige} - V.now();
      class F extends V { constructor(...a) { a.length ? super(...a) : super(V.now() + d); } static now() { return V.now() + d; } } globalThis.Date = F;
      addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}"; document.head.appendChild(s); }); })();` });
    const ouvrir = async (adresse: string, [w, h]: readonly number[]) => {
      await e("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await e("Page.navigate", { url: "about:blank" }); await pause(50);
      await e("Storage.clearDataForOrigin", { origin: U, storageTypes: "local_storage,session_storage" }).catch(() => {});
      erreurs = [];
      await e("Page.navigate", { url: `${U}/${adresse}` });
      let avant = "", stable = 0; const t0 = Date.now();
      while (Date.now() - t0 < 9000) { // texte et images qui ne bougent plus pendant 3 relevés, après au moins 1 s
        await pause(250);
        const { result } = await e("Runtime.evaluate", { expression: `document.readyState + "|" + (document.body?.innerText.length ?? 0) + "|" + [...document.images].filter((i) => i.complete).length + "/" + document.images.length`, returnByValue: true });
        const v = String(result.value); stable = v === avant && v.startsWith("complete") && !/\|0\|/.test(v) ? stable + 1 : 0; avant = v;
        if (stable >= 3 && Date.now() - t0 > 1000) break;
      }
      await e("Runtime.evaluate", { awaitPromise: true, expression: `Promise.all([document.fonts.ready, ...[...document.querySelectorAll("video")].map((v) => new Promise((ok) => {
        v.pause(); v.muted = true; const go = () => { v.onseeked = ok; v.currentTime = Math.max(0, Math.min(2.4, (v.duration || 3) - 0.05)); setTimeout(ok, 3000); };
        v.readyState >= 1 ? go() : (v.onloadedmetadata = go, v.load(), setTimeout(ok, 3000)); }))]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))` });
    };
    const mesure = async () => (await e("Runtime.evaluate", { returnByValue: true,
      expression: `(${mesurer.toString()})(${JSON.stringify(contenus)}, ${JSON.stringify(aToi)}, ${COLONNE}, ${JSON.stringify(PIEGE)})` })).result.value;

    const tout: any[] = [];
    for (const v of VUES) {
      const r: any = { vue: v.nom, adresse: v.adresse, sorte: v.sorte, id: v.id ?? null, plein: !!v.plein, statut: v.id ? tickets.find((t: any) => t.id === v.id)?.status : null, shipped: v.id ? tickets.find((t: any) => t.id === v.id)?.shipped ?? null : null };
      for (const [taille, dims] of Object.entries(TAILLES)) {
        await ouvrir(v.adresse, dims);
        const m = await mesure();
        if (taille !== "etroit") {
          const { data } = await e("Page.captureScreenshot", { format: "png", fromSurface: true });
          writeFileSync(`${OUT}/${taille}/${v.nom}.png`, Buffer.from(data, "base64"));
          r[taille] = { ...m, erreurs: [...erreurs] };
        } else r.etroit = { debordement: m.debordement, erreurs: [...erreurs] };
      }
      writeFileSync(`${OUT}/mesures/${v.nom}.json`, JSON.stringify(r, null, 1));
      tout.push(r);
      const g = r.grand; console.log(`${v.nom.padEnd(26)} mots fixes ${String(g.mots.fixesVolet).padStart(3)} · cadres ${String(g.cadres.length).padStart(2)} · tailles ${g.tailles.length} · pleins ${g.pleins.length}${g.erreurs.length ? ` · ERREURS ${g.erreurs.length}` : ""}`);
    }
    writeFileSync(`${OUT}/mesures.json`, JSON.stringify(tout, null, 1));

    // détecteur impeccable, sur la page telle que Chrome l'affiche (aucun envoi : télémétrie coupée)
    const constats: any = {};
    for (const nom of ["toi", "demande-valider-interface", "demande-question", "client-arion", "arrivees", "rien"]) {
      const v = VUES.find((x) => x.nom === nom)!; await ouvrir(v.adresse, TAILLES.grand);
      const p = Bun.spawn(["bunx", "impeccable@4.8.2", "detect", "--json", "--no-config", "--cdp", String(br.port), "--target", `${PORT}/`], { cwd: tmp, stdout: "pipe", stderr: "pipe",
        env: { ...process.env, IMPECCABLE_NO_TELEMETRY: "1", DO_NOT_TRACK: "1" } });
      const t = setTimeout(() => p.kill(), 90_000); const [txt] = await Promise.all([new Response(p.stdout).text(), p.exited]); clearTimeout(t);
      try { constats[nom] = JSON.parse(txt); } catch { constats[nom] = { erreur: (txt || (await new Response(p.stderr).text())).slice(-300) }; }
    }
    writeFileSync(`${OUT}/impeccable.json`, JSON.stringify(constats, null, 1));

    // gestes du contrat (§2.2, §2.7), en dernier : ils peuvent changer l'état du serveur
    const touche = async (key: string, code: string, vk: number, modifiers = 0) => { for (const type of ["keyDown", "keyUp"]) await e("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, modifiers }); await pause(400); };
    const clic = async (x: number, y: number) => { for (const type of ["mousePressed", "mouseReleased"]) await e("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); await pause(600); };
    const lit = async (expr: string) => (await e("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;
    const etatDe = async (id: string) => (await fetch(`${U}/api/state`).then((r) => r.json())).tickets.find((t: any) => t.id === id)?.status;
    const g: any = {};
    await ouvrir("#d=valider-bug", TAILLES.grand); await lit("document.activeElement?.blur()");
    await touche("k", "KeyK", 75, 4); // ⌘K
    g.cmdK = await lit(`(() => { const a = document.activeElement; return !!a && (/INPUT|TEXTAREA/.test(a.tagName) || a.isContentEditable) && a.getBoundingClientRect().top > innerHeight * 0.6; })()`);
    await ouvrir("#d=valider-bug", TAILLES.grand); await lit("document.activeElement?.blur()");
    const avantFleche = await lit("location.hash + document.body.innerText.length");
    await touche("ArrowDown", "ArrowDown", 40);
    g.fleche = (await lit("location.hash + document.body.innerText.length")) !== avantFleche;
    await ouvrir("#d=valider-bug", TAILLES.grand);
    const b = (await mesure()).pleins.find((x: any) => x.visible && /mettre en ligne/i.test(x.texte));
    g.bouton = !!b;
    if (b) {
      // le haut du volet (texte à droite de la colonne, 160 premiers pixels) : il change quand une autre demande s'ouvre
      const h1 = `(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), o = []; for (let n; (n = w.nextNode());) { if (!n.nodeValue.trim()) continue;
        const r = n.parentElement.getBoundingClientRect(); if (r.width && r.left + r.width / 2 >= ${COLONNE} && r.top >= 0 && r.top < 160) o.push(n.nodeValue.trim()); } return o.join("|"); })()`;
      const titre = await lit(h1);
      await clic(b.x, b.y);
      g.suivante = (await lit(h1)) !== titre;
      const annuler = await lit(`(() => { const a = [...document.querySelectorAll("button,a,[role=button],span")].find((x) => /^annuler$/i.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
        if (!a) return null; const r = a.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
      g.annuler = !!annuler;
      g.pasDEnvoiAvant5s = (await etatDe("valider-bug")) === "valider";
      if (annuler) { await clic(annuler[0], annuler[1]); g.rouvre = /d=valider-bug/.test(await lit("location.hash")); await pause(5500); g.annuleRienParti = (await etatDe("valider-bug")) === "valider"; }
    }
    writeFileSync(`${OUT}/gestes.json`, JSON.stringify(g, null, 1));
    console.log(`gestes : ${Object.entries(g).map(([k, v]) => `${k} ${v ? "oui" : "non"}`).join(" · ")}`);
    console.log(`captures : ${VUES.length} vues dans ${OUT}`);
  } finally { fin(); }
}

if (import.meta.main) await main().catch((err) => { console.error(`ÉCHEC des captures : ${err.message}`); process.exit(1); });
