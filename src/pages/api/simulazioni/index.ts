import type { APIRoute } from 'astro';
import { getMaterie } from '../../../lib/percorso';
import { creaSimulazione, FORMATI, type Formato } from '../../../lib/simulazioni';

export const prerender = false;

/** Avvio con un tocco: crea la simulazione e porta subito alla prima domanda. */
export const POST: APIRoute = async ({ request, url }) => {
  const origine = request.headers.get('Origin');
  if (origine && origine !== url.origin) return new Response('Origine non consentita', { status: 403 });
  const dati = await request.formData();
  const codice = String(dati.get('codice') ?? '');
  const formato = String(dati.get('formato') ?? 'breve') as Formato;
  const materia = (await getMaterie()).find((m) => m.codice === codice);
  if (!materia || !(formato in FORMATI)) return new Response('Richiesta non valida', { status: 400 });
  const id = await creaSimulazione(codice, formato);
  if (!id) return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=senza-domande#simula` } });
  return new Response(null, { status: 303, headers: { Location: `/simulazioni/${id}` } });
};
