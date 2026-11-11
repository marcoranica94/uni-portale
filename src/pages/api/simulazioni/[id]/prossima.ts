import type { APIRoute } from 'astro';
import { statoProssima } from '../../../../lib/simulazioni';

export const prerender = false;

/** Orale dal vivo: a che punto è la domanda indicata (formulata dal docente, in preparazione o di riserva). */
export const GET: APIRoute = async ({ url, params }) => {
  const ordine = Number(url.searchParams.get('ordine'));
  if (!Number.isInteger(ordine) || ordine < 1) return new Response(JSON.stringify({ stato: 'errore', messaggio: 'Domanda non indicata.' }), { status: 400 });
  return new Response(JSON.stringify(await statoProssima(String(params.id), ordine)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
