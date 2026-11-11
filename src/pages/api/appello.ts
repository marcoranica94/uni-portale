import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../lib/origine';
import { getMaterie } from '../../lib/percorso';
import { salvaAppello } from '../../lib/simulazioni';
import { leggiGiorniStudio } from '../../lib/calcoli';

export const prerender = false;

/** Data dell'appello e giorni di studio di una materia: base del calendario fino all'appello. "togli" cancella la data. */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const dati = await request.formData().catch(() => new FormData());
  const codice = String(dati.get('codice') ?? '');
  const materia = (await getMaterie()).find((m) => m.codice === codice);
  if (!materia) return new Response('Insegnamento non trovato', { status: 404 });
  const data = String(dati.get('data_appello') ?? '');
  const togli = dati.get('azione') === 'togli';
  if (!togli && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=appello-senza-data#calendario` } });
  const giorni = leggiGiorniStudio(dati.getAll('giorni').map(String).join(','));
  await salvaAppello(codice, togli ? null : data, giorni);
  return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=${togli ? 'appello-tolto' : 'appello-salvato'}#calendario` } });
};
