import type { APIRoute } from 'astro';
import { getMaterie } from '../../lib/percorso';
import { accoda, ultimoLavoro } from '../../lib/coda';

export const prerender = false;

/** Dal sito: chiede all'agente locale di preparare il kit d'esame di una materia. */
export const POST: APIRoute = async ({ request, url }) => {
  const origine = request.headers.get('Origin');
  if (origine && origine !== url.origin) return new Response('Origine non consentita', { status: 403 });

  const dati = await request.formData();
  const codice = String(dati.get('codice') ?? '');
  const materia = (await getMaterie()).find((m) => m.codice === codice);
  if (!materia) return new Response('Insegnamento non trovato', { status: 404 });
  const torna = (esito: string) =>
    new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=${esito}#kit` } });

  if (!materia.appunti) return torna('senza-appunti');
  const ultimo = await ultimoLavoro('kit', codice);
  if (ultimo && (ultimo.stato === 'in_coda' || ultimo.stato === 'in_corso')) return torna('gia-in-coda');

  await accoda('kit', codice, { impronta: materia.appunti.impronta });
  return torna('in-coda');
};
