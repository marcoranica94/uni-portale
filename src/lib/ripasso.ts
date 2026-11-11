/**
 * Ripasso degli errori (t032, t033): le domande sbagliate nelle simulazioni diventano carte,
 * pianificate con FSRS (lib/fsrs.ts). Il retro della carta è la correzione di quella risposta.
 */
import { env } from 'cloudflare:workers';
import { daRipassare, inizioDomaniRoma, NUOVE_AL_GIORNO } from './calcoli';
import { valuta, type Voto } from './fsrs';
import { giornoRoma, getSimulazione, type Domanda, type Esito } from './simulazioni';

/** Fino a quanti minuti in anticipo si ripassa una carta in apprendimento, se non c'è altro da fare. */
const ANTICIPO_MINUTI = 20;

/** Crea le carte dagli errori corretti di una simulazione; una domanda sbagliata di nuovo torna subito in ripasso. */
export async function carteDaSimulazione(id: string) {
  const dati = await getSimulazione(id);
  if (!dati) return;
  const errori = dati.risposte.filter((r) => daRipassare(r.punti, r.massimo));
  if (!errori.length) return;
  const ora = new Date().toISOString();
  await env.DB.batch(
    errori.map((r) =>
      env.DB.prepare(
        `INSERT INTO carte (id, codice, domanda, simulazione, ordine, scadenza) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(domanda) DO UPDATE SET simulazione = excluded.simulazione, ordine = excluded.ordine,
           scadenza = CASE WHEN carte.simulazione = excluded.simulazione THEN carte.scadenza ELSE excluded.scadenza END,
           archiviata = CASE WHEN carte.simulazione = excluded.simulazione THEN carte.archiviata ELSE 0 END`,
      ).bind(crypto.randomUUID(), dati.sim.codice, r.domanda.id, id, r.ordine, ora),
    ),
  );
}

/** Quando si elimina una simulazione, spariscono le carte nate solo da lei. */
export function eliminaCarteDi(id: string) {
  return env.DB.prepare('DELETE FROM carte WHERE simulazione = ?').bind(id);
}

/** Nuove già introdotte oggi (ora di Roma). */
async function nuoveOggi(adesso: Date): Promise<number> {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM ripassi WHERE giorno = ? AND nuova = 1').bind(giornoRoma(adesso)).first<{ n: number }>();
  return r?.n ?? 0;
}

const DOVUTA = `c.archiviata = 0 AND c.fsrs IS NOT NULL AND (
  (json_extract(c.fsrs, '$.state') = 2 AND c.scadenza < ?1) OR (json_extract(c.fsrs, '$.state') != 2 AND c.scadenza <= ?2))`;
const NUOVA = 'c.archiviata = 0 AND c.fsrs IS NULL';
const ATTIVA = "EXISTS (SELECT 1 FROM domande d WHERE d.id = c.domanda AND d.archiviata = 0)";

export interface RiepilogoRipasso {
  /** Carte da fare oggi: dovute adesso + nuove entro il limite del giorno. */
  oggi: number;
  nuove: number;
  daRipassare: number;
  /** Carte in apprendimento che tornano più tardi oggi. */
  piuTardi: number;
  /** Prossima scadenza dopo oggi, se oggi non c'è niente. */
  prossima: string | null;
  totale: number;
  perMateria: Map<string, number>;
}

/** Quante carte ci sono oggi, in tutto e per materia (pagina Oggi e testata del ripasso). */
export async function riepilogoRipasso(adesso = new Date()): Promise<RiepilogoRipasso> {
  const domani = inizioDomaniRoma(adesso).toISOString();
  const ora = adesso.toISOString();
  const [dovute, nuove, tardi, tot, prossima, fatte] = await Promise.all([
    env.DB.prepare(`SELECT c.codice, COUNT(*) AS n FROM carte c WHERE ${DOVUTA} AND ${ATTIVA} GROUP BY c.codice`).bind(domani, ora).all<{ codice: string; n: number }>(),
    env.DB.prepare(`SELECT c.codice, COUNT(*) AS n FROM carte c WHERE ${NUOVA} AND ${ATTIVA} GROUP BY c.codice ORDER BY MIN(c.creata)`).all<{ codice: string; n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM carte c WHERE c.archiviata = 0 AND json_extract(c.fsrs, '$.state') != 2 AND c.scadenza > ?1 AND c.scadenza < ?2 AND ${ATTIVA}`)
      .bind(ora, domani)
      .first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM carte c WHERE c.archiviata = 0 AND ${ATTIVA}`).first<{ n: number }>(),
    env.DB.prepare(`SELECT MIN(c.scadenza) AS s FROM carte c WHERE c.archiviata = 0 AND c.fsrs IS NOT NULL AND c.scadenza >= ? AND ${ATTIVA}`).bind(domani).first<{ s: string | null }>(),
    nuoveOggi(adesso),
  ]);
  const perMateria = new Map<string, number>();
  let daRipassare = 0;
  for (const r of dovute.results) {
    perMateria.set(r.codice, r.n);
    daRipassare += r.n;
  }
  let quota = Math.max(0, NUOVE_AL_GIORNO - fatte);
  let nuoveOggiN = 0;
  for (const r of nuove.results) {
    const n = Math.min(quota, r.n);
    quota -= n;
    nuoveOggiN += n;
    if (n) perMateria.set(r.codice, (perMateria.get(r.codice) ?? 0) + n);
  }
  return { oggi: daRipassare + nuoveOggiN, nuove: nuoveOggiN, daRipassare, piuTardi: tardi?.n ?? 0, prossima: prossima?.s ?? null, totale: tot?.n ?? 0, perMateria };
}

export interface Carta {
  id: string;
  codice: string;
  scadenza: string;
  fsrs: string | null;
  ripassi: number;
  domanda: Domanda;
  /** La risposta data nella simulazione da cui nasce la carta e la sua correzione. */
  risposta: string | null;
  punti: number | null;
  massimo: number;
  esito: Esito | null;
  simulazione: string;
}

interface RigaCarta {
  id: string;
  codice: string;
  scadenza: string;
  fsrs: string | null;
  ripassi: number;
  simulazione: string;
  ordine: number;
}

/**
 * Prossima carta da ripassare (di una materia, se indicata): prima quelle in apprendimento e in ripasso
 * già scadute, poi le nuove entro il limite del giorno, infine quelle in apprendimento che tornano a breve.
 */
export async function prossimaCarta(codice: string | null, adesso = new Date()): Promise<Carta | null> {
  const domani = inizioDomaniRoma(adesso).toISOString();
  const ora = adesso.toISOString();
  const anticipo = new Date(adesso.getTime() + ANTICIPO_MINUTI * 60_000).toISOString();
  const cerca = (dove: string, ordine: string, valori: unknown[]) =>
    env.DB.prepare(
      `SELECT c.id, c.codice, c.scadenza, c.fsrs, c.ripassi, c.simulazione, c.ordine FROM carte c
        WHERE ${dove} AND ${ATTIVA}${codice ? ' AND c.codice = ?' : ''} ORDER BY ${ordine} LIMIT 1`,
    )
      .bind(...valori, ...(codice ? [codice] : []))
      .first<RigaCarta>();
  let riga = await cerca(DOVUTA, 'c.scadenza', [domani, ora]);
  if (!riga && (await nuoveOggi(adesso)) < NUOVE_AL_GIORNO) riga = await cerca(NUOVA, 'c.creata, c.ordine', []);
  if (!riga) riga = await cerca("c.archiviata = 0 AND json_extract(c.fsrs, '$.state') != 2 AND c.scadenza <= ?", 'c.scadenza', [anticipo]);
  return riga ? completaCarta(riga) : null;
}

async function completaCarta(c: RigaCarta): Promise<Carta | null> {
  const dati = await getSimulazione(c.simulazione);
  const r = dati?.risposte.find((x) => x.ordine === c.ordine);
  if (!r) return null;
  return { id: c.id, codice: c.codice, scadenza: c.scadenza, fsrs: c.fsrs, ripassi: c.ripassi, simulazione: c.simulazione, domanda: r.domanda, risposta: r.risposta, punti: r.punti, massimo: r.massimo, esito: r.esito };
}

/** Registra il voto dello studente; `scadenzaVista` evita di valutare due volte la stessa carta (doppio tocco). */
export async function registraRipasso(id: string, voto: Voto, scadenzaVista: string, adesso = new Date()): Promise<boolean> {
  const c = await env.DB.prepare('SELECT codice, fsrs, scadenza FROM carte WHERE id = ? AND archiviata = 0').bind(id).first<{ codice: string; fsrs: string | null; scadenza: string }>();
  if (!c || c.scadenza !== scadenzaVista) return false;
  const nuovo = await valuta(c.fsrs, voto, adesso);
  const r = await env.DB.prepare('UPDATE carte SET fsrs = ?, scadenza = ?, ripassi = ripassi + 1 WHERE id = ? AND scadenza = ?')
    .bind(nuovo.fsrs, nuovo.scadenza, id, scadenzaVista)
    .run();
  if ((r.meta?.changes ?? 0) === 0) return false;
  await env.DB.prepare('INSERT INTO ripassi (carta, codice, quando, giorno, voto, nuova) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, c.codice, adesso.toISOString(), giornoRoma(adesso), voto, c.fsrs ? 0 : 1)
    .run();
  return true;
}

/** Toglie una carta dal ripasso (domanda inutile o già saputa); torna se la sbagli in un'altra simulazione. */
export async function archiviaCarta(id: string) {
  await env.DB.prepare('UPDATE carte SET archiviata = 1 WHERE id = ?').bind(id).run();
}

/** Giorni (ora di Roma) con almeno un ripasso negli ultimi `giorni`: contano come giorni di studio. */
export async function giorniConRipasso(da: string): Promise<Set<string>> {
  const { results } = await env.DB.prepare('SELECT DISTINCT giorno FROM ripassi WHERE quando >= ?').bind(da).all<{ giorno: string }>();
  return new Set(results.map((r) => r.giorno));
}
