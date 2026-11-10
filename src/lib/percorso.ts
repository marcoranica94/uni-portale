import { getCollection, type CollectionEntry } from 'astro:content';
import configMaterie from '../data/materie.json';
import appuntiGenerati from '../data/appunti.generated.json';

type Voce = CollectionEntry<'insegnamenti'>['data'];
type Colore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type ConfigMateria = { slug: string; breve?: string; colore?: Colore; appunti?: string; pdf?: string };
type Appunti = { slug: string; capitoli: { file: string; titolo: string }[]; pdf: { file: string; bytes: number } | null; impronta: string };

export type Periodo = 'I semestre' | 'II semestre' | 'Annuale' | 'Da definire';
export type TipoEsame = 'Scritto' | 'Orale' | 'Relazione e discussione' | 'Da definire';

export interface Materia {
  id: string;
  codice: string | null;
  slug: string;
  nome: string;
  breve: string;
  anno: number;
  periodo: Periodo;
  date: string | null;
  cfu: number;
  colore: Colore;
  docenti: string[];
  sceltaVincolata: boolean;
  alternative: string[];
  esame: { tipo: TipoEsame; dalCatalogo: boolean; dettagli: string | null };
  programma: string[];
  obiettivi: string | null;
  url: string | null;
  appunti: Appunti | null;
}

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

function periodo(semestre: string | null): { periodo: Periodo; date: string | null } {
  if (!semestre) return { periodo: 'Da definire', date: null };
  const date = semestre.match(/\(([^)]+)\)/)?.[1] ?? null;
  if (/^primo/i.test(semestre)) return { periodo: 'I semestre', date };
  if (/^secondo/i.test(semestre)) return { periodo: 'II semestre', date };
  if (/^annuale/i.test(semestre)) return { periodo: 'Annuale', date };
  return { periodo: 'Da definire', date };
}

function tipoEsame(esame: Voce['esame']): Materia['esame'] {
  const tipo = esame?.tipo ?? '';
  const dalCatalogo = /solo campo del catalogo/i.test(tipo);
  let t: TipoEsame = 'Da definire';
  if (/^scritto/i.test(tipo)) t = 'Scritto';
  else if (/^orale/i.test(tipo)) t = 'Orale';
  else if (/^relazione/i.test(tipo)) t = 'Relazione e discussione';
  return { tipo: t, dalCatalogo, dettagli: esame?.dettagli ? testoLeggibile(esame.dettagli) : null };
}

let cache: Materia[] | null = null;

export async function getMaterie(): Promise<Materia[]> {
  if (cache) return cache;
  const voci = (await getCollection('insegnamenti')).sort((a, b) => a.data.ordine - b.data.ordine);
  const config = configMaterie as unknown as Record<string, ConfigMateria>;
  const appunti = appuntiGenerati as Record<string, Appunti>;
  cache = voci.map((voce, i) => {
    const d = voce.data;
    const cfg = (d.codice && config[d.codice]) || undefined;
    const nome = nomeLeggibile(d.nome);
    const { periodo: p, date } = periodo(d.semestre);
    return {
      id: voce.id,
      codice: d.codice,
      slug: cfg?.slug ?? slugDa(nome),
      nome,
      breve: cfg?.breve ?? nome,
      anno: d.anno,
      periodo: p,
      date,
      cfu: d.cfu,
      colore: cfg?.colore ?? (((i % 8) + 1) as Colore),
      docenti: (d.docenti ?? []).map((n) => n.replace(/\s*\(.*\)$/, '')),
      sceltaVincolata: /scelta vincolata/i.test(d.tipologia ?? ''),
      alternative: Array.isArray(d.alternative) ? d.alternative : [],
      esame: tipoEsame(d.esame),
      programma: (d.programma ?? []).map(testoLeggibile),
      obiettivi: d.obiettivi ? testoLeggibile(d.obiettivi) : null,
      url: d.url ?? null,
      appunti: (d.codice && appunti[d.codice]) || null,
    };
  });
  return cache;
}

export const ORDINE_PERIODI: Periodo[] = ['I semestre', 'II semestre', 'Annuale', 'Da definire'];

/** Stato didattico provvisorio, finché i voti non arrivano dal database (task t009). */
export function statoDidattico(m: Materia, oggi = new Date()): 'in-corso' | 'da-seguire' {
  if (!m.date) return 'da-seguire';
  const [inizio] = m.date.split(' - ');
  const [g, mm, a] = inizio.split('/').map(Number);
  return new Date(a, mm - 1, g) <= oggi ? 'in-corso' : 'da-seguire';
}

export const CFU_TOTALI = 180;
