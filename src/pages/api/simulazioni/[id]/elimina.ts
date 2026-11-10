import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../../../lib/origine';
import { env } from 'cloudflare:workers';
import { getMaterie } from '../../../../lib/percorso';
import { eliminaSimulazione } from '../../../../lib/simulazioni';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, locals, params }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const sim = await env.DB.prepare('SELECT codice FROM simulazioni WHERE id = ?').bind(String(params.id)).first<{ codice: string }>();
  if (sim) await eliminaSimulazione(String(params.id));
  const materia = sim ? (await getMaterie()).find((m) => m.codice === sim.codice) : null;
  return new Response(null, { status: 303, headers: { Location: materia ? `/materie/${materia.slug}?esito=simulazione-eliminata#simula` : '/' } });
};
