/**
 * Notifiche Web Push (t037): promemoria serale di studio e avviso di correzione pronta.
 * Le chiavi VAPID nascono nel Worker al primo uso (WebCrypto) e restano in D1: nessun segreto da configurare.
 * Cifratura standard aes128gcm e firma VAPID in lib/webpush.ts (solo WebCrypto).
 */
import { env } from 'cloudflare:workers';
import { richiestaPush, b64url, daB64url } from './webpush';
import { giornoRoma, giorniDiStudio, appelliFissati, pianoMateria } from './simulazioni';
import { riepilogoRipasso } from './ripasso';
import { minutiRipasso } from './calcoli';
import { getMaterie } from './percorso';

const CONTATTO = 'https://uni.marcoranica.com';

export interface Iscrizione {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface Messaggio {
  title: string;
  body: string;
  /** Pagina da aprire toccando la notifica. */
  url: string;
  /** Notifiche con lo stesso tag si sostituiscono invece di accumularsi. */
  tag: string;
}

/** Chiavi VAPID: chiave privata (JWK) e pubblica (punto non compresso in base64url, per il browser). */
async function chiavi(): Promise<{ privata: JsonWebKey; pubblica: string }> {
  const r = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave = 'vapid'").first<{ valore: string }>();
  let privata: JsonWebKey;
  if (r) privata = JSON.parse(r.valore);
  else {
    const coppia = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    privata = (await crypto.subtle.exportKey('jwk', coppia.privateKey)) as JsonWebKey;
    // Se due richieste generano insieme, vince la prima: si rilegge quella salvata.
    await env.DB.prepare("INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES ('vapid', ?)").bind(JSON.stringify(privata)).run();
    return chiavi();
  }
  const punto = new Uint8Array(65);
  punto[0] = 4;
  punto.set(daB64url(privata.x!), 1);
  punto.set(daB64url(privata.y!), 33);
  return { privata, pubblica: b64url(punto) };
}

export const chiavePubblica = async () => (await chiavi()).pubblica;

export async function salvaIscrizione(i: Iscrizione, ora: string, dispositivo: string) {
  await env.DB.prepare(
    `INSERT INTO iscrizioni_push (endpoint, p256dh, auth, dispositivo, ora) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, dispositivo = excluded.dispositivo, ora = excluded.ora, errori = 0`,
  )
    .bind(i.endpoint, i.keys.p256dh, i.keys.auth, dispositivo.slice(0, 60), ora)
    .run();
}

export async function togliIscrizione(endpoint: string) {
  await env.DB.prepare('DELETE FROM iscrizioni_push WHERE endpoint = ?').bind(endpoint).run();
}

export async function oraDi(endpoint: string): Promise<string | null> {
  const r = await env.DB.prepare('SELECT ora FROM iscrizioni_push WHERE endpoint = ?').bind(endpoint).first<{ ora: string }>();
  return r?.ora ?? null;
}

interface RigaIscrizione {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Invia a un dispositivo; un'iscrizione scaduta (404/410) si cancella. Restituisce lo stato HTTP del servizio push. */
async function invia(r: RigaIscrizione, m: Messaggio): Promise<number> {
  try {
    const richiesta = await richiestaPush(r, m, await chiavi(), { contatto: CONTATTO, ttl: 12 * 3600, argomento: m.tag });
    const risposta = await fetch(richiesta.endpoint, { method: 'POST', headers: richiesta.headers, body: richiesta.body });
    if (risposta.status === 404 || risposta.status === 410) await togliIscrizione(r.endpoint);
    else if (!risposta.ok) await env.DB.prepare('UPDATE iscrizioni_push SET errori = errori + 1 WHERE endpoint = ?').bind(r.endpoint).run();
    return risposta.status;
  } catch (e) {
    console.error('Notifica non inviata', e);
    return 0;
  }
}

/** Notifica di prova a un solo dispositivo. */
export async function inviaProva(endpoint: string): Promise<number> {
  const r = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM iscrizioni_push WHERE endpoint = ?').bind(endpoint).first<RigaIscrizione>();
  if (!r) return 404;
  return invia(r, { title: 'Promemoria attivi', body: 'Le notifiche arrivano su questo dispositivo.', url: '/', tag: 'prova' });
}

/** Correzione pronta: avviso a tutti i dispositivi che lo vogliono. */
export async function avvisaCorrezione(simulazione: string, materia: string, voto: number | null, orale: boolean) {
  const { results } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM iscrizioni_push WHERE correzioni = 1').all<RigaIscrizione>();
  const m: Messaggio = {
    title: orale ? "L'orale è corretto" : 'La simulazione è corretta',
    body: `${materia}${voto !== null ? `: ${voto}/30` : ''}. Tocca per vedere che cosa ti mancava.`,
    url: `/simulazioni/${simulazione}`,
    tag: `correzione-${simulazione}`,
  };
  await Promise.all(results.map((r) => invia(r, m)));
}

/**
 * Testo del promemoria serale: carte del ripasso e capitolo del calendario della materia con l'appello più vicino.
 * null se non c'è niente da proporre (niente carte, nessun calendario) o se oggi hai già studiato e il ripasso è fatto.
 */
export async function promemoriaDiOggi(adesso = new Date()): Promise<Messaggio | null> {
  const oggi = giornoRoma(adesso);
  const [ripasso, studio, appelli, materie] = await Promise.all([riepilogoRipasso(adesso), giorniDiStudio(), appelliFissati(), getMaterie()]);
  let calendario: string | null = null;
  const prossimo = [...appelli].filter(([, p]) => p.dataAppello && p.dataAppello >= oggi).sort((a, b) => a[1].dataAppello!.localeCompare(b[1].dataAppello!))[0];
  if (prossimo) {
    const m = materie.find((x) => x.codice === prossimo[0]);
    const piano = m ? await pianoMateria(m, prossimo[1]) : null;
    const g = piano?.giorni.find((x) => x.data === oggi);
    const tra = piano ? (piano.mancano <= 1 ? (piano.mancano === 0 ? "l'appello è oggi" : "l'appello è domani") : `appello tra ${piano.mancano} giorni`) : '';
    const titoli = (g?.capitoli ?? []).map((f) => m?.appunti?.capitoli.find((c) => c.file === f)?.titolo ?? f);
    if (titoli.length) calendario = `${m!.breve}, da calendario: ${titoli.join(' e ')} (${tra}).`;
    else if (g?.tipo === 'prova') calendario = `${m!.breve}: oggi prova generale (${tra}).`;
  }
  const carte = ripasso.oggi;
  if (!carte && (!calendario || studio.oggi)) return null;
  const pezzi = [
    carte ? `${carte === 1 ? 'Una domanda sbagliata torna' : `${carte} domande sbagliate tornano`} oggi, circa ${minutiRipasso(carte)} min.` : '',
    studio.oggi ? '' : calendario ?? '',
  ].filter(Boolean);
  return {
    title: carte ? 'Ripasso di oggi' : 'Seduta di oggi',
    body: pezzi.join(' '),
    url: carte ? '/ripasso' : '/',
    tag: `promemoria-${oggi}`,
  };
}

/** Attività pianificata (ogni 15 minuti): manda il promemoria ai dispositivi la cui ora è arrivata e che oggi non l'hanno avuto. */
export async function eseguiPromemoria(adesso = new Date()) {
  const oggi = giornoRoma(adesso);
  const ora = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(adesso);
  const { results } = await env.DB.prepare(
    'SELECT endpoint, p256dh, auth FROM iscrizioni_push WHERE promemoria = 1 AND ora <= ? AND (ultimo_promemoria IS NULL OR ultimo_promemoria < ?)',
  )
    .bind(ora, oggi)
    .all<RigaIscrizione>();
  if (!results.length) return;
  // Segnato prima di inviare: un errore non deve far ripartire il promemoria ogni 15 minuti.
  await env.DB.batch(results.map((r) => env.DB.prepare('UPDATE iscrizioni_push SET ultimo_promemoria = ? WHERE endpoint = ?').bind(oggi, r.endpoint)));
  const m = await promemoriaDiOggi(adesso);
  if (!m) return;
  await Promise.all(results.map((r) => invia(r, m)));
}
