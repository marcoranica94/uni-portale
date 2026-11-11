// Indice di ricerca (Pagefind) degli appunti, dopo astro build.
// Senza appunti (UNI_APPUNTI assente, es. un clone del solo portale) non c'è niente da indicizzare:
// Pagefind fallirebbe, quindi si salta con un avviso e la build resta valida.
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { PROGETTO } from './cartella-appunti.mjs';

const cartella = path.join(PROGETTO, 'dist', 'client', 'appunti');
const voci = await readdir(cartella, { recursive: true }).catch(() => []);

if (!voci.some((nome) => nome.endsWith('.html'))) {
  console.warn('[ricerca] nessun appunto in dist/client/appunti: indice Pagefind saltato.');
} else {
  const esito = spawnSync('pagefind', { cwd: PROGETTO, stdio: 'inherit', shell: true });
  process.exit(esito.status ?? 1);
}
