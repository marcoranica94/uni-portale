import type { APIRoute } from 'astro';
import { controllaOrigine } from '../../lib/origine';
import { env } from 'cloudflare:workers';
import { getMaterie } from '../../lib/percorso';

export const prerender = false;

const torna = (esito: string) =>
  new Response(null, { status: 303, headers: { Location: `/libretto?esito=${encodeURIComponent(esito)}` } });

/** Registra, modifica o elimina un voto. Riceve il modulo della pagina Libretto. */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;

  const dati = await request.formData();
  const azione = String(dati.get('azione') ?? 'salva');
  const codice = String(dati.get('codice') ?? '');

  const materie = await getMaterie();
  const materia = materie.find((m) => m.codice === codice);
  if (!materia) return torna('insegnamento-non-valido');

  if (azione === 'elimina') {
    await env.DB.prepare('DELETE FROM voti WHERE codice = ?').bind(codice).run();
    return torna('eliminato');
  }

  const idoneo = dati.get('idoneo') === 'on';
  const voto = idoneo ? null : Number(dati.get('voto'));
  const lode = !idoneo && dati.get('lode') === 'on';
  const data = String(dati.get('data') ?? '');
  const note = String(dati.get('note') ?? '').trim().slice(0, 500) || null;

  if (!idoneo && (!Number.isInteger(voto) || (voto as number) < 18 || (voto as number) > 30)) return torna('voto-non-valido');
  if (lode && voto !== 30) return torna('lode-solo-con-30');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) return torna('data-non-valida');

  await env.DB.prepare(
    `INSERT INTO voti (codice, voto, lode, data, note) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(codice) DO UPDATE SET voto = excluded.voto, lode = excluded.lode, data = excluded.data,
       note = excluded.note, aggiornato = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  )
    .bind(codice, voto, lode ? 1 : 0, data, note)
    .run();

  return torna('salvato');
};
