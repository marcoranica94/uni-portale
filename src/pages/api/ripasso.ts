import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../lib/origine';
import { archiviaCarta, registraRipasso } from '../../lib/ripasso';
import type { Voto } from '../../lib/fsrs';

export const prerender = false;

/** Voto su una carta del ripasso ("voto" 1-4) o "togli" per toglierla; poi la carta successiva. */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const dati = await request.formData();
  const carta = String(dati.get('carta') ?? '');
  const materia = String(dati.get('materia') ?? '');
  const voto = Number(dati.get('voto'));
  if (!carta) return new Response('Richiesta non valida', { status: 400 });
  if (dati.get('azione') === 'togli') await archiviaCarta(carta);
  else if ([1, 2, 3, 4].includes(voto)) await registraRipasso(carta, voto as Voto, String(dati.get('scadenza') ?? ''));
  else return new Response('Voto non valido', { status: 400 });
  return new Response(null, { status: 303, headers: { Location: materia ? `/ripasso?materia=${encodeURIComponent(materia)}` : '/ripasso' } });
};
