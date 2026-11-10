/// <reference types="node" />
/**
 * Correzione delle risposte aperte di una simulazione, con la rubrica della domanda
 * e il nucleo del kit come riferimento (niente conoscenze esterne).
 */
import { CorrezioneModello, CorrezioneOraleModello, RichiestaCorrezione, type NomeAgente, type RisultatoCorrezione } from '../src/shared/schemi.ts';
import { genera } from './adattatori.ts';
import { HOST } from './config.ts';
import { leggiKit } from './kit.ts';

const ISTRUZIONI = (materia: string) => `Sei il docente di "${materia}" e correggi le risposte APERTE di una simulazione d'esame scritto.

Per ogni risposta hai: la domanda, la rubrica ("puntiChiave"), una risposta modello, il punteggio massimo e il nucleo del kit d'esame da cui nasce la domanda.
Regole:
- Valuta SOLO rispetto alla rubrica e al nucleo: non premiare né penalizzare con conoscenze esterne.
- Conta solo gli elementi della rubrica che la DOMANDA chiede davvero: se un punto chiave non è richiesto dal testo della domanda, la sua assenza non toglie punti (citalo semmai nel commento come approfondimento). Una risposta che copre tutto ciò che la domanda chiede, senza errori, prende il massimo.
- Assegna i punti in proporzione ai punti chiave coperti correttamente (mezzi punti ammessi); togli per errori concettuali o attribuzioni sbagliate.
- "coperti" e "mancanti" riportano i punti chiave della rubrica (riformulati brevemente); "errori" solo errori veri presenti nella risposta.
- "commento": 2-3 frasi concrete su cosa aggiungere o correggere, in italiano, rivolgendoti allo studente con il tu.
- Mantieni lo stesso "ordine" delle risposte ricevute.
- "giudizio": valutazione complessiva in 2-3 frasi.`;

const ISTRUZIONI_ORALE = (materia: string) => `${ISTRUZIONI(materia)}

QUESTA È UN'INTERROGAZIONE ORALE: le risposte sono trascrizioni automatiche del parlato.
- Ignora gli errori tipici della trascrizione (parole storpiate, punteggiatura): valuta il contenuto detto.
- In più valuta l'ESPOSIZIONE di tutta l'interrogazione in "esposizione":
  - "voto" da 1 a 10 su chiarezza, ordine del discorso, lessico tecnico della materia, fluidità e sicurezza;
  - usa le "metriche" di ogni risposta: parole al minuto (ritmo adatto all'orale circa 110-160), pause oltre 2 secondi, intercalari (ehm, cioè, diciamo…), secondi prima di iniziare;
  - "puntiForza" e "daMigliorare": osservazioni concrete, citando quando serve parole o abitudini della trascrizione;
  - "commento": 2-3 frasi pratiche su come esporre meglio all'esame, con il tu.`;

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
    ...(richiesta.modalita === 'orale' ? { metriche: r.metriche ?? null } : {}),
  }));
  const orale = richiesta.modalita === 'orale';
  const inizio = Date.now();
  const indicazioni = richiesta.istruzioni
    ? `\n\nIndicazioni dello studente su come si comporta il docente all'esame (applicale nel giudizio e nel tono, senza uscire dalla rubrica):\n${richiesta.istruzioni}`
    : '';
  const base = { agente: opz.agente, modello: opz.modello, contenuto: JSON.stringify(contenuto, null, 1) };
  const c = orale
    ? await genera({ ...base, istruzioni: ISTRUZIONI_ORALE(kit.meta.materia) + indicazioni, schema: CorrezioneOraleModello })
    : { ...(await genera({ ...base, istruzioni: ISTRUZIONI(kit.meta.materia) + indicazioni, schema: CorrezioneModello })), esposizione: null };
  opz.log?.(`correzione ${orale ? 'orale' : 'scritta'}: ${c.valutazioni.length} risposte in ${Math.round((Date.now() - inizio) / 1000)} s`);
  return { ...c, agente: `${opz.agente}@${HOST}` };
}
