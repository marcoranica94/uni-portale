/// <reference types="node" />
/**
 * Orale dinamico: il docente formula la prossima domanda partendo dalle indicazioni dello studente
 * e da ciò che ha risposto finora, ancorandola a un nucleo del kit (con la sua rubrica, per la correzione).
 * Deve essere veloce: lo studente aspetta davanti al telefono.
 */
import { ProssimaModello, RichiestaProssima, type NomeAgente, type RisultatoProssima } from '../src/shared/schemi.ts';
import { genera } from './adattatori.ts';
import { HOST } from './config.ts';
import { leggiKit } from './kit.ts';

const ISTRUZIONI = (materia: string, formato: string, ordine: number, totale: number, istruzioni: string) => `Sei il docente di "${materia}" e conduci un'interrogazione orale VERA: le domande non sono decise prima, nascono da come risponde lo studente.
Formato dell'esame: ${formato}
Devi formulare la domanda ${ordine} di ${totale}.

Hai: le indicazioni dello studente su come si svolge l'esame reale, le domande già fatte con le risposte trascritte (ignora gli errori di trascrizione) e il "programma" (nuclei del kit d'esame con la rubrica).

Come scegli la domanda:
- se è la PRIMA domanda, apri come dicono le indicazioni dello studente (per esempio, se l'esame parte da un argomento a scelta o da un libro approfondito, chiedi quale e di presentarlo): in quel caso "nucleo" = "APERTURA"; se le indicazioni non dicono nulla sull'apertura, apri su un nucleo centrale del programma;
- dopo, PARTI DA CIÒ CHE LO STUDENTE HA DETTO: prendi un nome, un fatto, un istituto o un passaggio della sua ultima risposta e collegalo a un nucleo del programma non ancora toccato (es. dal presidente scelto ai suoi poteri, a una crisi di governo, a un rinvio di legge, a un messaggio alle Camere…); se la risposta era debole, puoi tornare sullo stesso tema da un'altra angolatura;
- varia: non ripetere un nucleo già interrogato e copri parti diverse del programma;
- applica le indicazioni dello studente su stile e comportamento del docente.

Forma: una o due frasi, al massimo due richieste, nel registro di un docente che interroga; non suggerire la risposta.
Rubrica: "puntiChiave" = 3-6 elementi presi dalla rubrica del nucleo scelto, SOLO quelli che la domanda chiede; "rispostaModello" = 6-10 righe dal nucleo, senza fatti esterni. Per "APERTURA" la rubrica valuta: scelta dichiarata con chiarezza, contenuti concreti, collegamenti con il programma, lessico tecnico.
${istruzioni ? `\nIndicazioni dello studente sull'esame reale:\n${istruzioni}` : ''}`;

export async function generaProssima(richiestaGrezza: unknown, opz: { agente: NomeAgente; modello?: string; log?: (m: string) => void }): Promise<RisultatoProssima> {
  const r = RichiestaProssima.parse(richiestaGrezza);
  const kit = await leggiKit(r.codice);
  const inizio = Date.now();
  const esito = await genera({
    agente: opz.agente,
    modello: opz.modello,
    istruzioni: ISTRUZIONI(kit.meta.materia, `${kit.formatoEsame.tipo}: ${kit.formatoEsame.descrizione}`, r.ordine, r.totale, r.istruzioni),
    contenuto: JSON.stringify(
      {
        storia: r.storia,
        programma: kit.nuclei.map((n) => ({ id: n.id, titolo: n.titolo, rubrica: n.puntiChiave })),
      },
      null,
      1,
    ),
    schema: ProssimaModello,
  });
  const valido = esito.nucleo === 'APERTURA' || kit.nuclei.some((n) => n.id === esito.nucleo);
  if (!valido) throw new Error(`Nucleo "${esito.nucleo}" non presente nel kit.`);
  opz.log?.(`prossima domanda ${r.ordine}/${r.totale} su ${esito.nucleo} in ${Math.round((Date.now() - inizio) / 1000)} s`);
  return { ...esito, agente: `${opz.agente}@${HOST}` };
}
