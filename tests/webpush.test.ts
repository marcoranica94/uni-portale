/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { b64url, daB64url, richiestaPush } from '../src/lib/webpush.ts';

/** Decifra come farebbe il browser (RFC 8291), per controllare la cifratura. */
type Byte = Uint8Array<ArrayBuffer>;
async function decifraComeBrowser(corpo: Byte, privataUa: CryptoKey, pubblicaUa: Byte, auth: Byte) {
  const sale = corpo.slice(0, 16);
  const idlen = corpo[20];
  const pubblicaAs = corpo.slice(21, 21 + idlen);
  const cifrato = corpo.slice(21 + idlen);
  const hkdf = async (s: Byte, ikm: Byte, info: Byte, n: number) =>
    new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const chiaveAs = await crypto.subtle.importKey('raw', pubblicaAs, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const condiviso = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: chiaveAs }, privataUa, 256));
  const t = new TextEncoder();
  const info = new Uint8Array([...t.encode('WebPush: info\0'), ...pubblicaUa, ...pubblicaAs]);
  const ikm = await hkdf(auth, condiviso, info, 32);
  const cek = await hkdf(sale, ikm, t.encode('Content-Encoding: aes128gcm\0') as Byte, 16);
  const nonce = await hkdf(sale, ikm, t.encode('Content-Encoding: nonce\0') as Byte, 12);
  const chiaro = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cifrato));
  assert.equal(chiaro.at(-1), 2, 'delimitatore di ultimo record');
  return new TextDecoder().decode(chiaro.slice(0, -1));
}

test('Web Push aes128gcm: il browser decifra il messaggio e la firma VAPID è valida', async () => {
  const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const pubblicaUa = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const server = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const privata = (await crypto.subtle.exportKey('jwk', server.privateKey)) as JsonWebKey;
  const pubblicaServer = new Uint8Array(await crypto.subtle.exportKey('raw', server.publicKey));

  const payload = { title: 'Ripasso di oggi', body: 'Sei domande tornano oggi, circa 3 min.', url: '/ripasso', tag: 'promemoria-2026-11-11' };
  const r = await richiestaPush(
    { endpoint: 'https://web.push.apple.com/QAbc123', p256dh: b64url(pubblicaUa), auth: b64url(auth) },
    payload,
    { privata, pubblica: b64url(pubblicaServer) },
    { contatto: 'https://uni.marcoranica.com', ttl: 3600, argomento: 'promemoria-2026-11-11' },
  );
  assert.equal(r.headers['Content-Encoding'], 'aes128gcm');
  assert.equal(r.headers.Topic, 'promemoria-2026-11-11');
  assert.deepEqual(JSON.parse(await decifraComeBrowser(r.body, ua.privateKey, pubblicaUa, auth)), payload);

  // VAPID: JWT ES256 verificabile con la chiave pubblica dichiarata in k=
  const m = r.headers.Authorization.match(/^vapid t=([^,]+), k=(.+)$/)!;
  const [h, c, firma] = m[1].split('.');
  const claims = JSON.parse(new TextDecoder().decode(daB64url(c)));
  assert.equal(claims.aud, 'https://web.push.apple.com');
  assert.equal(claims.sub, 'https://uni.marcoranica.com');
  const chiaveK = await crypto.subtle.importKey('raw', daB64url(m[2]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, chiaveK, daB64url(firma), new TextEncoder().encode(`${h}.${c}`) as Byte));
});
