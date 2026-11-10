/// <reference types="node" />
/**
 * Orale dal vivo: dopo una risposta, decide se fare UNA domanda di approfondimento, come un docente.
 * Deve essere veloce: lo studente aspetta davanti al telefono.
 */
import { ApprofondimentoModello, RichiestaApprofondimento, type NomeAgente, type RisultatoApprofondimento } from '../src/shared/schemi.ts';
import { genera } from './adattatori.ts';
import { HOST } from './config.ts';
import { leggiKit } from './kit.ts';

const ISTRUZIONI = (materia: string, istruzioni: string) => `Sei il docente di "${materia}" e stai interrogando uno studente all'orale.
Hai la domanda, la rubrica (punti chiave), il nucleo del kit d'esame e la trascrizione automatica della risposta (ignora gli errori di trascrizione).

Decidi se fare UNA domanda di approfondimento, come farebbe un docente vero:
- falla se manca un punto chiave importante, se c'è un'imprecisione da far correggere, o per chiedere un collegamento o un esempio;
- deve essere breve (una frase), diretta, nel registro di un'interrogazione, senza suggerire la risposta;
- resta dentro il nucleo del kit: niente argomenti esterni;
- se la risposta è completa e corretta, "serve" = false e "domanda" vuota.${istruzioni ? `\n\nIndicazioni dello studente su come si comporta il docente all'esame:\n${istruzioni}` : ''}`;

export async function generaApprofondimento(
  richiestaGrezza: unknown,
  opz: { agente: NomeAgente; modello?: string; log?: (m: string) => void },
): Promise<RisultatoApprofondimento> {
  const r = RichiestaApprofondimento.parse(richiestaGrezza);
  const kit = await leggiKit(r.codice);
  const inizio = Date.now();
  const esito = await genera({
    agente: opz.agente,
    modello: opz.modello,
    istruzioni: ISTRUZIONI(kit.meta.materia, r.istruzioni),
    contenuto: JSON.stringify(
      { domanda: r.domanda, puntiChiave: r.puntiChiave, rispostaModello: r.rispostaModello, nucleo: kit.nuclei.find((n) => n.id === r.nucleo) ?? null, risposta: r.risposta },
      null,
      1,
    ),
    schema: ApprofondimentoModello,
  });
  opz.log?.(`approfondimento: ${esito.serve ? 'sì' : 'no'} in ${Math.round((Date.now() - inizio) / 1000)} s`);
  return { ...esito, agente: `${opz.agente}@${HOST}` };
}
