import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { controllaOrigine } from '../../../lib/origine';
import { getMaterie } from '../../../lib/percorso';
import { eliminaSimulazione } from '../../../lib/simulazioni';

export const prerender = false;

/** Elimina dallo storico tutte le simulazioni mai consegnate di una materia. */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const dati = await request.formData().catch(() => new FormData());
  const materia = (await getMaterie()).find((m) => m.codice === String(dati.get('codice') ?? ''));
  if (!materia?.codice) return new Response('Insegnamento non trovato', { status: 404 });
  const { results } = await env.DB.prepare("SELECT id FROM simulazioni WHERE codice = ? AND stato = 'in_corso'").bind(materia.codice).all<{ id: string }>();
  for (const r of results) await eliminaSimulazione(r.id);
  return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=non-finite-eliminate#simula` } });
};
