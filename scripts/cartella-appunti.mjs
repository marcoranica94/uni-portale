// Dove stanno gli appunti: un repository separato (privato) da quello del portale.
// UNI_APPUNTI indica la sua radice; senza variabile si cerca la cartella "unibg" accanto al portale.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Radice del portale (questo repository). */
export const PROGETTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Radice del repository degli appunti. */
export const REPO_APPUNTI = path.resolve(PROGETTO, process.env.UNI_APPUNTI ?? path.join('..', 'unibg'));
