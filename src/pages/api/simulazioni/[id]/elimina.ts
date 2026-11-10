import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getMaterie } from '../../../../lib/percorso';
import { eliminaSimulazione } from '../../../../lib/simulazioni';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, params }) => {
  const origine = request.headers.get('Origin');
  if (origine && origine !== url.origin) return new Response('Origine non consentita', { status: 403 });
  const sim = await env.DB.prepare('SELECT codice FROM simulazioni WHERE id = ?').bind(String(params.id)).first<{ codice: string }>();
  if (sim) await eliminaSimulazione(String(params.id));
  const materia = sim ? (await getMaterie()).find((m) => m.codice === sim.codice) : null;
  return new Response(null, { status: 303, headers: { Location: materia ? `/materie/${materia.slug}?esito=simulazione-eliminata#simula` : '/' } });
};
