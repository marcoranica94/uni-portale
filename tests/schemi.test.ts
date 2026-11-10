/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KitModello, DomandeModello, CorrezioneModello, RichiestaPreleva } from '../src/shared/schemi.ts';
import { schemaPerModello } from '../agente/adattatori.ts';

test('schemi per i modelli: rigidi (niente proprietà extra)', () => {
  const extra = { domande: [{ nucleo: 'N01', tipo: 'aperta', testo: 'Q', opzioni: [], corretta: null, spiegazione: '', puntiChiave: ['x'], rispostaModello: 'r', extra: 1 }] };
  assert.equal(DomandeModello.safeParse(extra).success, false);
});

test('KitModello: richiede almeno un nucleo e formato d\'esame valido', () => {
  const kit = { sintesi: 's', formatoEsame: { tipo: 'scritto', descrizione: 'd', numeroDomande: null, durataMinuti: null }, nuclei: [], collegamenti: [] };
  assert.equal(KitModello.safeParse(kit).success, false);
  assert.equal(KitModello.safeParse({ ...kit, formatoEsame: { ...kit.formatoEsame, tipo: 'quiz' } }).success, false);
});

test('CorrezioneModello accetta mezzi punti', () => {
  const c = { valutazioni: [{ ordine: 6, punti: 2.5, coperti: [], mancanti: [], errori: [], commento: 'c' }], giudizio: 'g' };
  assert.equal(CorrezioneModello.safeParse(c).success, true);
});

test('RichiestaPreleva: agente e tipi validi', () => {
  assert.equal(RichiestaPreleva.safeParse({ agente: 'claude', host: 'mac', versione: '0.1.0', tipi: ['kit'] }).success, true);
  assert.equal(RichiestaPreleva.safeParse({ agente: 'gpt', host: 'mac', versione: '0.1.0', tipi: ['kit'] }).success, false);
  assert.equal(RichiestaPreleva.safeParse({ agente: 'claude', host: 'mac', versione: '0.1.0', tipi: [] }).success, false);
});

test('schemaPerModello: JSON Schema senza vincoli che Codex rifiuta', () => {
  const s = JSON.stringify(schemaPerModello(KitModello));
  for (const chiave of ['"minItems"', '"maximum"', '"minimum"', '"$schema"']) assert.equal(s.includes(chiave), false, chiave);
  assert.ok(s.includes('"additionalProperties":false'));
});
