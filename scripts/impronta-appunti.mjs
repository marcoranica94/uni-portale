// Impronta degli appunti di una materia: SHA-256 su nome e contenuto di ogni file .html, in ordine.
// La usano sia la build (per sapere se gli appunti sono cambiati) sia uni-agent (per firmare il kit d'esame):
// deve restare identica nei due punti, quindi vive in un solo file.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/** @param {string} cartella percorso assoluto della cartella appunti/ */
export async function improntaAppunti(cartella) {
  const file = (await readdir(cartella)).filter((n) => n.endsWith('.html') && !n.startsWith('_')).sort();
  const hash = createHash('sha256');
  for (const nome of file) {
    hash.update(nome);
    hash.update('\0');
    hash.update(await readFile(path.join(cartella, nome)));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}
