#!/usr/bin/env node
/// <reference types="node" />
/**
 * uni-agent: l'agente locale del portale uni.marcoranica.com.
 * Preleva i lavori dalla coda del portale, li esegue con claude / codex / agy e consegna i risultati.
 *
 *   node agente/uni-agent.ts watch [--agente claude|codex|agy] [--intervallo 5] [--modello X] [--no-push]
 *   node agente/uni-agent.ts once  [stesse opzioni]       un solo giro di coda
 *   node agente/uni-agent.ts kit <codice|slug> [opzioni]  genera un kit senza passare dalla coda
 *   node agente/uni-agent.ts verifica                     controlla credenziali e collegamento
 */
import { parseArgs } from 'node:util';
import { NomeAgente, type Lavoro, type TipoLavoro } from '../src/shared/schemi.ts';
import { post } from './api.ts';
import { configMaterie, HOST, VERSIONE } from './config.ts';
import { generaKit } from './kit.ts';
import { generaDomande } from './domande.ts';
import { correggi } from './correzione.ts';
import { generaApprofondimento } from './approfondimento.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    agente: { type: 'string', default: 'claude' },
    intervallo: { type: 'string', default: '5' },
    modello: { type: 'string' },
    'no-push': { type: 'boolean', default: false },
  },
});

const comando = positionals[0] ?? 'watch';
const sceltaAgente = NomeAgente.safeParse(values.agente);
if (!sceltaAgente.success) {
  console.error(`uni-agent: agente "${values.agente}" non valido. Usa claude, codex o agy.`);
  process.exit(1);
}
const agente = sceltaAgente.data;
const intervallo = Math.max(3, Number(values.intervallo) || 5) * 1000;
const push = !values['no-push'];
const TIPI: TipoLavoro[] = ['approfondimento', 'correzione', 'kit', 'domande'];
/** Per l'approfondimento conta la velocità: con Claude, se non indicato, si usa il modello veloce. */
const modelloPer = (tipo: TipoLavoro) => values.modello ?? (tipo === 'approfondimento' && agente === 'claude' ? 'haiku' : undefined);

const ora = () => new Date().toLocaleTimeString('it-IT');
const log = (msg: string) => console.log(`[${ora()}] ${msg}`);

async function giro(): Promise<boolean> {
  const { lavoro } = await post<{ lavoro: Lavoro | null }>('/api/agente/preleva', { agente, host: HOST, versione: VERSIONE, tipi: TIPI });
  if (!lavoro) return false;
  log(`lavoro ${lavoro.id.slice(0, 8)} · ${lavoro.tipo} · ${lavoro.codice ?? '-'} (tentativo ${lavoro.tentativi})`);
  // Durante i lavori lunghi il portale deve continuare a vedere l'agente online.
  const battito = setInterval(() => {
    post('/api/agente/battito', { agente, host: HOST, versione: VERSIONE }).catch(() => {});
  }, 60_000);
  try {
    let risultato: unknown = null;
    if (lavoro.tipo === 'kit' && lavoro.codice) {
      risultato = await generaKit(lavoro.codice, { agente, modello: values.modello, push, log });
    } else if (lavoro.tipo === 'domande' && lavoro.codice) {
      risultato = await generaDomande(lavoro.codice, lavoro.richiesta, { agente, modello: values.modello, log });
    } else if (lavoro.tipo === 'approfondimento') {
      risultato = await generaApprofondimento(lavoro.richiesta, { agente, modello: modelloPer('approfondimento'), log });
    } else if (lavoro.tipo === 'correzione') {
      risultato = await correggi(lavoro.richiesta, { agente, modello: values.modello, log });
    }
    if (risultato) {
      await post('/api/agente/completa', { id: lavoro.id, risultato });
      log(`lavoro ${lavoro.id.slice(0, 8)} completato`);
    } else {
      await post('/api/agente/errore', { id: lavoro.id, messaggio: `Tipo "${lavoro.tipo}" non ancora supportato da uni-agent ${VERSIONE}.`, ritenta: false });
    }
  } catch (e) {
    const messaggio = e instanceof Error ? e.message : String(e);
    log(`errore: ${messaggio}`);
    await post('/api/agente/errore', { id: lavoro.id, messaggio: messaggio.slice(0, 2000), ritenta: true }).catch(() => {});
  } finally {
    clearInterval(battito);
  }
  return true;
}

async function main() {
  if (comando === 'verifica') {
    const r = await post<{ agente: string }>('/api/agente/battito', { agente, host: HOST, versione: VERSIONE });
    log(`collegamento ok: il portale vede ${r.agente} online`);
    return;
  }
  if (comando === 'kit') {
    const chiave = positionals[1];
    const materie = configMaterie();
    const codice = Object.keys(materie).find((c) => c === chiave || materie[c].slug === chiave);
    if (!codice) throw new Error(`Materia "${chiave}" non trovata. Codici o slug: ${Object.entries(materie).map(([c, m]) => `${c}/${m.slug}`).join(', ')}`);
    const r = await generaKit(codice, { agente, modello: values.modello, push, log });
    log(`kit pronto: ${r.file} (${r.nuclei} nuclei, impronta ${r.impronta}${r.commit ? `, commit ${r.commit}` : ''})`);
    log('nota: generato fuori dalla coda, il portale lo vedrà solo dopo un kit richiesto dal sito.');
    return;
  }
  if (comando === 'once') {
    if (!(await giro())) log('nessun lavoro in coda');
    return;
  }
  if (comando !== 'watch') throw new Error(`Comando sconosciuto: ${comando}`);

  log(`uni-agent ${VERSIONE} · ${agente}@${HOST} · controllo ogni ${intervallo / 1000} s (Ctrl+C per uscire)`);
  let fermo = false;
  process.on('SIGINT', () => {
    if (fermo) process.exit(130);
    fermo = true;
    log('chiusura dopo il lavoro in corso…');
  });
  while (!fermo) {
    try {
      // Dopo un lavoro riprova subito: potrebbero essercene altri in coda.
      if (await giro()) continue;
    } catch (e) {
      log(`portale non raggiungibile: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, intervallo));
  }
}

main().catch((e) => {
  console.error(`uni-agent: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
