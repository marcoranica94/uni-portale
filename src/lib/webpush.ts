/**
 * Web Push standard (RFC 8291 "aes128gcm" + VAPID RFC 8292) con sola WebCrypto: gira nei Worker e in Node.
 * Nessuna dipendenza da Cloudflare: si prova con node:test (tests/webpush.test.ts).
 */
const testo = new TextEncoder();
/** Byte su un ArrayBuffer vero (quello che WebCrypto accetta). */
type Byte = Uint8Array<ArrayBuffer>;

export const b64url = (dati: ArrayBuffer | Uint8Array) => {
  let s = '';
  for (const b of new Uint8Array(dati)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const daB64url = (s: string): Byte => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

const unisci = (...parti: Uint8Array[]): Byte => {
  const out = new Uint8Array(parti.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parti) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};

/** HKDF-SHA256 (estrazione + espansione) di `byte` byte. */
async function hkdf(sale: Byte, materiale: Byte, info: Byte, byte: number) {
  const chiave = await crypto.subtle.importKey('raw', materiale, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sale, info }, chiave, byte * 8));
}

/** Cifra il messaggio per un'iscrizione (RFC 8291): corpo aes128gcm con intestazione e chiave effimera. */
export async function cifra(messaggio: Byte, p256dh: string, auth: string, sale: Byte = crypto.getRandomValues(new Uint8Array(16))): Promise<Byte> {
  const pubblicaUa = daB64url(p256dh);
  const segreto = daB64url(auth);
  const effimera = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const pubblicaAs = new Uint8Array(await crypto.subtle.exportKey('raw', effimera.publicKey));
  const chiaveUa = await crypto.subtle.importKey('raw', pubblicaUa, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const condiviso = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: chiaveUa }, effimera.privateKey, 256));
  const ikm = await hkdf(segreto, condiviso, unisci(testo.encode('WebPush: info\0'), pubblicaUa, pubblicaAs), 32);
  const cek = await hkdf(sale, ikm, testo.encode('Content-Encoding: aes128gcm\0') as Byte, 16);
  const nonce = await hkdf(sale, ikm, testo.encode('Content-Encoding: nonce\0') as Byte, 12);
  const chiaveAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // Un solo record: messaggio + delimitatore 0x02 (ultimo record), nessun riempimento.
  const cifrato = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, chiaveAes, unisci(messaggio, new Uint8Array([2]))));
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return unisci(sale, rs, new Uint8Array([pubblicaAs.length]), pubblicaAs, cifrato);
}

/** Intestazione Authorization VAPID per l'origine del servizio push (JWT ES256 valido 12 ore). */
export async function vapid(endpoint: string, privata: JsonWebKey, pubblica: string, contatto: string, adesso = Date.now()) {
  const json = (o: unknown) => b64url(testo.encode(JSON.stringify(o)));
  const dati = `${json({ typ: 'JWT', alg: 'ES256' })}.${json({ aud: new URL(endpoint).origin, exp: Math.floor(adesso / 1000) + 12 * 3600, sub: contatto })}`;
  const { d, x, y, kty, crv } = privata;
  const chiave = await crypto.subtle.importKey('jwk', { d, x, y, kty, crv, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chiave, testo.encode(dati) as Byte);
  return `vapid t=${dati}.${b64url(firma)}, k=${pubblica}`;
}

export interface RichiestaPush {
  endpoint: string;
  headers: Record<string, string>;
  body: Byte;
}

/** Richiesta HTTP completa da mandare al servizio push dell'iscrizione. */
export async function richiestaPush(
  iscrizione: { endpoint: string; p256dh: string; auth: string },
  payload: unknown,
  vapidChiavi: { privata: JsonWebKey; pubblica: string },
  opzioni: { contatto: string; ttl: number; urgenza?: 'very-low' | 'low' | 'normal' | 'high'; argomento?: string },
): Promise<RichiestaPush> {
  const body = await cifra(testo.encode(JSON.stringify(payload)) as Byte, iscrizione.p256dh, iscrizione.auth);
  const headers: Record<string, string> = {
    Authorization: await vapid(iscrizione.endpoint, vapidChiavi.privata, vapidChiavi.pubblica, opzioni.contatto),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(opzioni.ttl),
    Urgency: opzioni.urgenza ?? 'normal',
  };
  // Topic: al massimo 32 caratteri dell'alfabeto base64url.
  if (opzioni.argomento) headers.Topic = opzioni.argomento.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  return { endpoint: iscrizione.endpoint, headers, body };
}
