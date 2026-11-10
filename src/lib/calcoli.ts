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

