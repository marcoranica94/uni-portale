import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../../lib/origine';
import { getMaterie } from '../../../lib/percorso';
import { creaSimulazione, riforniscoBersaglio, argomentiKit, FORMATI, type Bersaglio, type Formato, type Modalita } from '../../../lib/simulazioni';

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
  // "Allena": un capitolo degli appunti della materia, oppure un argomento del suo kit.
  const capitolo = String(dati.get('capitolo') ?? '');
  const argomento = String(dati.get('argomento') ?? '');
  let bersaglio: Bersaglio | null = null;
  if (capitolo) {
    if (!materia.appunti?.capitoli.some((c) => c.file === capitolo)) return new Response('Capitolo non valido', { status: 400 });
    bersaglio = { tipo: 'capitolo', valore: capitolo };
  } else if (argomento) {
    if (!(await argomentiKit(codice)).some((a) => a.id === argomento)) return new Response('Argomento non valido', { status: 400 });
    bersaglio = { tipo: 'argomento', valore: argomento };
  }
  const id = await creaSimulazione(codice, formato, modalita, dati.get('dal_vivo') === '1', bersaglio);
  if (!id && bersaglio) {
    // Poche domande sul bersaglio: le chiede all'agente e torna alla scheda, che mostra l'attesa.
    await riforniscoBersaglio(codice, bersaglio);
    return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=in-preparazione&${bersaglio.tipo}=${encodeURIComponent(bersaglio.valore)}#aula` } });
  }
  if (!id) return new Response(null, { status: 303, headers: { Location: `/materie/${materia.slug}?esito=senza-domande#simula` } });
  return new Response(null, { status: 303, headers: { Location: `/simulazioni/${id}` } });
};
