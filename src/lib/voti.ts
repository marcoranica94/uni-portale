import { env } from 'cloudflare:workers';
import { statoDidattico, type Materia } from './percorso';

export interface Voto {
  codice: string;
  voto: number | null; // null = idoneità
  lode: boolean;
  data: string; // AAAA-MM-GG
  note: string | null;
}

export async function getVoti(): Promise<Map<string, Voto>> {
  const { results } = await env.DB.prepare('SELECT codice, voto, lode, data, note FROM voti').all<{
    codice: string;
    voto: number | null;
    lode: number;
    data: string;
    note: string | null;
  }>();
  return new Map(results.map((r) => [r.codice, { ...r, lode: r.lode === 1 }]));
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
