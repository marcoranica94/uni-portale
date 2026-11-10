// Copia gli appunti di ogni materia (HTML, CSS, PDF, immagini) in public/appunti/<slug>/
// e scrive src/data/appunti.generated.json con l'elenco dei capitoli.
// Gira prima di dev e build: le fonti protette (fonti/, lavorazione/) non vengono mai toccate.
import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { improntaAppunti } from './impronta-appunti.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const progetto = path.resolve(here, '..');
const repo = path.resolve(progetto, '..');
const destinazione = path.join(progetto, 'public', 'appunti');
const uscitaJson = path.join(progetto, 'src', 'data', 'appunti.generated.json');

const ESTENSIONI = new Set(['.html', '.css', '.pdf', '.png', '.jpg', '.jpeg', '.svg', '.webp']);

const config = JSON.parse(await readFile(path.join(progetto, 'src', 'data', 'materie.json'), 'utf8'));

await rm(destinazione, { recursive: true, force: true });
await mkdir(destinazione, { recursive: true });

const risultato = {};

for (const [codice, materia] of Object.entries(config)) {
  if (codice.startsWith('$') || !materia.appunti) continue;
  const origine = path.join(repo, materia.appunti);
  const relativa = path.relative(repo, origine);
  if (relativa.startsWith('..') || /(^|\/)(fonti|lavorazione)(\/|$)/.test(relativa)) {
    throw new Error(`Percorso appunti non consentito per ${codice}: ${materia.appunti}`);
  }

  let file;
  try {
    file = await readdir(origine);
  } catch {
    console.warn(`[appunti] ${codice}: cartella non trovata (${materia.appunti}), salto.`);
    continue;
  }

  const cartella = path.join(destinazione, materia.slug);
  await mkdir(cartella, { recursive: true });
  const capitoli = [];
  let pdf = null;

  for (const nome of file.sort()) {
    if (nome.startsWith('_') || nome.startsWith('.')) continue;
    const estensione = path.extname(nome).toLowerCase();
    if (!ESTENSIONI.has(estensione)) continue;
    const sorgente = path.join(origine, nome);
    if (!(await stat(sorgente)).isFile()) continue;
    await copyFile(sorgente, path.join(cartella, nome));

    if (estensione === '.pdf' && nome === materia.pdf) {
      pdf = { file: nome, bytes: (await stat(sorgente)).size };
    }
    if (estensione === '.html') {
      const html = await readFile(sorgente, 'utf8');
      const titolo = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? nome)
        .replace(/^[^—–-]+[—–-]\s*/, '')
        .trim();
      capitoli.push({ file: nome, titolo });
    }
  }

  risultato[codice] = { slug: materia.slug, capitoli, pdf, impronta: await improntaAppunti(origine) };
  console.log(`[appunti] ${materia.slug}: ${capitoli.length} pagine${pdf ? ', PDF incluso' : ''}`);
}

await writeFile(uscitaJson, JSON.stringify(risultato, null, 2) + '\n');
