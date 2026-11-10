/// <reference types="node" />
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSIONE = '0.1.0';

const qui = path.dirname(fileURLToPath(import.meta.url));
/** Cartella piattaforma/ */
export const PROGETTO = path.resolve(qui, '..');
/** Radice del repository (appunti, percorso, ecc.) */
export const REPO = path.resolve(PROGETTO, '..');

export const BASE_URL = process.env.UNI_BASE_URL ?? 'https://uni.marcoranica.com';
export const HOST = os.hostname().split('.')[0];

/** Legge il service token di Access da ~/.config/uni-agent/access.env (mai stampato). */
export function credenziali(): { id: string; secret: string } {
  const file = process.env.UNI_ACCESS_ENV ?? path.join(os.homedir(), '.config', 'uni-agent', 'access.env');
  let testo: string;
  try {
    testo = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`Credenziali non trovate in ${file}: crea il file con CF_ACCESS_CLIENT_ID e CF_ACCESS_CLIENT_SECRET.`);
  }
  const valori = new Map<string, string>();
  for (const riga of testo.split(/\r?\n/)) {
    const m = riga.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) valori.set(m[1], m[2].replace(/^['"]|['"]$/g, ''));
  }
  const id = valori.get('CF_ACCESS_CLIENT_ID');
  const secret = valori.get('CF_ACCESS_CLIENT_SECRET');
  if (!id || !secret) throw new Error(`Nel file ${file} mancano CF_ACCESS_CLIENT_ID o CF_ACCESS_CLIENT_SECRET.`);
  return { id, secret };
}

export interface ConfigMateria {
  slug: string;
  breve?: string;
  appunti?: string;
  pdf?: string;
}

export function configMaterie(): Record<string, ConfigMateria> {
  const dati = JSON.parse(readFileSync(path.join(PROGETTO, 'src', 'data', 'materie.json'), 'utf8')) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(dati).filter(([k]) => !k.startsWith('$'))) as Record<string, ConfigMateria>;
}
