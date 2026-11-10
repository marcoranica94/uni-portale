import { env } from 'cloudflare:workers';
import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { DomandaCompleta, RichiestaCorrezione, RisultatoCorrezione } from '../shared/schemi';
import { accoda } from './coda';
import { votoDa } from './calcoli';
export { domandaValida, votoDa } from './calcoli';

/** Formati della simulazione scritta: numero di domande per tipo e durata. */
export const FORMATI = {
  breve: { etichetta: 'Breve', multiple: 5, aperte: 1, minuti: 10 },
  completo: { etichetta: 'Completo', multiple: 10, aperte: 3, minuti: 60 },
} as const;
export type Formato = keyof typeof FORMATI;

/** Punti per tipo: la scelta multipla vale 1, l'aperta 4 (stima: il syllabus non dà i pesi). */
export const PUNTI = { multipla: 1, aperta: 4 } as const;

const adesso = () => new Date().toISOString();

// ---------- Banca di domande ----------

export async function ultimoLotto(codice: string): Promise<string | null> {
  const r = await env.DB.prepare('SELECT lotto FROM domande WHERE codice = ? ORDER BY creata DESC LIMIT 1').bind(codice).first<{ lotto: string }>();
  return r?.lotto ?? null;
}

export async function contaBanca(codice: string) {
  const lotto = await ultimoLotto(codice);
  if (!lotto) return { lotto: null, multiple: 0, aperte: 0 };
  const { results } = await env.DB.prepare('SELECT tipo, COUNT(*) AS n FROM domande WHERE codice = ? AND lotto = ? GROUP BY tipo')
    .bind(codice, lotto)
    .all<{ tipo: string; n: number }>();
  const n = (t: string) => results.find((r) => r.tipo === t)?.n ?? 0;
  return { lotto, multiple: n('multipla'), aperte: n('aperta') };
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

/** Crea una simulazione pescando le domande meno usate della banca attiva. */
export async function creaSimulazione(codice: string, formato: Formato): Promise<string | null> {
  const lotto = await ultimoLotto(codice);
  if (!lotto) return null;
  const f = FORMATI[formato];
  const pesca = async (tipo: 'multipla' | 'aperta', n: number) =>
    (
      await env.DB.prepare('SELECT id FROM domande WHERE codice = ? AND lotto = ? AND tipo = ? ORDER BY usata ASC, RANDOM() LIMIT ?')
        .bind(codice, lotto, tipo, n)
        .all<{ id: string }>()
    ).results.map((r) => r.id);
  const scelte = [...(await pesca('multipla', f.multiple)).map((id) => ({ id, tipo: 'multipla' as const })), ...(await pesca('aperta', f.aperte)).map((id) => ({ id, tipo: 'aperta' as const }))];
  if (!scelte.length) return null;

  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO simulazioni (id, codice, formato, minuti) VALUES (?, ?, ?, ?)').bind(id, codice, formato, f.minuti),
    ...scelte.map((s, i) => env.DB.prepare('INSERT INTO risposte (simulazione, ordine, domanda, massimo) VALUES (?, ?, ?, ?)').bind(id, i + 1, s.id, PUNTI[s.tipo])),
    ...scelte.map((s) => env.DB.prepare('UPDATE domande SET usata = usata + 1 WHERE id = ?').bind(s.id)),
  ]);
  return id;
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
}

export async function getSimulazione(id: string): Promise<{ sim: Simulazione; risposte: Risposta[] } | null> {
  const sim = await env.DB.prepare('SELECT * FROM simulazioni WHERE id = ?').bind(id).first<Simulazione>();
  if (!sim) return null;
  const { results } = await env.DB.prepare(
    `SELECT r.ordine, r.risposta, r.punti, r.massimo, r.esito, d.id, d.nucleo, d.tipo, d.testo, d.opzioni, d.corretta, d.spiegazione,
            d.punti_chiave, d.risposta_modello, d.file, d.pagine
     FROM risposte r JOIN domande d ON d.id = r.domanda WHERE r.simulazione = ? ORDER BY r.ordine`,
  )
    .bind(id)
    .all<RigaDomanda & { ordine: number; risposta: string | null; punti: number | null; massimo: number; esito: string | null }>();
  return {
    sim,
    risposte: results.map((r) => ({
      ordine: r.ordine,
      domanda: daRiga(r),
      risposta: r.risposta,
      punti: r.punti,
      massimo: r.massimo,
      esito: r.esito ? (JSON.parse(r.esito) as Esito) : null,
    })),
  };
}

export async function storico(codice: string, limite = 5) {
  const { results } = await env.DB.prepare('SELECT id, formato, stato, creata, voto, punti, massimo FROM simulazioni WHERE codice = ? ORDER BY creata DESC LIMIT ?')
    .bind(codice, limite)
    .all<Pick<Simulazione, 'id' | 'formato' | 'stato' | 'creata' | 'voto' | 'punti' | 'massimo'>>();
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
    const v = (valori.get(r.ordine) ?? '').trim();
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
      daCorreggere.push({
        ordine: r.ordine,
        nucleo: r.domanda.nucleo,
        domanda: r.domanda.testo,
        puntiChiave: r.domanda.puntiChiave,
        rispostaModello: r.domanda.rispostaModello,
        risposta: v.slice(0, 8000),
        massimo: r.massimo,
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

  if (daCorreggere.length) {
    const richiesta: RichiestaCorrezione = { simulazione: id, codice: dati.sim.codice, risposte: daCorreggere };
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
    env.DB.prepare(`UPDATE simulazioni SET stato = 'corretta', corretta = ?, punti = ?, massimo = ?, voto = ?, giudizio = ? WHERE id = ?`).bind(
      adesso(),
      punti,
      massimo,
      votoDa(punti, massimo),
      c.giudizio,
      id,
    ),
  );
  await env.DB.batch(aggiornamenti);
}

export async function eliminaSimulazione(id: string) {
  await env.DB.batch([
    env.DB.prepare('UPDATE domande SET usata = MAX(usata - 1, 0) WHERE id IN (SELECT domanda FROM risposte WHERE simulazione = ?)').bind(id),env.DB.prepare('DELETE FROM risposte WHERE simulazione = ?').bind(id), env.DB.prepare('DELETE FROM simulazioni WHERE id = ?').bind(id)]);
}
