import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../../lib/origine';
import { getMaterie } from '../../../lib/percorso';
import { creaSimulazione, FORMATI, type Formato } from '../../../lib/simulazioni';

export const prerender = false;

/** Avvio con un tocco: crea la simulazione e porta subito alla prima domanda. */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const dati = await request.formData();
  const codice = String(dati.get('codice') ?? '');
  const formato = String(dati.get('formato') ?? 'breve') as Formato;
  const materia = (await getMaterie()).find((m) => m.codice === codice);
  if (!materia || !(formato in FORMATI)) return new Response('Richiesta non valida', { status: 400 });
  const id = await creaSimulazione(codice, formato);
  if (!id) return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=senza-domande#simula` } });
  return new Response(null, { status: 303, headers: { Location: `/simulazioni/${id}` } });
};
