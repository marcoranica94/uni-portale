import type { APIRoute } from 'astro';
import { RichiestaCompleta, RisultatoKit, RisultatoDomande, RisultatoCorrezione, RichiestaCorrezione } from '../../../shared/schemi';
import { completa, getLavoro, registraBattito, salvaKit } from '../../../lib/coda';
import { applicaCorrezione, domandaValida, salvaBanca } from '../../../lib/simulazioni';
import { env } from 'cloudflare:workers';
import { soloAgente, leggi, json } from './_comune';

export const prerender = false;

/** L'agente consegna il risultato di un lavoro; il formato dipende dal tipo. */
export const POST: APIRoute = async (ctx) => {
  const negato = soloAgente(ctx);
  if (negato) return negato;
  const dati = await leggi(ctx.request, RichiestaCompleta);
  if (dati instanceof Response) return dati;

  const lavoro = await getLavoro(dati.id);
  if (!lavoro) return json({ errore: 'Lavoro inesistente.' }, 404);
  if (lavoro.stato !== 'in_corso') return json({ errore: `Lavoro nello stato "${lavoro.stato}".` }, 409);
  if (lavoro.agente) await registraBattito(lavoro.agente, 'consegna');
  if (!lavoro.codice) return json({ errore: 'Lavoro senza insegnamento.' }, 400);

  if (lavoro.tipo === 'kit') {
    const r = RisultatoKit.safeParse(dati.risultato);
    if (!r.success) return json({ errore: 'Risultato del kit non valido.', dettagli: r.error.issues.slice(0, 5) }, 400);
    await salvaKit(lavoro.codice, r.data);
    await completa(lavoro.id, r.data);
    return json({ ok: true });
  }

  if (lavoro.tipo === 'domande') {
    const r = RisultatoDomande.safeParse(dati.risultato);
    if (!r.success) return json({ errore: 'Banca di domande non valida.', dettagli: r.error.issues.slice(0, 5) }, 400);
    const valide = r.data.domande.filter(domandaValida);
    if (!valide.length) return json({ errore: 'Nessuna domanda valida.' }, 400);
    await salvaBanca(lavoro.codice, r.data.lotto, valide);
    const riepilogo = { lotto: r.data.lotto, agente: r.data.agente, domande: valide.length, scartate: r.data.domande.length - valide.length };
    await completa(lavoro.id, riepilogo);
    return json({ ok: true, ...riepilogo });
  }

  if (lavoro.tipo === 'correzione') {
    const r = RisultatoCorrezione.safeParse(dati.risultato);
    if (!r.success) return json({ errore: 'Correzione non valida.', dettagli: r.error.issues.slice(0, 5) }, 400);
    const riga = await env.DB.prepare('SELECT richiesta FROM lavori WHERE id = ?').bind(lavoro.id).first<{ richiesta: string }>();
    const richiesta = RichiestaCorrezione.parse(JSON.parse(riga?.richiesta ?? '{}'));
    await applicaCorrezione(richiesta.simulazione, r.data);
    await completa(lavoro.id, { agente: r.data.agente, valutazioni: r.data.valutazioni.length });
    return json({ ok: true });
  }

  return json({ errore: `Tipo di lavoro "${lavoro.tipo}" non gestito.` }, 400);
};
