import type { APIContext } from 'astro';

/**
 * Protezione CSRF per le POST dei form.
 * - Browser: Sec-Fetch-Site deve essere same-origin (o none: digitato dall'utente);
 *   se c'è Origin deve coincidere con il sito.
 * - Client senza intestazioni da browser (curl, script): ammessi solo con il service token di Access.
 */
export function controllaOrigine(ctx: Pick<APIContext, 'request' | 'url' | 'locals'>): Response | null {
  const sito = ctx.request.headers.get('Sec-Fetch-Site');
  const origine = ctx.request.headers.get('Origin');
  const negato = (motivo: string) => new Response(`Richiesta non consentita: ${motivo}.`, { status: 403 });
  if (sito && sito !== 'same-origin' && sito !== 'none') return negato('proviene da un altro sito');
  if (origine && origine !== ctx.url.origin) return negato('origine diversa');
  if (!sito && !origine && !ctx.locals.access?.servizio) return negato('origine sconosciuta');
  return null;
}
