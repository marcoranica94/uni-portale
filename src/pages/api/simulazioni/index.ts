import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../../lib/origine';
import { getMaterie } from '../../../lib/percorso';
import { creaSimulazione, riforniscoCapitolo, FORMATI, type Formato, type Modalita } from '../../../lib/simulazioni';

export const prerender = false;

/** Avvio con un tocco: crea la simulazione e porta subito alla prima domanda. */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const dati = await request.formData();
  const codice = String(dati.get('codice') ?? '');
  const formato = String(dati.get('formato') ?? 'breve') as Formato;
  const modalita: Modalita = dati.get('modalita') === 'orale' ? 'orale' : 'scritto';
  const materia = (await getMaterie()).find((m) => m.codice === codice);
  if (!materia || !(formato in FORMATI)) return new Response('Richiesta non valida', { status: 400 });
  // "Allena solo questo": il capitolo deve essere uno degli appunti della materia.
  const richiesto = String(dati.get('capitolo') ?? '');
  const capitolo = richiesto && materia.appunti?.capitoli.some((c) => c.file === richiesto) ? richiesto : null;
  if (richiesto && !capitolo) return new Response('Capitolo non valido', { status: 400 });
  const id = await creaSimulazione(codice, formato, modalita, dati.get('dal_vivo') === '1', capitolo);
  if (!id && capitolo) {
    // Poche domande su questo capitolo: le chiede all'agente e torna alla scheda, che mostra l'attesa.
    await riforniscoCapitolo(codice, capitolo);
    return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=capitolo-in-preparazione&capitolo=${encodeURIComponent(capitolo)}#padronanza` } });
  }
  if (!id) return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=senza-domande#simula` } });
  return new Response(null, { status: 303, headers: { Location: `/simulazioni/${id}` } });
};
