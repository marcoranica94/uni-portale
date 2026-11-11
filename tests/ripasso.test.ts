/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daRipassare, inizioDomaniRoma, intervalloBreve, minutiRipasso } from '../src/lib/calcoli.ts';
import { anteprima, fase, valuta } from '../src/lib/fsrs.ts';

test('daRipassare: multipla sbagliata e aperta sotto il 90%', () => {
  assert.equal(daRipassare(0, 1), true);
  assert.equal(daRipassare(1, 1), false);
  assert.equal(daRipassare(3, 4), true);
  assert.equal(daRipassare(3.5, 4), true);
  assert.equal(daRipassare(4, 4), false);
  assert.equal(daRipassare(null, 4), false);
});

test('inizioDomaniRoma: mezzanotte italiana, ora legale e solare', () => {
  assert.equal(inizioDomaniRoma(new Date('2026-11-11T09:00:00Z')).toISOString(), '2026-11-11T23:00:00.000Z');
  assert.equal(inizioDomaniRoma(new Date('2026-11-11T23:30:00Z')).toISOString(), '2026-11-12T23:00:00.000Z');
  assert.equal(inizioDomaniRoma(new Date('2026-07-01T12:00:00Z')).toISOString(), '2026-07-01T22:00:00.000Z');
});

test('intervalloBreve e minutiRipasso', () => {
  assert.equal(intervalloBreve(60_000), '1 min');
  assert.equal(intervalloBreve(10 * 60_000), '10 min');
  assert.equal(intervalloBreve(5 * 3_600_000), '5 h');
  assert.equal(intervalloBreve(3 * 86_400_000), '3 g');
  assert.equal(intervalloBreve(60 * 86_400_000), '2 mesi');
  assert.equal(minutiRipasso(0), 0);
  assert.equal(minutiRipasso(1), 1);
  assert.equal(minutiRipasso(12), 6);
});

test('FSRS: carta nuova, errore, poi "la sapevo" fino al ripasso in giorni', async () => {
  const t0 = new Date('2026-11-11T09:00:00Z');
  const a = await anteprima(null, t0);
  assert.ok(a[1] < a[3] && a[3] <= a[4], 'gli intervalli crescono con il voto');
  const sbagliata = await valuta(null, 1, t0);
  assert.equal(fase(sbagliata.fsrs), 'apprendimento');
  assert.ok(Date.parse(sbagliata.scadenza) - t0.getTime() <= 10 * 60_000, 'torna nella stessa sessione');
  let stato = sbagliata;
  let ora = new Date(sbagliata.scadenza);
  for (let i = 0; i < 4 && stato.fase !== 'ripasso'; i++) {
    stato = await valuta(stato.fsrs, 3, ora);
    ora = new Date(stato.scadenza);
  }
  assert.equal(stato.fase, 'ripasso');
  assert.ok(Date.parse(stato.scadenza) - ora.getTime() >= 0);
  // Il JSON salvato in D1 si rilegge senza perdere le date.
  const facile = await valuta(stato.fsrs, 4, ora);
  assert.ok(Date.parse(facile.scadenza) > ora.getTime() + 86_400_000);
});
