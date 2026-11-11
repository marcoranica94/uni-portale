/**
 * Pianificazione dei ripassi con FSRS (ts-fsrs): nessuna dipendenza da Cloudflare, si prova con node:test.
 * Ritenzione desiderata 90%; passi di apprendimento brevi (1 e 10 minuti) perché una carta sbagliata
 * torni nella stessa sessione; nessuna casualità, così i pulsanti dicono esattamente quando torna.
 */
import { DefaultScheduler, Rating } from 'ts-fsrs';

export type Voto = 1 | 2 | 3 | 4;
export const VOTI: { voto: Voto; etichetta: string }[] = [
  { voto: Rating.Again as Voto, etichetta: 'Non la sapevo' },
  { voto: Rating.Hard as Voto, etichetta: 'A fatica' },
  { voto: Rating.Good as Voto, etichetta: 'La sapevo' },
  { voto: Rating.Easy as Voto, etichetta: 'Facile' },
];

type Pianificatore = Awaited<ReturnType<typeof DefaultScheduler>>;
// I tipi di ts-fsrs 6 uniscono i modelli (FSRS-7 ha stabilityFast): la carta passa come valore opaco.
type CartaFsrs = ReturnType<Pianificatore['newCard']>;

let pianificatore: Promise<Pianificatore> | null = null;
const pianifica = () =>
  (pianificatore ??= DefaultScheduler({ version: 'FSRS-7', desiredRetention: 0.9, enableFuzz: false, enableShortTerm: true, learningSteps: ['1m', '10m'], relearningSteps: ['10m'], maximumInterval: 365 }));

/** Stato FSRS salvato in D1 (JSON): le date tornano oggetti Date. */
function leggi(json: string | null, adesso: Date, p: Pianificatore): CartaFsrs {
  if (!json) return p.newCard({ now: adesso });
  const c = JSON.parse(json) as Record<string, unknown>;
  for (const k of ['dueAt', 'lastReviewAt']) if (typeof c[k] === 'string') c[k] = new Date(c[k] as string);
  return c as unknown as CartaFsrs;
}

/** Fase della carta: "apprendimento" se sta ancora nei passi brevi, "ripasso" se ha un intervallo in giorni. */
export function fase(json: string | null): 'nuova' | 'apprendimento' | 'ripasso' {
  if (!json) return 'nuova';
  const stato = (JSON.parse(json) as { state?: number }).state;
  return stato === 2 ? 'ripasso' : 'apprendimento';
}

/** Per ogni voto, fra quanto tornerebbe la carta (millisecondi). */
export async function anteprima(json: string | null, adesso = new Date()): Promise<Record<Voto, number>> {
  const p = await pianifica();
  const carta = leggi(json, adesso, p);
  const esito = {} as Record<Voto, number>;
  for (const x of p.preview({ card: carta as never, now: adesso })) esito[x.grade as Voto] = new Date(x.card.dueAt).getTime() - adesso.getTime();
  return esito;
}

/** Applica il voto: nuovo stato (JSON) e nuova scadenza. */
export async function valuta(json: string | null, voto: Voto, adesso = new Date()): Promise<{ fsrs: string; scadenza: string; fase: 'apprendimento' | 'ripasso' }> {
  const p = await pianifica();
  const { card } = p.review({ card: leggi(json, adesso, p) as never, grade: voto, now: adesso });
  const fsrs = JSON.stringify(card);
  return { fsrs, scadenza: new Date(card.dueAt).toISOString(), fase: fase(fsrs) === 'ripasso' ? 'ripasso' : 'apprendimento' };
}
