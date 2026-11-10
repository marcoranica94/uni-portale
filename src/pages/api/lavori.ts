import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../lib/origine';
import { getMaterie } from '../../lib/percorso';
import { accoda, getKit, ultimoLavoro } from '../../lib/coda';

export const prerender = false;

/** Dal sito: chiede all'agente locale il kit d'esame o la banca di domande di una materia. */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;

  const dati = await request.formData();
  const codice = String(dati.get('codice') ?? '');
  const tipo = String(dati.get('tipo') ?? 'kit') === 'domande' ? 'domande' : 'kit';
  const materia = (await getMaterie()).find((m) => m.codice === codice);
  if (!materia) return new Response('Insegnamento non trovato', { status: 404 });
  const ancora = tipo === 'kit' ? 'kit' : 'simula';
  const torna = (esito: string) =>
    new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=${esito}#${ancora}` } });

  if (!materia.appunti) return torna('senza-appunti');
  if (tipo === 'domande' && !(await getKit(codice))) return torna('senza-kit');
  const ultimo = await ultimoLavoro(tipo, codice);
  if (ultimo && (ultimo.stato === 'in_coda' || ultimo.stato === 'in_corso')) return torna('gia-in-coda');

  await accoda(tipo, codice, tipo === 'kit' ? { impronta: materia.appunti.impronta } : {});
  return torna(tipo === 'kit' ? 'in-coda' : 'domande-in-coda');
};
