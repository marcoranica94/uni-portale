/// <reference types="node" />
/**
 * Adattatori per i tre agenti installati in locale, usati in modalità non interattiva
 * con output JSON vincolato a uno schema. Nessuna API a consumo: usano gli abbonamenti.
 *
 * - claude: `claude -p <istruzioni> --output-format json --json-schema <schema> --tools ""`, contenuto su stdin
 *           -> campo `structured_output`
 * - agy:    `agy -p <istruzioni+contenuto> --output-format json --json-schema <schema>`
 *           -> campo `structured_output`, `status: "SUCCESS"`
 * - codex:  `codex exec --output-schema <file> -o <file> -`, istruzioni+contenuto su stdin
 *           -> ultimo messaggio nel file di output
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import type { NomeAgente } from '../src/shared/schemi.ts';

const TIMEOUT_MS = 25 * 60_000;

interface Esecuzione {
  stdout: string;
  stderr: string;
  codice: number | null;
}

function esegui(comando: string, argomenti: string[], stdin: string | null, cwd: string): Promise<Esecuzione> {
  return new Promise((risolvi, rifiuta) => {
    const figlio = spawn(comando, argomenti, { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      figlio.kill('SIGTERM');
      rifiuta(new Error(`${comando}: nessuna risposta entro ${TIMEOUT_MS / 60_000} minuti`));
    }, TIMEOUT_MS);
    figlio.stdout.on('data', (d) => (stdout += d));
    figlio.stderr.on('data', (d) => (stderr += d));
    figlio.on('error', (e) => {
      clearTimeout(timer);
      rifiuta(new Error(`Impossibile avviare ${comando}: ${e.message}`));
    });
    figlio.on('close', (codice) => {
      clearTimeout(timer);
      risolvi({ stdout, stderr, codice });
    });
    if (stdin !== null) figlio.stdin.end(stdin);
    else figlio.stdin.end();
  });
}

/** JSON Schema compatibile con tutti e tre: senza vincoli numerici e di lunghezza che Codex rifiuta (li controlla Zod). */
export function schemaPerModello(schema: z.ZodType): Record<string, unknown> {
  const grezzo = z.toJSONSchema(schema) as Record<string, unknown>;
  const ripulisci = (nodo: unknown): unknown => {
    if (Array.isArray(nodo)) return nodo.map(ripulisci);
    if (nodo && typeof nodo === 'object') {
      const fuori: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(nodo)) {
        if (['$schema', 'minItems', 'maxItems', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'format', 'pattern'].includes(k)) continue;
        fuori[k] = ripulisci(v);
      }
      return fuori;
    }
    return nodo;
  };
  return ripulisci(grezzo) as Record<string, unknown>;
}

export interface Richiesta<T extends z.ZodType> {
  agente: NomeAgente;
  istruzioni: string;
  contenuto: string;
  schema: T;
  modello?: string;
}

export async function genera<T extends z.ZodType>(r: Richiesta<T>): Promise<z.infer<T>> {
  const cartella = await mkdtemp(path.join(os.tmpdir(), 'uni-agent-'));
  const schemaJson = JSON.stringify(schemaPerModello(r.schema));
  try {
    let grezzo: unknown;
    if (r.agente === 'claude') {
      const args = ['-p', r.istruzioni, '--output-format', 'json', '--json-schema', schemaJson, '--tools', ''];
      if (r.modello) args.push('--model', r.modello);
      const e = await esegui('claude', args, r.contenuto, cartella);
      const out = analizza(e, 'claude') as { is_error?: boolean; structured_output?: unknown; result?: string };
      if (out.is_error || out.structured_output === undefined) throw new Error(`claude: ${String(out.result ?? 'nessun output strutturato').slice(0, 300)}`);
      grezzo = out.structured_output;
    } else if (r.agente === 'agy') {
      const args = ['-p', `${r.istruzioni}\n\nNon usare strumenti: rispondi solo con il JSON richiesto.\n\n${r.contenuto}`, '--output-format', 'json', '--json-schema', schemaJson, '--print-timeout', '0s'];
      if (r.modello) args.push('--model', r.modello);
      const e = await esegui('agy', args, null, cartella);
      const out = analizza(e, 'agy') as { status?: string; structured_output?: unknown; response?: string };
      if (out.status !== 'SUCCESS' || out.structured_output === undefined) throw new Error(`agy: stato ${out.status ?? '?'} ${String(out.response ?? '').slice(0, 300)}`);
      grezzo = out.structured_output;
    } else {
      const fileSchema = path.join(cartella, 'schema.json');
      const fileUscita = path.join(cartella, 'uscita.json');
      await writeFile(fileSchema, schemaJson);
      const args = ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '--output-schema', fileSchema, '-o', fileUscita];
      if (r.modello) args.push('-m', r.modello);
      args.push('-');
      const e = await esegui('codex', args, `${r.istruzioni}\n\nNon eseguire comandi: rispondi solo con il JSON richiesto.\n\n${r.contenuto}`, cartella);
      if (e.codice !== 0) throw new Error(`codex (uscita ${e.codice}): ${ultimeRighe(e.stderr || e.stdout)}`);
      grezzo = JSON.parse(await readFile(fileUscita, 'utf8'));
    }
    const validato = r.schema.safeParse(grezzo);
    if (!validato.success) {
      throw new Error(`Output non conforme allo schema: ${validato.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    }
    return validato.data;
  } finally {
    await rm(cartella, { recursive: true, force: true });
  }
}

function analizza(e: Esecuzione, nome: string): unknown {
  try {
    return JSON.parse(e.stdout);
  } catch {
    throw new Error(`${nome} (uscita ${e.codice}): output non JSON. ${ultimeRighe(e.stderr || e.stdout)}`);
  }
}

function ultimeRighe(testo: string): string {
  return testo.trim().split('\n').slice(-3).join(' | ').slice(0, 400);
}
