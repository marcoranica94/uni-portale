import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { controllaOrigine } from '../../../../lib/origine';
import { metricheParlato, type Parola } from '../../../../lib/calcoli';
import { salvaTrascrizione } from '../../../../lib/simulazioni';

export const prerender = false;

const MODELLO = '@cf/openai/whisper-large-v3-turbo';
const MAX_BYTE = 25 * 1024 * 1024;
// Spinge Whisper a trascrivere anche gli intercalari, che altrimenti tende a ripulire.
const PROMPT = 'Ehm, allora... cioè, diciamo che, uhm, lo Stato è un ordinamento giuridico, insomma.';

interface UscitaWhisper {
  text?: string;
  transcription_info?: { duration?: number };
  segments?: { words?: Parola[] }[];
  words?: Parola[];
}

/** Base64 a blocchi (piano B se il modello non accetta il corpo binario). */
function base64(buffer: ArrayBuffer): string {
  const byte = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < byte.length; i += 0x8000) binario += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(binario);
}

const json = (dati: unknown, status = 200) =>
  new Response(JSON.stringify(dati), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

/**
 * Riceve la registrazione di una risposta orale, la trascrive con Whisper (Workers AI),
 * calcola le metriche del parlato e salva SOLO testo e metriche: l'audio resta in memoria e viene scartato.
 */
export const POST: APIRoute = async ({ request, url, locals, params }) => {
  const bloccata = controllaOrigine({ request, url, locals });
  if (bloccata) return bloccata;

  const ordine = Number(url.searchParams.get('ordine'));
  if (!Number.isInteger(ordine) || ordine < 1) return json({ errore: 'Domanda non indicata.' }, 400);
  const tipo = (request.headers.get('Content-Type') ?? '').split(';')[0].trim() || 'audio/webm';
  if (!/^(audio|video)\//.test(tipo)) return json({ errore: 'Formato non audio.' }, 415);
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BYTE) return json({ errore: 'Registrazione troppo lunga.' }, 413);

  const audio = await request.arrayBuffer();
  if (audio.byteLength < 2000) return json({ errore: 'Registrazione vuota o troppo breve.' }, 400);
  if (audio.byteLength > MAX_BYTE) return json({ errore: 'Registrazione troppo lunga.' }, 413);

  const opzioni = { language: 'it', task: 'transcribe', initial_prompt: PROMPT };
  let uscita: UscitaWhisper;
  try {
    // Senza conversione in base64: il modello accetta il corpo binario con il tipo.
    uscita = (await env.AI.run(MODELLO, { audio: { body: new Response(audio).body, contentType: tipo }, ...opzioni })) as UscitaWhisper;
  } catch {
    try {
      uscita = (await env.AI.run(MODELLO, { audio: base64(audio), ...opzioni })) as UscitaWhisper;
    } catch (e) {
      return json({ errore: `Trascrizione non riuscita: ${e instanceof Error ? e.message : String(e)}` }, 502);
    }
  }

  const testo = (uscita.text ?? '').trim();
  const parole = uscita.words ?? (uscita.segments ?? []).flatMap((s) => s.words ?? []);
  const metriche = metricheParlato(parole, uscita.transcription_info?.duration ?? null);
  if (!testo) return json({ errore: 'Non ho sentito parole: riprova avvicinandoti al microfono.' }, 422);

  const salvata = await salvaTrascrizione(String(params.id), ordine, testo, metriche);
  if (!salvata) return json({ errore: 'Simulazione non più modificabile.' }, 409);
  return json({ trascrizione: testo, metriche });
};
