/**
 * Calcoli puri del portale: nessuna dipendenza da Cloudflare o da Astro,
 * così si possono testare con node:test (tests/) anche dove workerd non gira.
 */
import type { Materia } from './percorso';
import type { DomandaCompleta } from '../shared/schemi';

const ACCENTI: Record<string, string> = { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù' };

/** "SVILUPPO DEI SISTEMI ECONOMICI E DELLA SOCIETA'" -> "Sviluppo dei sistemi economici e della società" */
export function nomeLeggibile(maiuscolo: string): string {
  const minuscolo = maiuscolo
    .toLowerCase()
    .replace(/([aeiou])'(?=\s|$)/g, (_, v: string) => ACCENTI[v] ?? v)
    .replace(/\s+/g, ' ')
    .trim();
  return minuscolo.charAt(0).toUpperCase() + minuscolo.slice(1);
}

/** Accenti scritti con l'apostrofo nel piano ("liberta'", "piu'") -> lettere accentate. */
export function testoLeggibile(testo: string): string {
  return testo
    .replace(/(\p{L}{2,}t)a'(?=[^\p{L}]|$)/gu, '$1à')
    .replace(/(\p{L}{2,}t)u'(?=[^\p{L}]|$)/gu, '$1ù')
    .replace(/\b([Pp])iu'/g, '$1iù')
    .replace(/\b([Gg])ia'/g, '$1ià')
    .replace(/\b([Pp])uo'/g, '$1uò')
    .replace(/\b(perch|poich|affinch|bench|finch)e'/gi, '$1é')
    .replace(/\b([Cc])ioe'/g, '$1ioè')
    .replace(/\b([Cc])osi'/g, '$1osì')
    .replace(/(^|\s)e'(?=\s)/g, '$1è')
    .replace(/(^|\s)E'(?=\s)/g, '$1È');
}

export function slugDa(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Stato didattico provvisorio, finché i voti non arrivano dal database (task t009). */
export function statoDidattico(m: Materia, oggi = new Date()): 'in-corso' | 'da-seguire' {
  if (!m.date) return 'da-seguire';
  const [inizio] = m.date.split(' - ');
  const [g, mm, a] = inizio.split('/').map(Number);
  return new Date(a, mm - 1, g) <= oggi ? 'in-corso' : 'da-seguire';
}

export interface Voto {
  codice: string;
  voto: number | null; // null = idoneità
  lode: boolean;
  data: string; // AAAA-MM-GG
  note: string | null;
}

export function votoTesto(v: Voto): string {
  if (v.voto === null) return 'Idoneo';
  return v.lode ? '30 e lode' : String(v.voto);
}

export interface Riepilogo {
  superati: number;
  cfu: number;
  media: number | null;
  baseLaurea: number | null;
}

/**
 * Media ponderata sui CFU dei soli esami con voto; la lode vale 30
 * (il Regolamento 2026/27 non dice come contarla: da verificare).
 * Base di laurea: media espressa in 110, arrotondata all'intero (0,5 per eccesso).
 */
export function riepilogo(materie: Materia[], voti: Map<string, Voto>): Riepilogo {
  let superati = 0;
  let cfu = 0;
  let somma = 0;
  let pesi = 0;
  for (const m of materie) {
    const v = m.codice ? voti.get(m.codice) : undefined;
    if (!v) continue;
    superati += 1;
    cfu += m.cfu;
    if (v.voto !== null) {
      somma += v.voto * m.cfu;
      pesi += m.cfu;
    }
  }
  const media = pesi ? somma / pesi : null;
  return {
    superati,
    cfu,
    media,
    baseLaurea: media === null ? null : Math.floor((media * 110) / 30 + 0.5),
  };
}

export const formatoMedia = (n: number | null) =>
  n === null ? '–' : n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function dataLeggibile(iso: string): string {
  const [a, m, g] = iso.split('-');
  return `${g}/${m}/${a}`;
}

/** Stato della materia: superato se c'è un voto, altrimenti in corso / da seguire secondo il calendario. */
export function statoMateria(m: Materia, voti: Map<string, Voto>): 'superato' | 'in-corso' | 'da-seguire' {
  return m.codice && voti.has(m.codice) ? 'superato' : statoDidattico(m);
}

/** Una multipla è valida se ha almeno 3 opzioni e l'indice giusto cade tra quelle. */
export function domandaValida(d: DomandaCompleta): boolean {
  if (d.tipo === 'multipla') return d.opzioni.length >= 3 && d.corretta !== null && d.corretta >= 0 && d.corretta < d.opzioni.length;
  return d.puntiChiave.length > 0;
}

/** Voto in trentesimi stimato dalla percentuale di punti. */
export const votoDa = (punti: number, massimo: number) => (massimo > 0 ? Math.round((punti / massimo) * 30) : 0);


// ---------- Metriche del parlato (orale) ----------

export interface Parola {
  word: string;
  start: number;
  end: number;
}

export interface MetricheParlato {
  parole: number;
  durata: number; // secondi di registrazione
  paroleAlMinuto: number | null;
  avvio: number | null; // secondi prima della prima parola
  pauseLunghe: number; // silenzi oltre 2 secondi tra due parole
  pausaMassima: number;
  intercalari: number;
  intercalariUsati: Record<string, number>;
}

/** Intercalari tipici del parlato italiano ("tipo" escluso: è anche una parola tecnica). */
const INTERCALARI = new Set(['ehm', 'eh', 'ehh', 'uhm', 'um', 'mm', 'mmm', 'cioè', 'diciamo', 'praticamente', 'insomma']);
export const SOGLIA_PAUSA = 2;

export function metricheParlato(parole: Parola[], durataTotale: number | null): MetricheParlato {
  const pulite = parole.filter((p) => p.word.trim() !== '').sort((a, b) => a.start - b.start);
  const n = pulite.length;
  const primo = n ? pulite[0].start : null;
  const ultimo = n ? pulite[n - 1].end : null;
  const parlato = primo !== null && ultimo !== null ? Math.max(0, ultimo - primo) : 0;
  let pauseLunghe = 0;
  let pausaMassima = 0;
  for (let i = 1; i < n; i++) {
    const pausa = pulite[i].start - pulite[i - 1].end;
    if (pausa > SOGLIA_PAUSA) pauseLunghe++;
    pausaMassima = Math.max(pausaMassima, pausa);
  }
  const usati: Record<string, number> = {};
  for (const p of pulite) {
    const parola = p.word.toLowerCase().replace(/[^\p{L}]/gu, '');
    if (INTERCALARI.has(parola)) usati[parola] = (usati[parola] ?? 0) + 1;
  }
  return {
    parole: n,
    durata: Math.round((durataTotale ?? ultimo ?? 0) * 10) / 10,
    paroleAlMinuto: parlato >= 5 ? Math.round((n / parlato) * 60) : null,
    avvio: primo === null ? null : Math.round(primo * 10) / 10,
    pauseLunghe,
    pausaMassima: Math.round(pausaMassima * 10) / 10,
    intercalari: Object.values(usati).reduce((s, x) => s + x, 0),
    intercalariUsati: usati,
  };
}

// ---------- Padronanza per capitolo ----------

export type StatoPadronanza = 'mai-provato' | 'debole' | 'in-crescita' | 'solido';

/** Sotto il 60% dei punti il capitolo è debole; dal 90% può essere solido. */
export const SOGLIA_DEBOLE = 0.6;
export const SOGLIA_SOLIDO = 0.9;
/** "Solido" chiede prove sufficienti: almeno 8 punti in palio, cioè due domande aperte o equivalenti. */
export const PROVA_SOLIDO = 8;
/** Le risposte vecchie pesano meno: dopo 21 giorni valgono la metà. */
export const MEZZA_VITA_GIORNI = 21;

/** "09-parlamento.html; 10-parlamento.html" -> ["09-parlamento.html", "10-parlamento.html"] */
export function capitoliDi(file: string): string[] {
  return file
    .split(';')
    .map((f) => f.trim())
    .filter(Boolean);
}

export interface EsitoRisposta {
  /** Campo file della domanda: uno o più capitoli. */
  file: string;
  /** Argomento (nucleo) del kit da cui nasce la domanda, es. "N07". */
  nucleo?: string;
  punti: number;
  massimo: number;
  /** Quando è stata fatta la simulazione (ISO). */
  data: string;
}

export interface Padronanza {
  stato: StatoPadronanza;
  /** Quota dei punti presi, pesata per recenza (0-1); null se mai provato. */
  quota: number | null;
  risposte: number;
  /** Punti in palio in tutto, senza pesi: misura quante prove ci sono. */
  inPalio: number;
  ultima: string | null;
}

export function statoPadronanza(quota: number | null, inPalio: number): StatoPadronanza {
  if (quota === null || inPalio === 0) return 'mai-provato';
  if (quota < SOGLIA_DEBOLE) return 'debole';
  if (quota >= SOGLIA_SOLIDO && inPalio >= PROVA_SOLIDO) return 'solido';
  return 'in-crescita';
}

/**
 * Padronanza di ogni capitolo dagli esiti delle simulazioni corrette.
 * Ogni risposta pesa quanto i suoi punti in palio (un'aperta vale quattro multiple) e perde metà del peso ogni 21 giorni;
 * una domanda su due capitoli conta per entrambi.
 */
export function padronanzaCapitoli(esiti: EsitoRisposta[], adesso = new Date()): Map<string, Padronanza> {
  return aggregaPadronanza(esiti, (e) => capitoliDi(e.file), adesso);
}

/** Padronanza di ogni argomento del kit (un seggio dell'emiciclo), con le stesse regole dei capitoli. */
export function padronanzaArgomenti(esiti: EsitoRisposta[], adesso = new Date()): Map<string, Padronanza> {
  return aggregaPadronanza(esiti, (e) => (e.nucleo ? [e.nucleo] : []), adesso);
}

function aggregaPadronanza(esiti: EsitoRisposta[], chiavi: (e: EsitoRisposta) => string[], adesso: Date): Map<string, Padronanza> {
  const somme = new Map<string, { presi: number; pesi: number; risposte: number; inPalio: number; ultima: string }>();
  for (const e of esiti) {
    if (!(e.massimo > 0)) continue;
    const giorni = Math.max(0, (adesso.getTime() - Date.parse(e.data)) / 86_400_000);
    const peso = e.massimo * 0.5 ** (giorni / MEZZA_VITA_GIORNI);
    const quota = Math.min(1, Math.max(0, e.punti / e.massimo));
    for (const c of chiavi(e)) {
      const s = somme.get(c) ?? { presi: 0, pesi: 0, risposte: 0, inPalio: 0, ultima: e.data };
      s.presi += peso * quota;
      s.pesi += peso;
      s.risposte += 1;
      s.inPalio += e.massimo;
      if (e.data > s.ultima) s.ultima = e.data;
      somme.set(c, s);
    }
  }
  const esito = new Map<string, Padronanza>();
  for (const [c, s] of somme) {
    const quota = s.pesi > 0 ? s.presi / s.pesi : null;
    esito.set(c, { stato: statoPadronanza(quota, s.inPalio), quota, risposte: s.risposte, inPalio: s.inPalio, ultima: s.ultima });
  }
  return esito;
}

export const MAI_PROVATO: Padronanza = { stato: 'mai-provato', quota: null, risposte: 0, inPalio: 0, ultima: null };

export type MotivoCapitolo = 'debole' | 'mai-provato' | 'in-crescita' | 'da-rinfrescare';

/**
 * Quale capitolo allenare adesso, tra quelli pronti (con abbastanza domande), in quest'ordine:
 * 1. il più debole (quota più bassa);
 * 2. il primo mai provato, nell'ordine degli appunti (prima la copertura, poi la rifinitura);
 * 3. quello in crescita con la quota più bassa;
 * 4. il solido provato meno di recente, per rinfrescarlo.
 */
export function prossimoCapitolo<T extends Padronanza & { file: string; pronto: boolean }>(
  capitoli: T[],
): { capitolo: T; motivo: MotivoCapitolo } | null {
  const pronti = capitoli.filter((c) => c.pronto);
  const perQuota = (a: T, b: T) => (a.quota ?? 0) - (b.quota ?? 0) || (a.ultima ?? '').localeCompare(b.ultima ?? '');
  const debole = pronti.filter((c) => c.stato === 'debole').sort(perQuota)[0];
  if (debole) return { capitolo: debole, motivo: 'debole' };
  const mai = pronti.find((c) => c.stato === 'mai-provato');
  if (mai) return { capitolo: mai, motivo: 'mai-provato' };
  const crescita = pronti.filter((c) => c.stato === 'in-crescita').sort(perQuota)[0];
  if (crescita) return { capitolo: crescita, motivo: 'in-crescita' };
  const solido = pronti.filter((c) => c.stato === 'solido').sort((a, b) => (a.ultima ?? '').localeCompare(b.ultima ?? ''))[0];
  return solido ? { capitolo: solido, motivo: 'da-rinfrescare' } : null;
}

/** Maggioranza dell'emiciclo: la metà più uno dei seggi deve essere "solido". */
export function maggioranza(totale: number, solidi: number) {
  const soglia = Math.floor(totale / 2) + 1;
  return { soglia, raggiunta: totale > 0 && solidi >= soglia, mancano: Math.max(0, soglia - solidi) };
}

export interface Seggio {
  x: number;
  y: number;
  /** Indice del seggio da sinistra a destra, per assegnare i gruppi. */
  ordine: number;
}

/**
 * Posti dell'emiciclo: file concentriche (la più interna più corta), seggi distribuiti in proporzione
 * alla lunghezza di ogni fila e ordinati da sinistra a destra, come i gruppi in aula.
 */
export function postiEmiciclo(totale: number, opz: { cx: number; cy: number; raggio: number; passo: number; file?: number }): Seggio[] {
  if (totale <= 0) return [];
  const file = opz.file ?? Math.min(6, Math.max(2, Math.round(Math.sqrt(totale / 3))));
  const raggi = Array.from({ length: file }, (_, i) => opz.raggio + i * opz.passo);
  const somma = raggi.reduce((a, b) => a + b, 0);
  const perFila = raggi.map((r) => Math.max(1, Math.round((totale * r) / somma)));
  perFila[file - 1] += totale - perFila.reduce((a, b) => a + b, 0);
  const posti: { x: number; y: number; angolo: number }[] = [];
  perFila.forEach((n, f) => {
    for (let k = 0; k < n; k++) {
      const angolo = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * k) / (n - 1);
      posti.push({ x: opz.cx + raggi[f] * Math.cos(angolo), y: opz.cy - raggi[f] * Math.sin(angolo), angolo });
    }
  });
  return posti
    .sort((a, b) => b.angolo - a.angolo || a.y - b.y)
    .map((p, ordine) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, ordine }));
}

// ---------- Ripasso degli errori (carte FSRS) ----------

/** Una risposta diventa una carta se è una multipla sbagliata o un'aperta sotto la soglia di "solido". */
export function daRipassare(punti: number | null, massimo: number): boolean {
  return punti !== null && massimo > 0 && punti < massimo * SOGLIA_SOLIDO;
}

/** Carte nuove al giorno: oltre, il ripasso supererebbe i dieci minuti. */
export const NUOVE_AL_GIORNO = 20;
/** Secondi stimati per carta, per dire quanto dura il ripasso. */
export const SECONDI_PER_CARTA = 30;

export const minutiRipasso = (carte: number) => (carte <= 0 ? 0 : Math.max(1, Math.round((carte * SECONDI_PER_CARTA) / 60)));

/** Inizio del giorno dopo a Roma, come istante UTC: le carte in ripasso scadono per giorno, non per ora. */
export function inizioDomaniRoma(adesso = new Date()): Date {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(adesso)
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;
  const comeUtc = Date.UTC(parti.year, parti.month - 1, parti.day, parti.hour, parti.minute, parti.second);
  const scarto = comeUtc - Math.floor(adesso.getTime() / 1000) * 1000;
  return new Date(Date.UTC(parti.year, parti.month - 1, parti.day + 1) - scarto);
}

/** Intervallo fino al prossimo ripasso, come lo leggi su un pulsante: "1 min", "6 h", "3 g", "2 mesi". */
export function intervalloBreve(ms: number): string {
  const minuti = Math.max(1, Math.round(ms / 60_000));
  if (minuti < 60) return `${minuti} min`;
  const ore = Math.round(minuti / 60);
  if (ore < 24) return `${ore} h`;
  const giorni = Math.round(ore / 24);
  if (giorni < 31) return `${giorni} g`;
  const mesi = Math.round(giorni / 30);
  return mesi < 12 ? `${mesi} ${mesi === 1 ? 'mese' : 'mesi'}` : `${Math.round((giorni / 365) * 10) / 10} anni`.replace('.', ',');
}

// ---------- Piano a ritroso dalla data dell'appello ----------

/** Giorno della settimana di una data AAAA-MM-GG: 1 = lunedì … 7 = domenica. */
export function giornoSettimana(data: string): number {
  const [a, m, g] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g)).getUTCDay() || 7;
}

/** Data AAAA-MM-GG spostata di `n` giorni di calendario. */
export function piuGiorni(data: string, n: number): string {
  const [a, m, g] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g + n)).toISOString().slice(0, 10);
}

/** "1,3,6" -> [1, 3, 6], solo valori validi, ordinati e senza doppioni. */
export function leggiGiorniStudio(testo: string): number[] {
  return [...new Set(testo.split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b);
}

export interface CapitoloDaPianificare {
  file: string;
  /** Peso del capitolo: quanti argomenti del kit contiene. */
  peso: number;
  solido: boolean;
}

export type TipoGiorno = 'studio' | 'prova' | 'libero' | 'appello';

export interface GiornoPiano {
  data: string;
  tipo: TipoGiorno;
  /** Capitoli da studiare quel giorno (file degli appunti), nell'ordine degli appunti. */
  capitoli: string[];
}

export interface Piano {
  stato: 'ok' | 'stretto' | 'passato' | 'senza-giorni';
  giorni: GiornoPiano[];
  /** Giorni di studio da oggi al giorno prima dell'appello, prove generali comprese. */
  giorniStudio: number;
  prove: number;
  rimasti: string[];
  solidi: string[];
  /** Giorni di calendario da oggi all'appello. */
  mancano: number;
}

/** Sopra un capitolo e mezzo per giorno di studio il piano è stretto. */
export const CARICO_MASSIMO = 1.5;

/**
 * Piano a ritroso: dalla data dell'appello indietro fino a oggi, sui soli giorni di studio.
 * Gli ultimi giorni di studio sono prove generali (simulazioni complete, nessun capitolo nuovo):
 * uno se i giorni sono da 3 a 6, poi circa il 15%, al massimo tre. I capitoli non ancora solidi,
 * nell'ordine degli appunti, si spartiscono gli altri giorni in proporzione al loro peso:
 * un capitolo grande occupa più giorni, due piccoli possono stare nello stesso giorno.
 */
export function pianoARitroso(oggi: string, appello: string, giorniStudio: number[], capitoli: CapitoloDaPianificare[]): Piano {
  const rimasti = capitoli.filter((c) => !c.solido);
  const solidi = capitoli.filter((c) => c.solido).map((c) => c.file);
  const base = { rimasti: rimasti.map((c) => c.file), solidi };
  if (appello < oggi) return { ...base, stato: 'passato', giorni: [], giorniStudio: 0, prove: 0, mancano: 0 };
  const calendario: string[] = [];
  for (let d = oggi; d < appello; d = piuGiorni(d, 1)) calendario.push(d);
  const mancano = calendario.length;
  const studio = calendario.filter((d) => giorniStudio.includes(giornoSettimana(d)));
  const D = studio.length;
  const prove = D >= 7 ? Math.min(3, Math.max(1, Math.round(D * 0.15))) : D >= 3 ? 1 : 0;
  const N = rimasti.length ? D - prove : 0;
  const assegnati = new Map<string, string[]>();
  if (N > 0) {
    const pesi = rimasti.map((c) => Math.max(1, c.peso));
    const W = pesi.reduce((a, b) => a + b, 0);
    let cumulato = 0;
    rimasti.forEach((c, i) => {
      const primo = Math.min(N - 1, Math.floor((cumulato / W) * N));
      cumulato += pesi[i];
      const ultimo = Math.max(primo, Math.min(N - 1, Math.ceil((cumulato / W) * N) - 1));
      for (let k = primo; k <= ultimo; k++) assegnati.set(studio[k], [...(assegnati.get(studio[k]) ?? []), c.file]);
    });
  }
  const giorniProva = new Set(rimasti.length ? studio.slice(D - prove) : studio);
  const giorni: GiornoPiano[] = calendario.map((d) => ({
    data: d,
    tipo: assegnati.has(d) ? 'studio' : giorniProva.has(d) ? 'prova' : 'libero',
    capitoli: assegnati.get(d) ?? [],
  }));
  giorni.push({ data: appello, tipo: 'appello', capitoli: [] });
  const stato = D === 0 ? 'senza-giorni' : N > 0 && rimasti.length / N > CARICO_MASSIMO ? 'stretto' : 'ok';
  return { ...base, stato, giorni, giorniStudio: D, prove: rimasti.length ? prove : D, mancano };
}

// ---------- Emiciclo della laurea (home): un seggio per CFU ----------

export interface GruppoLaurea {
  slug: string;
  nome: string;
  breve: string;
  cfu: number;
  colore: number;
  stato: 'superato' | 'in-corso' | 'da-seguire';
  voto: Voto | null;
}

/**
 * Gruppi dell'aula della laurea, da sinistra a destra come i gruppi in Parlamento:
 * prima gli esami superati (in ordine di data), poi quelli in corso, poi i futuri nell'ordine del piano.
 * Dei due esami "a scelta vincolata" ne entra uno solo: quello superato, altrimenti il primo.
 */
export function gruppiLaurea(materie: Materia[], voti: Map<string, Voto>, oggi = new Date()): GruppoLaurea[] {
  const vincolate = materie.filter((m) => m.sceltaVincolata);
  const scelta = vincolate.find((m) => m.codice && voti.has(m.codice)) ?? vincolate[0];
  const gruppi = materie
    .filter((m) => !m.sceltaVincolata || m === scelta)
    .map((m) => {
      const voto = m.codice ? (voti.get(m.codice) ?? null) : null;
      const stato: GruppoLaurea['stato'] = voto ? 'superato' : statoDidattico(m, oggi) === 'in-corso' ? 'in-corso' : 'da-seguire';
      return { slug: m.slug, nome: m.nome, breve: m.breve, cfu: m.cfu, colore: m.colore, stato, voto };
    });
  const peso = { superato: 0, 'in-corso': 1, 'da-seguire': 2 } as const;
  return gruppi
    .map((g, i) => ({ g, i }))
    .sort((a, b) => peso[a.g.stato] - peso[b.g.stato] || (a.g.voto && b.g.voto ? a.g.voto.data.localeCompare(b.g.voto.data) : 0) || a.i - b.i)
    .map((x) => x.g);
}
