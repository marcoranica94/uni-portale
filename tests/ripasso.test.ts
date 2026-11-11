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

import { pianoARitroso, giornoSettimana, piuGiorni, leggiGiorniStudio } from '../src/lib/calcoli.ts';

test('date: giorno della settimana, somma di giorni, giorni di studio', () => {
  assert.equal(giornoSettimana('2026-11-11'), 3); // mercoledì
  assert.equal(giornoSettimana('2026-11-15'), 7); // domenica
  assert.equal(piuGiorni('2026-12-30', 3), '2027-01-02');
  assert.deepEqual(leggiGiorniStudio('6, 1,9,1,x'), [1, 6]);
});

test('pianoARitroso: capitoli in ordine sui giorni di studio, prove generali in fondo', () => {
  const caps = [
    { file: 'a', peso: 2, solido: false },
    { file: 'b', peso: 2, solido: true },
    { file: 'c', peso: 4, solido: false },
    { file: 'd', peso: 2, solido: false },
  ];
  // Da mercoledì 11/11 a lunedì 30/11, studio lun-mer-sab.
  const p = pianoARitroso('2026-11-11', '2026-11-30', [1, 3, 6], caps);
  assert.equal(p.stato, 'ok');
  assert.equal(p.mancano, 19);
  assert.equal(p.giorni.at(-1)!.tipo, 'appello');
  const studio = p.giorni.filter((g) => g.tipo === 'studio' || g.tipo === 'prova');
  assert.equal(studio.length, p.giorniStudio);
  assert.ok(p.giorni.every((g) => g.tipo === 'appello' || g.tipo === 'libero' || [1, 3, 6].includes(giornoSettimana(g.data))));
  assert.deepEqual(p.solidi, ['b']);
  // Ogni capitolo rimasto compare, in ordine, e mai nelle prove generali.
  const sequenza = p.giorni.flatMap((g) => g.capitoli).filter((c, i, arr) => arr[i - 1] !== c);
  assert.deepEqual(sequenza, ['a', 'c', 'd']);
  assert.ok(p.prove >= 1);
  assert.ok(p.giorni.filter((g) => g.tipo === 'prova').every((g) => g.capitoli.length === 0));
  // Il capitolo più pesante occupa almeno tanti giorni quanto gli altri.
  const giorniDi = (f: string) => p.giorni.filter((g) => g.capitoli.includes(f)).length;
  assert.ok(giorniDi('c') >= giorniDi('a'));
});

test('pianoARitroso: stretto, passato, senza giorni, tutto solido', () => {
  const tanti = Array.from({ length: 10 }, (_, i) => ({ file: `c${i}`, peso: 1, solido: false }));
  assert.equal(pianoARitroso('2026-11-11', '2026-11-16', [1, 2, 3, 4, 5, 6, 7], tanti).stato, 'stretto');
  assert.equal(pianoARitroso('2026-11-11', '2026-11-01', [1], tanti).stato, 'passato');
  assert.equal(pianoARitroso('2026-11-11', '2026-11-14', [7], tanti).stato, 'senza-giorni');
  const fatti = pianoARitroso('2026-11-11', '2026-11-20', [1, 2, 3, 4, 5], [{ file: 'x', peso: 3, solido: true }]);
  assert.equal(fatti.rimasti.length, 0);
  assert.ok(fatti.giorni.filter((g) => g.tipo === 'prova').length === fatti.giorniStudio);
});

import { gruppiLaurea } from '../src/lib/calcoli.ts';

test('gruppiLaurea: superati per data, poi in corso, poi futuri; una sola scelta vincolata', () => {
  const m = (codice: string, cfu: number, date: string | null, vincolata = false) =>
    ({ codice, slug: codice, nome: codice, breve: codice, cfu, colore: 1, date, sceltaVincolata: vincolata }) as never;
  const materie = [m('A', 9, '14/09/2026 - 18/12/2026'), m('B', 6, null), m('C', 12, '14/09/2026 - 18/12/2026'), m('V1', 6, null, true), m('V2', 6, null, true), m('D', 9, null)];
  const voti = new Map([
    ['C', { codice: 'C', voto: 28, lode: false, data: '2027-01-10', note: null }],
    ['D', { codice: 'D', voto: 25, lode: false, data: '2026-12-20', note: null }],
    ['V2', { codice: 'V2', voto: 30, lode: true, data: '2027-02-01', note: null }],
  ]);
  const g = gruppiLaurea(materie, voti, new Date('2026-11-11T10:00:00Z'));
  assert.deepEqual(g.map((x) => `${x.slug}:${x.stato}`), ['D:superato', 'C:superato', 'V2:superato', 'A:in-corso', 'B:da-seguire']);
  const senzaVoti = gruppiLaurea(materie, new Map(), new Date('2026-11-11T10:00:00Z'));
  assert.ok(senzaVoti.some((x) => x.slug === 'V1') && !senzaVoti.some((x) => x.slug === 'V2'));
});
