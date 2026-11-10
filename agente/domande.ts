/// <reference types="node" />
/**
 * Banca di domande: dal kit d'esame (non dagli appunti) genera per ogni nucleo
 * domande a scelta multipla e aperte con rubrica, a blocchi di nuclei.
 */
import { DomandeModello, RichiestaDomande, type DomandaCompleta, type NomeAgente, type RisultatoDomande } from '../src/shared/schemi.ts';
import { genera } from './adattatori.ts';
import { HOST } from './config.ts';
import { leggiKit } from './kit.ts';

const NUCLEI_PER_BLOCCO = 8;

const ISTRUZIONI = (materia: string, formato: string) => `Prepari domande per simulare l'esame scritto di "${materia}". Hai qui sotto alcuni NUCLEI del kit d'esame (in JSON): usa SOLO il loro contenuto.

Per OGNI nucleo produci:
- 2 domande "multipla": 4 opzioni plausibili, una sola giusta ("corretta" = indice da 0); le opzioni sbagliate devono sfruttare gli "erroriTipici" del nucleo o confusioni realistiche, non assurdità; varia la posizione della risposta giusta; "spiegazione" dice perché è giusta e perché le altre no; "puntiChiave" e "rispostaModello" vuoti.
- 1 domanda "aperta" nello stile dell'esame: "puntiChiave" = 3-6 elementi verificabili presi dalla rubrica del nucleo, e SOLO quelli che la domanda chiede esplicitamente (se vuoi valutare un elemento, chiedilo nella domanda; se non lo chiedi, non metterlo nella rubrica); "rispostaModello" = risposta completa ma concisa (6-10 righe); "opzioni" vuoto, "corretta" null, "spiegazione" vuota.

Regole: italiano corretto; niente fatti, date o autori che non siano nel nucleo; ogni domanda indica il proprio "nucleo" (es. "N07"); niente domande su indici, legende o convenzioni grafiche.
Formato dell'esame reale: ${formato}`;

/**
 * Rifornimento della banca: pochi nuclei per volta (di default 6, cioè circa 18 domande),
 * scelti tra quelli con meno domande già in banca. Niente generazione di massa.
 */
export async function generaDomande(
  codice: string,
  richiestaGrezza: unknown,
  opz: { agente: NomeAgente; modello?: string; log?: (m: string) => void },
): Promise<RisultatoDomande> {
  const log = opz.log ?? (() => {});
  const richiesta = RichiestaDomande.parse(richiestaGrezza ?? {});
  const kit = await leggiKit(codice);
  const candidati = kit.nuclei.filter((n) => n.puntiChiave.length > 0);
  const nuclei = candidati
    .map((n) => ({ n, presenti: richiesta.presenti[n.id] ?? 0, caso: Math.random() }))
    .sort((a, b) => a.presenti - b.presenti || a.caso - b.caso)
    .slice(0, richiesta.nuclei)
    .map((x) => x.n);
  const formato = `${kit.formatoEsame.tipo}: ${kit.formatoEsame.descrizione}${
    richiesta.istruzioni ? `\n\nIndicazioni dello studente sull'esame reale (seguile per stile, tipo e difficoltà delle domande, purché restino dentro i nuclei):\n${richiesta.istruzioni}` : ''
  }`;
  const tutte: DomandaCompleta[] = [];

  for (let i = 0; i < nuclei.length; i += NUCLEI_PER_BLOCCO) {
    const blocco = nuclei.slice(i, i + NUCLEI_PER_BLOCCO);
    const inizio = Date.now();
    const r = await genera({
      agente: opz.agente,
      modello: opz.modello,
      istruzioni: ISTRUZIONI(kit.meta.materia, formato),
      contenuto: JSON.stringify(blocco, null, 1),
      schema: DomandeModello,
    });
    for (const d of r.domande) {
      const n = blocco.find((x) => x.id === d.nucleo);
      if (!n) continue; // nucleo inventato: scartata
      tutte.push({ ...d, file: n.file, pagine: n.pagine });
    }
    log(`domande ${kit.meta.materia}: nuclei ${blocco[0].id}-${blocco[blocco.length - 1].id} → ${r.domande.length} domande in ${Math.round((Date.now() - inizio) / 1000)} s`);
  }

  return { lotto: `${new Date().toISOString().slice(0, 16)}-${opz.agente}`, agente: `${opz.agente}@${HOST}`, domande: tutte };
}
