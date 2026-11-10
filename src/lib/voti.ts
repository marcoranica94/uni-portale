import { env } from 'cloudflare:workers';
import type { Voto } from './calcoli';
export { votoTesto, riepilogo, formatoMedia, dataLeggibile, statoMateria } from './calcoli';
export type { Voto, Riepilogo } from './calcoli';

export async function getVoti(): Promise<Map<string, Voto>> {
  const { results } = await env.DB.prepare('SELECT codice, voto, lode, data, note FROM voti').all<{
    codice: string;
    voto: number | null;
    lode: number;
    data: string;
    note: string | null;
  }>();
  return new Map(results.map((r) => [r.codice, { ...r, lode: r.lode === 1 }]));
}

