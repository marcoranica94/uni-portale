import { env } from 'cloudflare:workers';
import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { DomandaCompleta, RichiestaApprofondimento, RichiestaCorrezione, RichiestaDomande, RisultatoCorrezione } from '../shared/schemi';
import { accoda, getKit, ultimoLavoro } from './coda';
import { votoDa, padronanzaCapitoli, padronanzaArgomenti, capitoliDi, leggiGiorniStudio, pianoARitroso, MAI_PROVATO, type Padronanza, type EsitoRisposta } from './calcoli';
import { getMaterie } from './percorso';
import { carteDaSimulazione, eliminaCarteDi, giorniConRipasso } from './ripasso';
export { domandaValida, votoDa } from './calcoli';

/** Formati della simulazione scritta: numero di domande per tipo e durata. */
export const FORMATI = {
  breve: { etichetta: 'Breve', multiple: 5, aperte: 1, minuti: 10 },
  completo: { etichetta: 'Completo', multiple: 10, aperte: 3, minuti: 60 },
} as const;
export type Formato = keyof typeof FORMATI;
export type Modalita = 'scritto' | 'orale';

/** Orale: tre domande aperte, come un'interrogazione; ogni risposta registrata e trascritta. */
export const ORALE = { etichetta: 'Orale', aperte: 3, minuti: 20 } as const;

/** Punti per tipo: la scelta multipla vale 1, l'aperta 4 (stima: il syllabus non dà i pesi). */
export const PUNTI = { multipla: 1, aperta: 4 } as const;

const adesso = () => new Date().toISOString();

// ---------- Istruzioni d'esame (profilo per materia) ----------

export interface Profilo {
  istruzioni: string;
  domandeOrale: number;
  multipleScritto: number;
  aperteScritto: number;
  /** Data dell'appello scelta dallo studente (AAAA-MM-GG), base del piano a ritroso. */
  dataAppello: string | null;
  /** Giorni della settimana in cui studia: 1 = lunedì … 7 = domenica. */
  giorniStudio: number[];
}
const TUTTI_I_GIORNI = [1, 2, 3, 4, 5, 6, 7];
const PROFILO_BASE: Profilo = { istruzioni: '', domandeOrale: 3, multipleScritto: 10, aperteScritto: 3, dataAppello: null, giorniStudio: TUTTI_I_GIORNI };

interface RigaProfilo {
  codice: string;
  istruzioni: string;
  domande_orale: number;
  multiple_scritto: number;
  aperte_scritto: number;
  data_appello: string | null;
  giorni_studio: string;
}
const daRigaProfilo = (r: RigaProfilo): Profilo => ({
  istruzioni: r.istruzioni,
  domandeOrale: r.domande_orale,
  multipleScritto: r.multiple_scritto,
  aperteScritto: r.aperte_scritto,
  dataAppello: r.data_appello,
  giorniStudio: leggiGiorniStudio(r.giorni_studio),
});

export async function getProfilo(codice: string): Promise<Profilo> {
  const r = await env.DB.prepare('SELECT * FROM profili_esame WHERE codice = ?').bind(codice).first<RigaProfilo>();
  return r ? daRigaProfilo(r) : PROFILO_BASE;
}

/** Appelli fissati: insegnamento -> profilo, solo per chi ha una data. */
export async function appelliFissati(): Promise<Map<string, Profilo>> {
  const { results } = await env.DB.prepare('SELECT * FROM profili_esame WHERE data_appello IS NOT NULL').all<RigaProfilo>();
  return new Map(results.map((r) => [r.codice, daRigaProfilo(r)]));
}

/** Salva solo data dell'appello e giorni di studio, senza toccare le istruzioni d'esame. */
export async function salvaAppello(codice: string, dataAppello: string | null, giorni: number[]) {
  await env.DB.prepare(
    `INSERT INTO profili_esame (codice, data_appello, giorni_studio, aggiornato) VALUES (?, ?, ?, ?)
     ON CONFLICT(codice) DO UPDATE SET data_appello = excluded.data_appello, giorni_studio = excluded.giorni_studio, aggiornato = excluded.aggiornato`,
  )
    .bind(codice, dataAppello, (giorni.length ? giorni : TUTTI_I_GIORNI).join(','), adesso())
    .run();
}

export async function salvaProfilo(codice: string, p: Omit<Profilo, 'dataAppello' | 'giorniStudio'>) {
  await env.DB.prepare(
    `INSERT INTO profili_esame (codice, istruzioni, domande_orale, multiple_scritto, aperte_scritto, aggiornato) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(codice) DO UPDATE SET istruzioni = excluded.istruzioni, domande_orale = excluded.domande_orale,
       multiple_scritto = excluded.multiple_scritto, aperte_scritto = excluded.aperte_scritto, aggiornato = excluded.aggiornato`,
  )
    .bind(codice, p.istruzioni.slice(0, 4000), p.domandeOrale, p.multipleScritto, p.aperteScritto, adesso())
    .run();
}

// ---------- Banca di domande ----------

export async function ultimoLotto(codice: string): Promise<string | null> {
  const r = await env.DB.prepare('SELECT lotto FROM domande WHERE codice = ? ORDER BY creata DESC LIMIT 1').bind(codice).first<{ lotto: string }>();
  return r?.lotto ?? null;
}

/** Banca di una materia: totale e domande mai uscite, per tipo (tutti i rifornimenti). */
export async function contaBanca(codice: string) {
  const { results } = await env.DB.prepare(
    'SELECT tipo, COUNT(*) AS n, SUM(CASE WHEN usata = 0 THEN 1 ELSE 0 END) AS nuove FROM domande WHERE codice = ? AND archiviata = 0 GROUP BY tipo',
  )
    .bind(codice)
    .all<{ tipo: string; n: number; nuove: number }>();
  const riga = (t: string) => results.find((r) => r.tipo === t);
  return {
    totale: results.reduce((x, r) => x + r.n, 0),
    multiple: riga('multipla')?.n ?? 0,
    aperte: riga('aperta')?.n ?? 0,
    nuoveMultiple: riga('multipla')?.nuove ?? 0,
    nuoveAperte: riga('aperta')?.nuove ?? 0,
  };
}

/** Rifornimento: pochi nuclei, scelti dall'agente tra i meno coperti (presenti = domande già in banca per nucleo). */
export async function richiestaRifornimento(codice: string): Promise<RichiestaDomande> {
  const { results } = await env.DB.prepare('SELECT nucleo, COUNT(*) AS n FROM domande WHERE codice = ? AND archiviata = 0 GROUP BY nucleo')
    .bind(codice)
    .all<{ nucleo: string; n: number }>();
  const [profilo, materie] = await Promise.all([getProfilo(codice), getMaterie()]);
  const soloAperte = materie.find((m) => m.codice === codice)?.esame.tipo === 'Orale';
  return { nuclei: 6, presenti: Object.fromEntries(results.map((r) => [r.nucleo, r.n])), istruzioni: profilo.istruzioni, soloAperte, capitolo: '', nucleo: '' };
}

/** Se le domande mai uscite non bastano per altre due simulazioni, chiede all'agente un rifornimento. */
export async function riforniscoSeServe(codice: string, modalita: Modalita) {
  const [banca, profilo, kit, ultimo] = await Promise.all([contaBanca(codice), getProfilo(codice), getKit(codice), ultimoLavoro('domande', codice)]);
  if (!kit || (ultimo && (ultimo.stato === 'in_coda' || ultimo.stato === 'in_corso'))) return false;
  const servono =
    modalita === 'orale'
      ? banca.nuoveAperte < profilo.domandeOrale * 2
      : banca.nuoveAperte < profilo.aperteScritto * 2 || banca.nuoveMultiple < profilo.multipleScritto * 2;
  if (!servono) return false;
  await accoda('domande', codice, await richiestaRifornimento(codice));
  return true;
}

/** Sostituisce la banca attiva con un nuovo lotto (le domande vecchie restano per lo storico). */
export async function salvaBanca(codice: string, lotto: string, domande: DomandaCompleta[]) {
  const istruzioni = domande.map((d) =>
    env.DB.prepare(
      `INSERT INTO domande (id, codice, nucleo, tipo, testo, opzioni, corretta, spiegazione, punti_chiave, risposta_modello, file, pagine, lotto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      codice,
      d.nucleo,
      d.tipo,
      d.testo,
      JSON.stringify(d.opzioni),
      d.corretta,
      d.spiegazione,
      JSON.stringify(d.puntiChiave),
      d.rispostaModello,
      d.file,
      d.pagine,
      lotto,
    ),
  );
  for (let i = 0; i < istruzioni.length; i += 50) await env.DB.batch(istruzioni.slice(i, i + 50));
}

// ---------- Simulazioni ----------

export interface Domanda {
  id: string;
  nucleo: string;
  tipo: 'multipla' | 'aperta';
  testo: string;
  opzioni: string[];
  corretta: number | null;
  spiegazione: string;
  puntiChiave: string[];
  rispostaModello: string;
  file: string;
  pagine: string;
}

interface RigaDomanda {
  id: string;
  nucleo: string;
  tipo: 'multipla' | 'aperta';
  testo: string;
  opzioni: string;
  corretta: number | null;
  spiegazione: string;
  punti_chiave: string;
  risposta_modello: string;
  file: string;
  pagine: string;
}

const daRiga = (r: RigaDomanda): Domanda => ({
  id: r.id,
  nucleo: r.nucleo,
  tipo: r.tipo,
  testo: r.testo,
  opzioni: JSON.parse(r.opzioni),
  corretta: r.corretta,
  spiegazione: r.spiegazione,
  puntiChiave: JSON.parse(r.punti_chiave),
  rispostaModello: r.risposta_modello,
  file: r.file,
  pagine: r.pagine,
});

/**
 * Simulazione mirata ("Allena"): domande dei soli nuclei di un capitolo, o di un solo argomento del kit.
 * Orale: le domande dell'orale; scritto: tre multiple e un'aperta, una decina di minuti.
 */
export const CAPITOLO = { scritto: { multiple: 3, aperte: 1, minuti: 8 }, minimo: 3, minimoOrale: 2 } as const;

/** Bersaglio di una simulazione mirata: un capitolo (file degli appunti) o un argomento del kit (es. "N07"). */
export type Bersaglio = { tipo: 'capitolo'; valore: string } | { tipo: 'argomento'; valore: string };

/** Filtro SQL sulle domande del bersaglio; per il capitolo vale anche per i nuclei su più capitoli ("a.html; b.html"). */
const filtro = (b: Bersaglio) =>
  b.tipo === 'capitolo' ? { sql: "instr(' ' || file || ';', ?) > 0", valore: ` ${b.valore};` } : { sql: 'nucleo = ?', valore: b.valore };
const chiaveBersaglio = (b: Bersaglio) => `${b.tipo}:${b.valore}`;

/** Crea una simulazione pescando le domande meno usate della banca attiva (del bersaglio, se c'è). */
export async function creaSimulazione(
  codice: string,
  formato: Formato,
  modalita: Modalita = 'scritto',
  dalVivo = false,
  bersaglio: Bersaglio | null = null,
): Promise<string | null> {
  const p = await getProfilo(codice);
  const f =
    modalita === 'orale'
      ? { multiple: 0, aperte: p.domandeOrale, minuti: ORALE.minuti }
      : bersaglio
        ? CAPITOLO.scritto
        : formato === 'completo'
          ? { multiple: p.multipleScritto, aperte: p.aperteScritto, minuti: FORMATI.completo.minuti }
          : FORMATI.breve;
  const filt = bersaglio ? filtro(bersaglio) : null;
  const pesca = async (tipo: 'multipla' | 'aperta', n: number) =>
    n <= 0
      ? []
      : (
          await env.DB.prepare(`SELECT id FROM domande WHERE codice = ? AND tipo = ? AND archiviata = 0${filt ? ` AND ${filt.sql}` : ''} ORDER BY usata ASC, RANDOM() LIMIT ?`)
            .bind(...(filt ? [codice, tipo, filt.valore, n] : [codice, tipo, n]))
            .all<{ id: string }>()
        ).results.map((r) => r.id);
  // Scritto mirato: se mancano multiple, completa con aperte (e viceversa) pur di restare sul bersaglio.
  let multiple = await pesca('multipla', f.multiple);
  let aperte = await pesca('aperta', f.aperte + (bersaglio && modalita === 'scritto' ? f.multiple - multiple.length : 0));
  if (bersaglio && modalita === 'scritto' && aperte.length < f.aperte) multiple = await pesca('multipla', f.multiple + f.aperte - aperte.length);
  const scelte = [...multiple.map((id) => ({ id, tipo: 'multipla' as const })), ...aperte.map((id) => ({ id, tipo: 'aperta' as const }))];
  if (!scelte.length) return null;
  if (bersaglio && scelte.length < (modalita === 'orale' ? CAPITOLO.minimoOrale : CAPITOLO.minimo)) return null;

  const id = crypto.randomUUID();
  const minuti = modalita === 'orale' && bersaglio ? Math.max(8, Math.round((ORALE.minuti * scelte.length) / Math.max(1, p.domandeOrale))) : f.minuti;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO simulazioni (id, codice, formato, minuti, modalita, dal_vivo, capitolo, argomento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(
      id,
      codice,
      formato,
      minuti,
      modalita,
      modalita === 'orale' && dalVivo ? 1 : 0,
      bersaglio?.tipo === 'capitolo' ? bersaglio.valore : null,
      bersaglio?.tipo === 'argomento' ? bersaglio.valore : null,
    ),
    ...scelte.map((s, i) => env.DB.prepare('INSERT INTO risposte (simulazione, ordine, domanda, massimo) VALUES (?, ?, ?, ?)').bind(id, i + 1, s.id, PUNTI[s.tipo])),
    ...scelte.map((s) => env.DB.prepare('UPDATE domande SET usata = usata + 1 WHERE id = ?').bind(s.id)),
  ]);
  if (bersaglio) await riforniscoBersaglioSeServe(codice, bersaglio, modalita);
  else await riforniscoSeServe(codice, modalita);
  return id;
}

// ---------- Padronanza (capitoli e argomenti) e rifornimento mirato ----------

export interface Argomento {
  id: string;
  titolo: string;
  /** Capitoli (file degli appunti) in cui sta l'argomento. */
  capitoli: string[];
}

/** Argomenti (nuclei) del kit di una materia, nell'ordine del kit. */
export async function argomentiKit(codice: string): Promise<Argomento[]> {
  const { results } = await env.DB.prepare('SELECT id, titolo, file FROM nuclei WHERE codice = ? ORDER BY id').bind(codice).all<{ id: string; titolo: string; file: string }>();
  return results.map((n) => ({ id: n.id, titolo: n.titolo, capitoli: capitoliDi(n.file) }));
}

/** Nuclei del kit per capitolo (file degli appunti -> id dei nuclei). */
export async function nucleiPerCapitolo(codice: string): Promise<Map<string, string[]>> {
  const mappa = new Map<string, string[]>();
  for (const a of await argomentiKit(codice)) for (const c of a.capitoli) mappa.set(c, [...(mappa.get(c) ?? []), a.id]);
  return mappa;
}

/** Esiti delle risposte già corrette di una materia (o di tutte), per la padronanza. */
async function esitiRisposte(codice: string | null): Promise<(EsitoRisposta & { codice: string })[]> {
  const { results } = await env.DB.prepare(
    `SELECT s.codice, d.file, d.nucleo, r.punti, r.massimo, s.creata AS data
       FROM risposte r JOIN simulazioni s ON s.id = r.simulazione JOIN domande d ON d.id = r.domanda
      WHERE r.punti IS NOT NULL${codice ? ' AND s.codice = ?' : ''}`,
  )
    .bind(...(codice ? [codice] : []))
    .all<EsitoRisposta & { codice: string }>();
  return results;
}

export interface CapitoloPadronanza extends Padronanza {
  file: string;
  nuclei: number;
  /** Domande in banca per questo capitolo (anche già uscite) e mai uscite. */
  domande: number;
  nuove: number;
  /** C'è un rifornimento in coda o in corso per questo capitolo. */
  inPreparazione: boolean;
}

export interface ArgomentoPadronanza extends Padronanza, Argomento {
  domande: number;
  nuove: number;
  inPreparazione: boolean;
}

/** Domande in banca per chiave (capitolo o argomento): totale e mai uscite. */
function contaBancaPer(banca: { file: string; nucleo: string; usata: number }[], chiavi: (d: { file: string; nucleo: string }) => string[]) {
  const conta = new Map<string, { domande: number; nuove: number }>();
  for (const d of banca)
    for (const c of chiavi(d)) {
      const x = conta.get(c) ?? { domande: 0, nuove: 0 };
      x.domande += 1;
      if (d.usata === 0) x.nuove += 1;
      conta.set(c, x);
    }
  return conta;
}

/** Tutto ciò che serve alla scheda materia e a Oggi: padronanza per argomento e per capitolo, banca, rifornimenti. */
export async function padronanzaCompleta(codice: string, modalita: Modalita) {
  const tipo = modalita === 'orale' ? "AND tipo = 'aperta'" : '';
  const [argomenti, esiti, banca, pendenti] = await Promise.all([
    argomentiKit(codice),
    esitiRisposte(codice),
    env.DB.prepare(`SELECT file, nucleo, usata FROM domande WHERE codice = ? AND archiviata = 0 ${tipo}`).bind(codice).all<{ file: string; nucleo: string; usata: number }>(),
    bersagliInPreparazione(codice),
  ]);
  const perArgomento = padronanzaArgomenti(esiti);
  const perCapitolo = padronanzaCapitoli(esiti);
  const bancaArg = contaBancaPer(banca.results, (d) => [d.nucleo]);
  const bancaCap = contaBancaPer(banca.results, (d) => capitoliDi(d.file));
  const lista: ArgomentoPadronanza[] = argomenti.map((a) => ({
    ...(perArgomento.get(a.id) ?? MAI_PROVATO),
    ...a,
    domande: bancaArg.get(a.id)?.domande ?? 0,
    nuove: bancaArg.get(a.id)?.nuove ?? 0,
    inPreparazione: pendenti.has(`argomento:${a.id}`) || a.capitoli.some((c) => pendenti.has(`capitolo:${c}`)),
  }));
  const capitoli = new Map<string, CapitoloPadronanza>();
  for (const a of argomenti)
    for (const file of a.capitoli) {
      const prima = capitoli.get(file);
      capitoli.set(file, {
        ...(perCapitolo.get(file) ?? MAI_PROVATO),
        file,
        nuclei: (prima?.nuclei ?? 0) + 1,
        domande: bancaCap.get(file)?.domande ?? 0,
        nuove: bancaCap.get(file)?.nuove ?? 0,
        inPreparazione: pendenti.has(`capitolo:${file}`) || (prima?.inPreparazione ?? false) || pendenti.has(`argomento:${a.id}`),
      });
    }
  return { argomenti: lista, capitoli };
}

/** Compatibilità: padronanza per capitolo. */
export async function padronanzaMateria(codice: string, modalita: Modalita): Promise<Map<string, CapitoloPadronanza>> {
  return (await padronanzaCompleta(codice, modalita)).capitoli;
}

/** Padronanza per argomento di tutte le materie (pagina Oggi): codice -> argomento -> padronanza. */
export async function padronanzaTutte(): Promise<Map<string, Map<string, Padronanza>>> {
  const esiti = await esitiRisposte(null);
  const perMateria = new Map<string, EsitoRisposta[]>();
  for (const e of esiti) perMateria.set(e.codice, [...(perMateria.get(e.codice) ?? []), e]);
  return new Map([...perMateria].map(([codice, lista]) => [codice, padronanzaArgomenti(lista)]));
}

/** Numero di argomenti del kit per materia (seggi dell'emiciclo). */
export async function seggiPerMateria(): Promise<Map<string, number>> {
  const { results } = await env.DB.prepare('SELECT codice, COUNT(*) AS n FROM nuclei GROUP BY codice').all<{ codice: string; n: number }>();
  return new Map(results.map((r) => [r.codice, r.n]));
}

/** Bersagli (capitoli e argomenti) con un rifornimento mirato in coda o in corso, come "capitolo:file" e "argomento:N07". */
async function bersagliInPreparazione(codice: string): Promise<Set<string>> {
  const { results } = await env.DB.prepare("SELECT richiesta FROM lavori WHERE tipo = 'domande' AND codice = ? AND stato IN ('in_coda', 'in_corso')")
    .bind(codice)
    .all<{ richiesta: string }>();
  const insieme = new Set<string>();
  for (const r of results) {
    try {
      const q = JSON.parse(r.richiesta) as { capitolo?: string; nucleo?: string };
      if (q.capitolo) insieme.add(`capitolo:${q.capitolo}`);
      if (q.nucleo) insieme.add(`argomento:${q.nucleo}`);
    } catch {}
  }
  return insieme;
}

/** Chiede all'agente domande solo sul bersaglio (capitolo o argomento), se non sono già in preparazione. */
export async function riforniscoBersaglio(codice: string, b: Bersaglio): Promise<boolean> {
  const [kit, pendenti] = await Promise.all([getKit(codice), bersagliInPreparazione(codice)]);
  if (!kit || pendenti.has(chiaveBersaglio(b))) return false;
  const base = await richiestaRifornimento(codice);
  await accoda('domande', codice, b.tipo === 'capitolo' ? { ...base, capitolo: b.valore } : { ...base, nucleo: b.valore, nuclei: 1 });
  return true;
}

/** Dopo una simulazione mirata: se le domande mai uscite non bastano per un'altra, ne chiede altre. */
async function riforniscoBersaglioSeServe(codice: string, b: Bersaglio, modalita: Modalita) {
  const tipo = modalita === 'orale' ? "AND tipo = 'aperta'" : '';
  const filt = filtro(b);
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM domande WHERE codice = ? AND archiviata = 0 AND usata = 0 ${tipo} AND ${filt.sql}`)
    .bind(codice, filt.valore)
    .first<{ n: number }>();
  const servono = modalita === 'orale' ? (await getProfilo(codice)).domandeOrale : CAPITOLO.scritto.multiple + CAPITOLO.scritto.aperte;
  if ((r?.n ?? 0) < servono) await riforniscoBersaglio(codice, b);
}

export interface Simulazione {
  id: string;
  codice: string;
  formato: Formato;
  stato: 'in_corso' | 'in_correzione' | 'corretta';
  minuti: number;
  creata: string;
  consegnata: string | null;
  corretta: string | null;
  punti: number | null;
  massimo: number | null;
  voto: number | null;
  giudizio: string | null;
  modalita: Modalita;
  esposizione: string | null;
  dal_vivo: number;
  capitolo: string | null;
  argomento: string | null;
}

export interface Esito {
  coperti?: string[];
  mancanti?: string[];
  errori?: string[];
  commento?: string;
}

export interface Risposta {
  ordine: number;
  domanda: Domanda;
  risposta: string | null;
  punti: number | null;
  massimo: number;
  esito: Esito | null;
  metriche: import('./calcoli').MetricheParlato | null;
  /** Orale dal vivo: null = non chiesto, '' = nessun approfondimento, testo = la domanda. */
  approfondimento: string | null;
  rispostaExtra: string | null;
  metricheExtra: import('./calcoli').MetricheParlato | null;
}

export async function getSimulazione(id: string): Promise<{ sim: Simulazione; risposte: Risposta[] } | null> {
  const sim = await env.DB.prepare('SELECT * FROM simulazioni WHERE id = ?').bind(id).first<Simulazione>();
  if (!sim) return null;
  const { results } = await env.DB.prepare(
    `SELECT r.ordine, r.risposta, r.punti, r.massimo, r.esito, r.metriche, r.approfondimento, r.risposta_extra, r.metriche_extra, d.id, d.nucleo, d.tipo, d.testo, d.opzioni, d.corretta, d.spiegazione,
            d.punti_chiave, d.risposta_modello, d.file, d.pagine
     FROM risposte r JOIN domande d ON d.id = r.domanda WHERE r.simulazione = ? ORDER BY r.ordine`,
  )
    .bind(id)
    .all<RigaDomanda & { ordine: number; risposta: string | null; punti: number | null; massimo: number; esito: string | null; metriche: string | null; approfondimento: string | null; risposta_extra: string | null; metriche_extra: string | null }>();
  return {
    sim,
    risposte: results.map((r) => ({
      ordine: r.ordine,
      domanda: daRiga(r),
      risposta: r.risposta,
      punti: r.punti,
      massimo: r.massimo,
      esito: r.esito ? (JSON.parse(r.esito) as Esito) : null,
      metriche: r.metriche ? JSON.parse(r.metriche) : null,
      approfondimento: r.approfondimento,
      rispostaExtra: r.risposta_extra,
      metricheExtra: r.metriche_extra ? JSON.parse(r.metriche_extra) : null,
    })),
  };
}

export async function storico(codice: string, limite = 5) {
  const { results } = await env.DB.prepare('SELECT id, formato, modalita, stato, creata, voto, punti, massimo, capitolo, argomento FROM simulazioni WHERE codice = ? ORDER BY creata DESC LIMIT ?')
    .bind(codice, limite)
    .all<Pick<Simulazione, 'id' | 'formato' | 'modalita' | 'stato' | 'creata' | 'voto' | 'punti' | 'massimo' | 'capitolo' | 'argomento'>>();
  return results;
}

/**
 * Consegna: corregge subito le multiple; se ci sono aperte con testo, accoda la correzione all'agente.
 * `valori` contiene la risposta per ordine (indice come stringa per la multipla, testo per l'aperta).
 */
export async function consegna(id: string, valori: Map<number, string>): Promise<'corretta' | 'in_correzione' | null> {
  const dati = await getSimulazione(id);
  if (!dati || dati.sim.stato !== 'in_corso') return null;
  const aggiornamenti: D1PreparedStatement[] = [];
  const daCorreggere: RichiestaCorrezione['risposte'] = [];
  let punti = 0;

  for (const r of dati.risposte) {
    const v = (valori.get(r.ordine) ?? (dati.sim.modalita === 'orale' ? r.risposta ?? '' : '')).trim();
    if (r.domanda.tipo === 'multipla') {
      const giusta = v !== '' && Number(v) === r.domanda.corretta;
      const p = giusta ? r.massimo : 0;
      punti += p;
      aggiornamenti.push(env.DB.prepare('UPDATE risposte SET risposta = ?, punti = ? WHERE simulazione = ? AND ordine = ?').bind(v || null, p, id, r.ordine));
    } else if (!v) {
      aggiornamenti.push(
        env.DB.prepare('UPDATE risposte SET risposta = NULL, punti = 0, esito = ? WHERE simulazione = ? AND ordine = ?').bind(
          JSON.stringify({ mancanti: r.domanda.puntiChiave, commento: 'Risposta non data.' }),
          id,
          r.ordine,
        ),
      );
    } else {
      aggiornamenti.push(env.DB.prepare('UPDATE risposte SET risposta = ? WHERE simulazione = ? AND ordine = ?').bind(v.slice(0, 8000), id, r.ordine));
      const extra =
        r.approfondimento && r.rispostaExtra
          ? `\n\n[Domanda di approfondimento del docente: ${r.approfondimento}]\n[Risposta dello studente: ${r.rispostaExtra}]`
          : '';
      daCorreggere.push({
        ordine: r.ordine,
        nucleo: r.domanda.nucleo,
        domanda: r.domanda.testo,
        puntiChiave: r.domanda.puntiChiave,
        rispostaModello: r.domanda.rispostaModello,
        risposta: (v + extra).slice(0, 10000),
        massimo: r.massimo,
        metriche: (r.metriche as Record<string, unknown> | null) ?? null,
      });
    }
  }

  const massimo = dati.risposte.reduce((s, r) => s + r.massimo, 0);
  const stato = daCorreggere.length ? 'in_correzione' : 'corretta';
  aggiornamenti.push(
    env.DB.prepare(
      `UPDATE simulazioni SET stato = ?, consegnata = ?, punti = ?, massimo = ?, voto = ?, corretta = ? WHERE id = ?`,
    ).bind(stato, adesso(), punti, massimo, stato === 'corretta' ? votoDa(punti, massimo) : null, stato === 'corretta' ? adesso() : null, id),
  );
  await env.DB.batch(aggiornamenti);
  // Le multiple sono già corrette: i loro errori diventano subito carte da ripassare.
  await carteDaSimulazione(id);

  if (daCorreggere.length) {
    const richiesta: RichiestaCorrezione = { simulazione: id, codice: dati.sim.codice, modalita: dati.sim.modalita, istruzioni: (await getProfilo(dati.sim.codice)).istruzioni, risposte: daCorreggere };
    await accoda('correzione', dati.sim.codice, richiesta);
  }
  return stato;
}

/** Applica la correzione dell'agente alle aperte e chiude la simulazione con il voto stimato. */
export async function applicaCorrezione(id: string, c: RisultatoCorrezione) {
  const dati = await getSimulazione(id);
  if (!dati) return;
  const aggiornamenti: D1PreparedStatement[] = [];
  for (const v of c.valutazioni) {
    const r = dati.risposte.find((x) => x.ordine === v.ordine && x.domanda.tipo === 'aperta');
    if (!r) continue;
    const p = Math.max(0, Math.min(r.massimo, Math.round(v.punti * 2) / 2));
    r.punti = p;
    aggiornamenti.push(
      env.DB.prepare('UPDATE risposte SET punti = ?, esito = ? WHERE simulazione = ? AND ordine = ?').bind(
        p,
        JSON.stringify({ coperti: v.coperti, mancanti: v.mancanti, errori: v.errori, commento: v.commento }),
        id,
        v.ordine,
      ),
    );
  }
  const punti = dati.risposte.reduce((s, r) => s + (r.punti ?? 0), 0);
  const massimo = dati.risposte.reduce((s, r) => s + r.massimo, 0);
  aggiornamenti.push(
    env.DB.prepare(`UPDATE simulazioni SET stato = 'corretta', corretta = ?, punti = ?, massimo = ?, voto = ?, giudizio = ?, esposizione = ? WHERE id = ?`).bind(
      adesso(),
      punti,
      massimo,
      votoDa(punti, massimo),
      c.giudizio,
      c.esposizione ? JSON.stringify(c.esposizione) : null,
      id,
    ),
  );
  await env.DB.batch(aggiornamenti);
  await carteDaSimulazione(id);
}

export async function eliminaSimulazione(id: string) {
  await env.DB.batch([
    env.DB.prepare('UPDATE domande SET usata = MAX(usata - 1, 0) WHERE id IN (SELECT domanda FROM risposte WHERE simulazione = ?)').bind(id),
    ...eliminaCarteDi(id),
    env.DB.prepare('DELETE FROM risposte WHERE simulazione = ?').bind(id), env.DB.prepare('DELETE FROM simulazioni WHERE id = ?').bind(id)]);
}

/** Orale: salva la trascrizione e le metriche di una risposta (l'audio non viene mai salvato). */
export async function salvaTrascrizione(
  id: string,
  ordine: number,
  testo: string,
  metriche: import('./calcoli').MetricheParlato,
  parte: 'principale' | 'approfondimento' = 'principale',
) {
  const colonne = parte === 'approfondimento' ? 'risposta_extra = ?, metriche_extra = ?' : 'risposta = ?, metriche = ?, approfondimento = NULL, risposta_extra = NULL, metriche_extra = NULL';
  const r = await env.DB.prepare(
    `UPDATE risposte SET ${colonne} WHERE simulazione = ? AND ordine = ?
       AND EXISTS (SELECT 1 FROM simulazioni WHERE id = ? AND stato = 'in_corso' AND modalita = 'orale')`,
  )
    .bind(testo.slice(0, 8000), JSON.stringify(metriche), id, ordine, id)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

// ---------- Orale dal vivo: domanda di approfondimento ----------

async function lavoroApprofondimento(id: string, ordine: number) {
  return env.DB.prepare(
    `SELECT id, stato, errore FROM lavori WHERE tipo = 'approfondimento'
       AND json_extract(richiesta, '$.simulazione') = ? AND json_extract(richiesta, '$.ordine') = ?
     ORDER BY creato DESC LIMIT 1`,
  )
    .bind(id, ordine)
    .first<{ id: string; stato: string; errore: string | null }>();
}

export type StatoApprofondimento =
  | { stato: 'pronto'; domanda: string }
  | { stato: 'nessuno' }
  | { stato: 'in_attesa' }
  | { stato: 'errore'; messaggio: string }
  | { stato: 'non_previsto' };

export async function statoApprofondimento(id: string, ordine: number): Promise<StatoApprofondimento> {
  const r = await env.DB.prepare('SELECT approfondimento FROM risposte WHERE simulazione = ? AND ordine = ?').bind(id, ordine).first<{ approfondimento: string | null }>();
  if (r?.approfondimento) return { stato: 'pronto', domanda: r.approfondimento };
  if (r?.approfondimento === '') return { stato: 'nessuno' };
  const l = await lavoroApprofondimento(id, ordine);
  if (!l) return { stato: 'non_previsto' };
  if (l.stato === 'errore') return { stato: 'errore', messaggio: l.errore ?? 'non riuscito' };
  return { stato: 'in_attesa' };
}

/** Chiede all'agente una domanda di approfondimento sulla risposta appena trascritta. */
export async function chiediApprofondimento(id: string, ordine: number): Promise<StatoApprofondimento> {
  const dati = await getSimulazione(id);
  if (!dati || dati.sim.stato !== 'in_corso' || !dati.sim.dal_vivo) return { stato: 'non_previsto' };
  const r = dati.risposte.find((x) => x.ordine === ordine);
  if (!r?.risposta) return { stato: 'non_previsto' };
  const attuale = await statoApprofondimento(id, ordine);
  if (attuale.stato !== 'non_previsto' && attuale.stato !== 'errore') return attuale;
  const richiesta: RichiestaApprofondimento = {
    simulazione: id,
    ordine,
    codice: dati.sim.codice,
    nucleo: r.domanda.nucleo,
    domanda: r.domanda.testo,
    puntiChiave: r.domanda.puntiChiave,
    rispostaModello: r.domanda.rispostaModello,
    risposta: r.risposta,
    istruzioni: (await getProfilo(dati.sim.codice)).istruzioni,
  };
  await accoda('approfondimento', dati.sim.codice, richiesta);
  return { stato: 'in_attesa' };
}

export async function salvaApprofondimento(id: string, ordine: number, serve: boolean, domanda: string) {
  await env.DB.prepare('UPDATE risposte SET approfondimento = ? WHERE simulazione = ? AND ordine = ?')
    .bind(serve && domanda.trim() ? domanda.trim().slice(0, 1000) : '', id, ordine)
    .run();
}

// ---------- Costanza e ultimi esiti (pagina Oggi) ----------

/** Data di calendario a Roma (AAAA-MM-GG): il giorno di studio segue l'ora italiana, non UTC. */
export const giornoRoma = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);

/**
 * Giorni di studio: un giorno conta se contiene almeno una simulazione o un ripasso.
 * `diFila` conta i giorni consecutivi fino a oggi (o fino a ieri, se oggi non hai ancora simulato);
 * `settimana` dice per gli ultimi 7 giorni, dal più vecchio a oggi, se hai simulato.
 */
export async function giorniDiStudio() {
  const da = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { results } = await env.DB.prepare('SELECT creata FROM simulazioni WHERE creata >= ?').bind(da).all<{ creata: string }>();
  const giorni = new Set([...results.map((r) => giornoRoma(new Date(r.creata))), ...(await giorniConRipasso(da))]);
  const giorno = (indietro: number) => giornoRoma(new Date(Date.now() - indietro * 86_400_000));
  const inizio = giorni.has(giorno(0)) ? 0 : 1;
  let diFila = 0;
  while (giorni.has(giorno(inizio + diFila))) diFila++;
  const settimana = Array.from({ length: 7 }, (_, i) => giorni.has(giorno(6 - i)));
  return { diFila, settimana, oggi: giorni.has(giorno(0)) };
}

/** Per materia: quante simulazioni corrette e l'ultimo voto. */
export async function ultimiEsiti() {
  const { results } = await env.DB.prepare(
    `SELECT codice, COUNT(*) AS n,
            (SELECT voto FROM simulazioni s2 WHERE s2.codice = s.codice AND s2.stato = 'corretta' ORDER BY creata DESC LIMIT 1) AS voto
       FROM simulazioni s WHERE stato = 'corretta' GROUP BY codice`,
  ).all<{ codice: string; n: number; voto: number | null }>();
  return new Map(results.map((r) => [r.codice, { n: r.n, voto: r.voto }]));
}

// ---------- Piano a ritroso (calendario fino all'appello) ----------

/**
 * Piano a ritroso di una materia, dalla padronanza reale di oggi: i capitoli con argomenti del kit,
 * nell'ordine degli appunti, pesati per numero di argomenti; "solido" se lo è il capitolo.
 * null se manca la data dell'appello o la materia non ha appunti.
 */
export async function pianoMateria(
  materia: { codice: string | null; appunti?: { capitoli: { file: string }[] } | null },
  profilo: Profilo,
  capitoliPadronanza?: Map<string, CapitoloPadronanza>,
) {
  if (!materia.codice || !profilo.dataAppello || !materia.appunti) return null;
  const [perCapitolo, padronanza] = await Promise.all([
    nucleiPerCapitolo(materia.codice),
    capitoliPadronanza ? Promise.resolve(capitoliPadronanza) : padronanzaMateria(materia.codice, 'scritto'),
  ]);
  const capitoli = materia.appunti.capitoli
    .filter((c) => (perCapitolo.get(c.file)?.length ?? 0) > 0)
    .map((c) => ({ file: c.file, peso: perCapitolo.get(c.file)!.length, solido: padronanza.get(c.file)?.stato === 'solido' }));
  if (!capitoli.length) return null;
  return pianoARitroso(giornoRoma(new Date()), profilo.dataAppello, profilo.giorniStudio, capitoli);
}
