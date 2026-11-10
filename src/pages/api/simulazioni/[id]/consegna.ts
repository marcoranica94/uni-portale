import type { APIRoute } from 'astro';
import { consegna } from '../../../../lib/simulazioni';

export const prerender = false;

/** Consegna: campi "r-<ordine>" con la risposta (indice per la multipla, testo per l'aperta). */
export const POST: APIRoute = async ({ request, url, params }) => {
  const origine = request.headers.get('Origin');
  if (origine && origine !== url.origin) return new Response('Origine non consentita', { status: 403 });
  const dati = await request.formData();
  const valori = new Map<number, string>();
  for (const [k, v] of dati.entries()) {
    const m = k.match(/^r-(\d+)$/);
    if (m && typeof v === 'string') valori.set(Number(m[1]), v);
  }
  await consegna(String(params.id), valori);
  return new Response(null, { status: 303, headers: { Location: `/simulazioni/${params.id}` } });
};
