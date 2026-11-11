import type { APIRoute } from 'astro';
import { z } from 'zod';
import { controllaOrigine } from '../../lib/origine';
import { chiavePubblica, inviaProva, oraDi, salvaIscrizione, togliIscrizione } from '../../lib/notifiche';

export const prerender = false;

const json = (dati: unknown, status = 200) => new Response(JSON.stringify(dati), { status, headers: { 'Content-Type': 'application/json' } });

/** Chiave pubblica VAPID per l'iscrizione e, con ?endpoint=, l'ora del promemoria di quel dispositivo. */
export const GET: APIRoute = async ({ url }) => {
  const endpoint = url.searchParams.get('endpoint');
  return json({ chiave: await chiavePubblica(), ora: endpoint ? await oraDi(endpoint) : null });
};

const Richiesta = z.discriminatedUnion('azione', [
  z.object({
    azione: z.literal('iscrivi'),
    iscrizione: z.object({ endpoint: z.url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }),
    ora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    dispositivo: z.string().max(60).default(''),
  }),
  z.object({ azione: z.literal('togli'), endpoint: z.string().max(1000) }),
  z.object({ azione: z.literal('prova'), endpoint: z.string().max(1000) }),
]);

/** Iscrive il dispositivo (o ne cambia l'ora), lo toglie, o gli manda una notifica di prova. */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;
  const r = Richiesta.safeParse(await request.json().catch(() => null));
  if (!r.success) return json({ errore: 'Richiesta non valida.' }, 400);
  const d = r.data;
  if (d.azione === 'iscrivi') await salvaIscrizione(d.iscrizione, d.ora, d.dispositivo);
  else if (d.azione === 'togli') await togliIscrizione(d.endpoint);
  else {
    const stato = await inviaProva(d.endpoint);
    return json({ ok: stato >= 200 && stato < 300, stato }, stato >= 200 && stato < 300 ? 200 : 502);
  }
  return json({ ok: true });
};
