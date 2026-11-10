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
  const somme = new Map<string, { presi: number; pesi: number; risposte: number; inPalio: number; ultima: string }>();
  for (const e of esiti) {
    if (!(e.massimo > 0)) continue;
    const giorni = Math.max(0, (adesso.getTime() - Date.parse(e.data)) / 86_400_000);
    const peso = e.massimo * 0.5 ** (giorni / MEZZA_VITA_GIORNI);
    const quota = Math.min(1, Math.max(0, e.punti / e.massimo));
    for (const c of capitoliDi(e.file)) {
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
