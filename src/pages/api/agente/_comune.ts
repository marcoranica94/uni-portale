import type { APIContext } from 'astro';
import type { z } from 'zod';

/** Le API dell'agente accettano solo il service token di Access, non il login di una persona. */
export function soloAgente(ctx: APIContext): Response | null {
  if (!ctx.locals.access?.servizio) return json({ errore: 'Riservato al service token dell\'agente.' }, 403);
  return null;
}

export function json(dati: unknown, status = 200) {
  return new Response(JSON.stringify(dati), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

export async function leggi<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | Response> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ errore: 'Corpo JSON non valido.' }, 400);
  }
  const r = schema.safeParse(corpo);
  if (!r.success) return json({ errore: 'Dati non validi.', dettagli: r.error.issues.slice(0, 5) }, 400);
  return r.data;
}
