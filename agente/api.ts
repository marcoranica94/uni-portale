/// <reference types="node" />
import { BASE_URL, credenziali } from './config.ts';

/** POST JSON verso il portale, passando da Cloudflare Access con il service token. */
export async function post<T>(percorso: string, corpo: unknown): Promise<T> {
  const { id, secret } = credenziali();
  const risposta = await fetch(BASE_URL + percorso, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'CF-Access-Client-Id': id,
      'CF-Access-Client-Secret': secret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  });
  if (risposta.status >= 300 && risposta.status < 400) {
    throw new Error('Cloudflare Access ha rifiutato il service token (controlla la policy "Agente locale" e le credenziali).');
  }
  const testo = await risposta.text();
  let dati: unknown;
  try {
    dati = JSON.parse(testo);
  } catch {
    throw new Error(`Risposta non JSON dal portale (${risposta.status}): ${testo.slice(0, 200)}`);
  }
  if (!risposta.ok) {
    const errore = (dati as { errore?: string }).errore ?? testo.slice(0, 200);
    throw new Error(`Portale ${risposta.status}: ${errore}`);
  }
  return dati as T;
}
