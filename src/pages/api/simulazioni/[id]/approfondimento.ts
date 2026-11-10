import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../../../lib/origine';
import { chiediApprofondimento, statoApprofondimento } from '../../../../lib/simulazioni';

export const prerender = false;

const json = (dati: unknown, status = 200) =>
  new Response(JSON.stringify(dati), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const ordineDa = (url: URL) => {
  const n = Number(url.searchParams.get('ordine'));
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Orale dal vivo: chiede all'agente una domanda di approfondimento sulla risposta appena trascritta. */
export const POST: APIRoute = async ({ request, url, locals, params }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const ordine = ordineDa(url);
  if (!ordine) return json({ errore: 'Domanda non indicata.' }, 400);
  return json(await chiediApprofondimento(String(params.id), ordine));
};

/** Stato dell'approfondimento: in attesa, pronto (con la domanda), nessuno, errore. */
export const GET: APIRoute = async ({ url, params }) => {
  const ordine = ordineDa(url);
  if (!ordine) return json({ errore: 'Domanda non indicata.' }, 400);
  return json(await statoApprofondimento(String(params.id), ordine));
};
