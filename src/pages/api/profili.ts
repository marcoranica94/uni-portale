import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../lib/origine';
import { getMaterie } from '../../lib/percorso';
import { salvaProfilo } from '../../lib/simulazioni';

export const prerender = false;

const intero = (v: FormDataEntryValue | null, min: number, max: number, base: number) => {
  const n = Number(v);
  return Number.isInteger(n) ? Math.max(min, Math.min(max, n)) : base;
};

/** Salva le istruzioni d'esame di una materia (testo libero, prima domanda fissa dell'orale, numero di domande). */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const dati = await request.formData().catch(() => new FormData());
  const codice = String(dati.get('codice') ?? '');
  const materia = (await getMaterie()).find((m) => m.codice === codice);
  if (!materia) return new Response('Insegnamento non trovato', { status: 404 });
  await salvaProfilo(codice, {
    istruzioni: String(dati.get('istruzioni') ?? '').trim(),
    domandeOrale: intero(dati.get('domande_orale'), 1, 8, 3),
    multipleScritto: intero(dati.get('multiple_scritto'), 0, 30, 10),
    aperteScritto: intero(dati.get('aperte_scritto'), 0, 8, 3),
    domandaApertura: String(dati.get('domanda_apertura') ?? ''),
  });
  return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=profilo-salvato#istruzioni` } });
};
