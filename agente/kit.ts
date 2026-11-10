/// <reference types="node" />
/**
 * Kit d'esame: legge una volta gli appunti di una materia e produce un file compatto
 * (nuclei, concetti, autori, nessi, rubrica, errori tipici, domande tipo) da cui
 * nasceranno domande e correzioni. Scrive <corso>/esame/kit-esame.json e .md e li committa.
 */
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { parse } from 'yaml';
import { KitModello, type NomeAgente, type RisultatoKit } from '../src/shared/schemi.ts';
import { improntaAppunti } from '../scripts/impronta-appunti.mjs';
import { genera } from './adattatori.ts';
import { configMaterie, HOST, REPO } from './config.ts';

const exec = promisify(execFile);

/** Testo leggibile da una pagina di appunti HTML: niente stili, script e commenti di lavorazione. */
function testoDaHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|li|h[1-6]|tr|div|section|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

interface InfoEsame {
  nome: string;
  tipo: string | null;
  dettagli: string | null;
  programma: string[];
}

async function infoDalPiano(codice: string): Promise<InfoEsame> {
  const piano = parse(await readFile(path.join(REPO, 'percorso', 'piano-di-studi.yaml'), 'utf8')) as {
    insegnamenti: { codice: string | null; nome: string; esame?: { tipo?: string | null; dettagli?: string | null }; programma?: string[] | null }[];
  };
  const voce = piano.insegnamenti.find((i) => i.codice === codice);
  if (!voce) throw new Error(`Insegnamento ${codice} non presente nel piano di studi.`);
  return { nome: voce.nome, tipo: voce.esame?.tipo ?? null, dettagli: voce.esame?.dettagli ?? null, programma: voce.programma ?? [] };
}

const ISTRUZIONI = (info: InfoEsame) => `Sei l'assistente di studio di uno studente di Scienze politiche (UniBg). Prepara il KIT D'ESAME dell'insegnamento "${info.nome}" usando ESCLUSIVAMENTE gli appunti forniti qui sotto.

Il kit servirà a un altro agente per generare domande d'esame e correggere risposte senza rileggere tutti gli appunti: deve essere completo sui contenuti d'esame e compatto nella forma.

Regole:
- Usa solo ciò che è scritto negli appunti. Non inventare fatti, date, autori, citazioni o numeri di pagina.
- Scrivi in italiano corretto; mantieni i termini tecnici degli appunti.
- Organizza in NUCLEI: un nucleo per argomento d'esame (di solito uno per pagina/sezione degli appunti; unisci o dividi se serve). Numerali N01, N02, ...
- Per ogni nucleo indica il file degli appunti (es. "02-lo-stato.html") e le pagine ("Pagina 3-4") come compaiono nel testo; stringa vuota se assenti.
- "puntiChiave" è la rubrica di correzione: gli elementi che una risposta completa deve contenere, ciascuno verificabile.
- "erroriTipici": confusioni plausibili tra concetti vicini, attribuzioni sbagliate, eccezioni dimenticate.
- "domandeTipo": 2-4 domande nello stile dell'esame reale descritto sotto.
- Ignora indici, legende e pagine di servizio come nuclei, ma usale per capire le convenzioni.

Esame reale (dal piano di studi): tipo: ${info.tipo ?? 'non indicato'}. ${info.dettagli ?? ''}
Programma ufficiale: ${info.programma.join('; ') || 'non indicato'}.`;

export interface OpzioniKit {
  agente: NomeAgente;
  modello?: string;
  push: boolean;
  log?: (msg: string) => void;
}

export async function generaKit(codice: string, opz: OpzioniKit): Promise<RisultatoKit> {
  const log = opz.log ?? (() => {});
  const materia = configMaterie()[codice];
  if (!materia?.appunti) throw new Error(`Nessuna cartella di appunti configurata per ${codice}.`);
  const cartella = path.join(REPO, materia.appunti);
  const corso = path.dirname(cartella);

  const file = (await readdir(cartella)).filter((n) => n.endsWith('.html') && !n.startsWith('_')).sort();
  const parti: string[] = [];
  for (const nome of file) {
    const html = await readFile(path.join(cartella, nome), 'utf8');
    const titolo = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? nome;
    parti.push(`===== FILE ${nome} — ${titolo} =====\n${testoDaHtml(html)}`);
  }
  const contenuto = `APPUNTI (${file.length} file)\n\n${parti.join('\n\n')}`;
  const info = await infoDalPiano(codice);
  log(`kit ${materia.slug}: ${file.length} file, ${Math.round(contenuto.length / 1000)}k caratteri → ${opz.agente}`);

  const inizio = Date.now();
  const kit = await genera({ agente: opz.agente, istruzioni: ISTRUZIONI(info), contenuto, schema: KitModello, modello: opz.modello });
  log(`kit ${materia.slug}: ${kit.nuclei.length} nuclei in ${Math.round((Date.now() - inizio) / 1000)} s`);

  const impronta = await improntaAppunti(cartella);
  const generato = new Date().toISOString();
  const agente = `${opz.agente}@${HOST}`;
  const meta = { codice, materia: materia.breve ?? materia.slug, impronta, generato, agente, appunti: materia.appunti };

  const cartellaEsame = path.join(corso, 'esame');
  await mkdir(cartellaEsame, { recursive: true });
  const fileJson = path.join(cartellaEsame, 'kit-esame.json');
  const fileMd = path.join(cartellaEsame, 'kit-esame.md');
  await writeFile(fileJson, JSON.stringify({ meta, ...kit }, null, 2) + '\n');
  await writeFile(fileMd, kitMarkdown(meta, kit));

  let commit: string | null = null;
  const relativi = [path.relative(REPO, fileJson), path.relative(REPO, fileMd)];
  await exec('git', ['add', '--', ...relativi], { cwd: REPO });
  const { stdout: diff } = await exec('git', ['diff', '--cached', '--name-only', '--', ...relativi], { cwd: REPO });
  if (diff.trim()) {
    await exec('git', ['commit', '-m', `Kit d'esame ${meta.materia}: ${kit.nuclei.length} nuclei (${opz.agente})`, '--', ...relativi], { cwd: REPO });
    commit = (await exec('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO })).stdout.trim();
    log(`kit ${materia.slug}: commit ${commit}`);
    if (opz.push) {
      try {
        await exec('git', ['push', '-q', 'origin', 'HEAD'], { cwd: REPO });
      } catch {
        await exec('git', ['pull', '--rebase', '--autostash', '-q', 'origin', 'main'], { cwd: REPO });
        await exec('git', ['push', '-q', 'origin', 'HEAD'], { cwd: REPO });
      }
      log(`kit ${materia.slug}: push eseguito`);
    }
  } else {
    log(`kit ${materia.slug}: nessuna differenza rispetto al kit già committato`);
  }

  return { impronta, nuclei: kit.nuclei.length, commit, generato, agente, file: relativi[0] };
}

function kitMarkdown(meta: { materia: string; codice: string; impronta: string; generato: string; agente: string; appunti: string }, kit: KitModello): string {
  const r: string[] = [];
  r.push(`# Kit d'esame — ${meta.materia}`, '');
  r.push(`<!-- Generato da uni-agent il ${meta.generato} con ${meta.agente}. Impronta appunti: ${meta.impronta}. Non modificare a mano: rigenera dal portale. -->`, '');
  r.push(`Fonte: \`${meta.appunti}\` · codice ${meta.codice}`, '');
  r.push('## Sintesi', '', kit.sintesi, '');
  const f = kit.formatoEsame;
  r.push('## Formato dell\'esame', '', `**${f.tipo}**${f.numeroDomande ? ` · ${f.numeroDomande} domande` : ''}${f.durataMinuti ? ` · ${f.durataMinuti} minuti` : ''}`, '', f.descrizione, '');
  for (const n of kit.nuclei) {
    r.push(`## ${n.id} · ${n.titolo}`, '', `Appunti: \`${n.file}\`${n.pagine ? ` · ${n.pagine}` : ''}`, '');
    if (n.concetti.length) r.push('**Concetti**', '', ...n.concetti.map((c) => `- **${c.termine}**: ${c.definizione}`), '');
    if (n.autoriTesi.length) r.push('**Autori e tesi**', '', ...n.autoriTesi.map((a) => `- **${a.autore}**: ${a.tesi}`), '');
    if (n.nessi.length) r.push('**Nessi**', '', ...n.nessi.map((x) => `- ${x}`), '');
    if (n.date.length) r.push('**Date**', '', ...n.date.map((x) => `- ${x}`), '');
    r.push('**Punti chiave (rubrica)**', '', ...n.puntiChiave.map((x) => `- [ ] ${x}`), '');
    if (n.erroriTipici.length) r.push('**Errori tipici**', '', ...n.erroriTipici.map((x) => `- ${x}`), '');
    if (n.domandeTipo.length) r.push('**Domande tipo**', '', ...n.domandeTipo.map((x) => `- ${x}`), '');
  }
  if (kit.collegamenti.length) r.push('## Collegamenti tra capitoli', '', ...kit.collegamenti.map((x) => `- ${x}`), '');
  return r.join('\n');
}
