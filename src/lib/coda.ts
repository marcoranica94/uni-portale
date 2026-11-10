import { env } from 'cloudflare:workers';
import type { Lavoro, TipoLavoro } from '../shared/schemi';

/** Un lavoro preso da un agente e non concluso entro questo tempo torna in coda. */
const SCADENZA_MINUTI = 30;
/** Un agente che non si fa sentire da più di così risulta offline. */
const ONLINE_SECONDI = 120;
const MAX_TENTATIVI = 3;

const adesso = () => new Date().toISOString();

export async function registraBattito(id: string, versione: string) {
  await env.DB.prepare(
    `INSERT INTO agenti (id, ultimo_contatto, versione) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET ultimo_contatto = excluded.ultimo_contatto, versione = excluded.versione`,
  )
    .bind(id, adesso(), versione)
    .run();
}

export async function statoAgenti(): Promise<{ online: boolean; ultimo: string | null; id: string | null }> {
  const r = await env.DB.prepare('SELECT id, ultimo_contatto FROM agenti ORDER BY ultimo_contatto DESC LIMIT 1').first<{
    id: string;
    ultimo_contatto: string;
  }>();
  if (!r) return { online: false, ultimo: null, id: null };
  const online = Date.now() - Date.parse(r.ultimo_contatto) < ONLINE_SECONDI * 1000;
  return { online, ultimo: r.ultimo_contatto, id: r.id };
}

/** Prende il lavoro più vecchio in coda tra i tipi indicati, in modo atomico. */
export async function preleva(agente: string, tipi: TipoLavoro[]): Promise<Lavoro | null> {
  const scadenza = new Date(Date.now() - SCADENZA_MINUTI * 60_000).toISOString();
  // Lavori rimasti appesi (agente spento a metà): tornano in coda.
  await env.DB.prepare(`UPDATE lavori SET stato = 'in_coda', agente = NULL WHERE stato = 'in_corso' AND preso < ?`)
    .bind(scadenza)
    .run();

  const segnaposto = tipi.map(() => '?').join(', ');
  const r = await env.DB.prepare(
    `UPDATE lavori SET stato = 'in_corso', preso = ?, agente = ?, tentativi = tentativi + 1
     WHERE id = (SELECT id FROM lavori WHERE stato = 'in_coda' AND tipo IN (${segnaposto}) ORDER BY creato LIMIT 1)
     RETURNING id, tipo, codice, richiesta, tentativi`,
  )
    .bind(adesso(), agente, ...tipi)
    .first<{ id: string; tipo: TipoLavoro; codice: string | null; richiesta: string; tentativi: number }>();
  if (!r) return null;
  return { ...r, richiesta: JSON.parse(r.richiesta || '{}') };
}

export async function getLavoro(id: string) {
  return env.DB.prepare('SELECT id, tipo, codice, stato, agente FROM lavori WHERE id = ?')
    .bind(id)
    .first<{ id: string; tipo: TipoLavoro; codice: string | null; stato: string; agente: string | null }>();
}

export async function completa(id: string, risultato: unknown) {
  await env.DB.prepare(`UPDATE lavori SET stato = 'completato', risultato = ?, errore = NULL, concluso = ? WHERE id = ?`)
    .bind(JSON.stringify(risultato), adesso(), id)
    .run();
}

export async function segnaErrore(id: string, messaggio: string, ritenta: boolean) {
  await env.DB.prepare(
    `UPDATE lavori SET errore = ?,
       stato = CASE WHEN ? = 1 AND tentativi < ? THEN 'in_coda' ELSE 'errore' END,
       agente = NULL,
       concluso = CASE WHEN ? = 1 AND tentativi < ? THEN NULL ELSE ? END
     WHERE id = ?`,
  )
    .bind(messaggio, ritenta ? 1 : 0, MAX_TENTATIVI, ritenta ? 1 : 0, MAX_TENTATIVI, adesso(), id)
    .run();
}

export async function accoda(tipo: TipoLavoro, codice: string | null, richiesta: Record<string, unknown> = {}) {
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO lavori (id, tipo, codice, richiesta) VALUES (?, ?, ?, ?)')
    .bind(id, tipo, codice, JSON.stringify(richiesta))
    .run();
  return id;
}

/** Ultimo lavoro di un tipo per una materia (per mostrarne lo stato). */
export async function ultimoLavoro(tipo: TipoLavoro, codice: string) {
  return env.DB.prepare(
    'SELECT id, stato, errore, creato, concluso, agente FROM lavori WHERE tipo = ? AND codice = ? ORDER BY creato DESC LIMIT 1',
  )
    .bind(tipo, codice)
    .first<{ id: string; stato: string; errore: string | null; creato: string; concluso: string | null; agente: string | null }>();
}

export async function getKit(codice: string) {
  return env.DB.prepare('SELECT codice, impronta, nuclei, commit_git, agente, generato FROM kit WHERE codice = ?')
    .bind(codice)
    .first<{ codice: string; impronta: string; nuclei: number; commit_git: string | null; agente: string | null; generato: string }>();
}

export async function salvaKit(codice: string, k: { impronta: string; nuclei: number; commit: string | null; agente: string; generato: string }) {
  await env.DB.prepare(
    `INSERT INTO kit (codice, impronta, nuclei, commit_git, agente, generato) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(codice) DO UPDATE SET impronta = excluded.impronta, nuclei = excluded.nuclei,
       commit_git = excluded.commit_git, agente = excluded.agente, generato = excluded.generato`,
  )
    .bind(codice, k.impronta, k.nuclei, k.commit, k.agente, k.generato)
    .run();
}
