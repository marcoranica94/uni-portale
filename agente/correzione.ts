/// <reference types="node" />
/**
 * Correzione delle risposte aperte di una simulazione, con la rubrica della domanda
 * e il nucleo del kit come riferimento (niente conoscenze esterne).
 */
import { CorrezioneModello, RichiestaCorrezione, type NomeAgente, type RisultatoCorrezione } from '../src/shared/schemi.ts';
import { genera } from './adattatori.ts';
import { HOST } from './config.ts';
import { leggiKit } from './kit.ts';

const ISTRUZIONI = (materia: string) => `Sei il docente di "${materia}" e correggi le risposte APERTE di una simulazione d'esame scritto.

Per ogni risposta hai: la domanda, la rubrica ("puntiChiave"), una risposta modello, il punteggio massimo e il nucleo del kit d'esame da cui nasce la domanda.
Regole:
- Valuta SOLO rispetto alla rubrica e al nucleo: non premiare né penalizzare con conoscenze esterne.
- Assegna i punti in proporzione ai punti chiave coperti correttamente (mezzi punti ammessi); togli per errori concettuali o attribuzioni sbagliate.
- "coperti" e "mancanti" riportano i punti chiave della rubrica (riformulati brevemente); "errori" solo errori veri presenti nella risposta.
- "commento": 2-3 frasi concrete su cosa aggiungere o correggere, in italiano, rivolgendoti allo studente con il tu.
- Mantieni lo stesso "ordine" delle risposte ricevute.
- "giudizio": valutazione complessiva in 2-3 frasi.`;

export async function correggi(richiestaGrezza: unknown, opz: { agente: NomeAgente; modello?: string; log?: (m: string) => void }): Promise<RisultatoCorrezione> {
  const richiesta = RichiestaCorrezione.parse(richiestaGrezza);
  const kit = await leggiKit(richiesta.codice);
  const contenuto = richiesta.risposte.map((r) => ({
    ordine: r.ordine,
    massimo: r.massimo,
    domanda: r.domanda,
    puntiChiave: r.puntiChiave,
    rispostaModello: r.rispostaModello,
    nucleo: kit.nuclei.find((n) => n.id === r.nucleo) ?? null,
    risposta: r.risposta,
  }));
  const inizio = Date.now();
  const c = await genera({
    agente: opz.agente,
    modello: opz.modello,
    istruzioni: ISTRUZIONI(kit.meta.materia),
    contenuto: JSON.stringify(contenuto, null, 1),
    schema: CorrezioneModello,
  });
  opz.log?.(`correzione: ${c.valutazioni.length} risposte in ${Math.round((Date.now() - inizio) / 1000)} s`);
  return { ...c, agente: `${opz.agente}@${HOST}` };
}
