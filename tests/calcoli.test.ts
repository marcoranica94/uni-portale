/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Materia } from '../src/lib/percorso.ts';
import {
  nomeLeggibile,
  testoLeggibile,
  slugDa,
  statoDidattico,
  riepilogo,
  votoTesto,
  formatoMedia,
  dataLeggibile,
  statoMateria,
  votoDa,
  domandaValida,
  type Voto,
} from '../src/lib/calcoli.ts';

const materia = (codice: string, cfu: number, date: string | null = null): Materia =>
  ({ codice, cfu, date, nome: codice, anno: 1 }) as unknown as Materia;
const voto = (codice: string, v: number | null, lode = false): [string, Voto] => [codice, { codice, voto: v, lode, data: '2027-01-20', note: null }];

test('nomeLeggibile: minuscolo, iniziale maiuscola, accenti dal maiuscolo con apostrofo', () => {
  assert.equal(nomeLeggibile('ISTITUZIONI DI DIRITTO PUBBLICO'), 'Istituzioni di diritto pubblico');
  assert.equal(nomeLeggibile("SVILUPPO DEI SISTEMI ECONOMICI E DELLA SOCIETA'"), 'Sviluppo dei sistemi economici e della società');
  assert.equal(nomeLeggibile("SOCIOLOGIA POLITICA E DELL'ORGANIZZAZIONE"), "Sociologia politica e dell'organizzazione");
});

test('testoLeggibile: accenti tipici, ma lascia stare apostrofi e citazioni', () => {
  assert.equal(testoLeggibile("fluidita' e capacita'; Liberta' individuali"), 'fluidità e capacità; Libertà individuali');
  assert.equal(testoLeggibile("piu' chiaro, e' cosi', perche' gia'"), 'più chiaro, è così, perché già');
  assert.equal(testoLeggibile("dell'Unione e l'idea"), "dell'Unione e l'idea");
});

test('slugDa: senza accenti né simboli', () => {
  assert.equal(slugDa("Diritto e regolazione dei mercati"), 'diritto-e-regolazione-dei-mercati');
  assert.equal(slugDa('Società & più'), 'societa-piu');
});

test('statoDidattico: in corso dopo l\'inizio del periodo', () => {
  const m = materia('X', 9, '14/09/2026 - 18/12/2026');
  assert.equal(statoDidattico(m, new Date(2026, 8, 13)), 'da-seguire');
  assert.equal(statoDidattico(m, new Date(2026, 8, 14)), 'in-corso');
  assert.equal(statoDidattico(materia('Y', 6), new Date()), 'da-seguire');
});

test('riepilogo: media ponderata sui CFU, lode = 30, idoneità esclusa dalla media', () => {
  const materie = [materia('A', 9), materia('B', 6), materia('C', 12), materia('D', 3)];
  const voti = new Map([voto('A', 27), voto('B', 30, true), voto('D', null)]);
  const r = riepilogo(materie, voti);
  assert.equal(r.superati, 3);
  assert.equal(r.cfu, 18);
  assert.ok(Math.abs((r.media ?? 0) - (27 * 9 + 30 * 6) / 15) < 1e-9);
  assert.equal(r.baseLaurea, Math.floor(((27 * 9 + 30 * 6) / 15) * 110 / 30 + 0.5));
});

test('riepilogo: nessun voto', () => {
  const r = riepilogo([materia('A', 9)], new Map());
  assert.deepEqual(r, { superati: 0, cfu: 0, media: null, baseLaurea: null });
});

test('base di laurea: 0,5 arrotonda per eccesso', () => {
  // media 25,5 → 93,5 → 94
  const r = riepilogo([materia('A', 6), materia('B', 6)], new Map([voto('A', 25), voto('B', 26)]));
  assert.equal(r.baseLaurea, 94);
});

test('formati di voto, media e data', () => {
  assert.equal(votoTesto(voto('A', 30, true)[1]), '30 e lode');
  assert.equal(votoTesto(voto('A', null)[1]), 'Idoneo');
  assert.equal(formatoMedia(27.456), '27,46');
  assert.equal(formatoMedia(null), '–');
  assert.equal(dataLeggibile('2027-01-20'), '20/01/2027');
});

test('statoMateria: superato se c\'è un voto', () => {
  const m = materia('A', 9, '14/09/2026 - 18/12/2026');
  assert.equal(statoMateria(m, new Map([voto('A', 24)])), 'superato');
});

test('votoDa: percentuale in trentesimi', () => {
  assert.equal(votoDa(5, 9), 17);
  assert.equal(votoDa(9, 9), 30);
  assert.equal(votoDa(0, 0), 0);
});

test('domandaValida: multipla con indice nel range, aperta con rubrica', () => {
  const base = { nucleo: 'N01', testo: 'Q', spiegazione: '', rispostaModello: '', file: 'a.html', pagine: '' };
  assert.equal(domandaValida({ ...base, tipo: 'multipla', opzioni: ['a', 'b', 'c', 'd'], corretta: 2, puntiChiave: [] }), true);
  assert.equal(domandaValida({ ...base, tipo: 'multipla', opzioni: ['a', 'b', 'c', 'd'], corretta: 4, puntiChiave: [] }), false);
  assert.equal(domandaValida({ ...base, tipo: 'multipla', opzioni: ['a', 'b'], corretta: 0, puntiChiave: [] }), false);
  assert.equal(domandaValida({ ...base, tipo: 'aperta', opzioni: [], corretta: null, puntiChiave: ['x'] }), true);
  assert.equal(domandaValida({ ...base, tipo: 'aperta', opzioni: [], corretta: null, puntiChiave: [] }), false);
});

import { metricheParlato } from '../src/lib/calcoli.ts';

test('metricheParlato: ritmo, avvio, pause lunghe e intercalari', () => {
  const p = (word: string, start: number, end: number) => ({ word, start, end });
  const parole = [
    p(' Ehm,', 1.5, 1.9),
    p(' lo', 2.0, 2.1),
    p(' Stato', 2.1, 2.5),
    p(' è,', 2.5, 2.7),
    p(' cioè', 5.2, 5.5), // pausa di 2,5 s
    p(' un', 5.5, 5.6),
    p(' ordinamento', 5.6, 6.3),
    p(' giuridico.', 6.3, 7.5),
  ];
  const m = metricheParlato(parole, 8);
  assert.equal(m.parole, 8);
  assert.equal(m.avvio, 1.5);
  assert.equal(m.pauseLunghe, 1);
  assert.equal(m.pausaMassima, 2.5);
  assert.equal(m.intercalari, 2);
  assert.deepEqual(m.intercalariUsati, { ehm: 1, cioè: 1 });
  assert.equal(m.paroleAlMinuto, 80); // 8 parole in 6 s
  assert.equal(m.durata, 8);
});

test('metricheParlato: nessuna parola', () => {
  const m = metricheParlato([], 3);
  assert.equal(m.parole, 0);
  assert.equal(m.paroleAlMinuto, null);
  assert.equal(m.avvio, null);
});

// ---------- Padronanza ----------
import { capitoliDi, padronanzaCapitoli, statoPadronanza } from '../src/lib/calcoli.ts';

test('capitoliDi separa i nuclei che valgono per più capitoli', () => {
  assert.deepEqual(capitoliDi('09-parlamento.html; 10-parlamento.html'), ['09-parlamento.html', '10-parlamento.html']);
  assert.deepEqual(capitoliDi('02-lo-stato.html'), ['02-lo-stato.html']);
  assert.deepEqual(capitoliDi(''), []);
});

test('statoPadronanza: soglie e prove minime per "solido"', () => {
  assert.equal(statoPadronanza(null, 0), 'mai-provato');
  assert.equal(statoPadronanza(0.5, 4), 'debole');
  assert.equal(statoPadronanza(0.75, 8), 'in-crescita');
  assert.equal(statoPadronanza(1, 4), 'in-crescita'); // una sola aperta perfetta non basta
  assert.equal(statoPadronanza(0.9, 8), 'solido');
});

test('padronanzaCapitoli pesa per punti in palio e conta i capitoli multipli', () => {
  const ora = new Date('2026-11-10T12:00:00Z');
  const p = padronanzaCapitoli(
    [
      { file: 'a.html', punti: 4, massimo: 4, data: '2026-11-10T10:00:00Z' },
      { file: 'a.html', punti: 0, massimo: 1, data: '2026-11-10T10:00:00Z' },
      { file: 'a.html; b.html', punti: 4, massimo: 4, data: '2026-11-09T10:00:00Z' },
    ],
    ora,
  );
  const a = p.get('a.html')!;
  assert.equal(a.risposte, 3);
  assert.equal(a.inPalio, 9);
  assert.ok(a.quota! > 0.88 && a.quota! < 0.9, `quota ${a.quota}`);
  assert.equal(a.stato, 'in-crescita');
  assert.equal(p.get('b.html')!.stato, 'in-crescita');
  assert.equal(p.has('c.html'), false);
});

test('padronanzaCapitoli: le risposte vecchie pesano meno delle recenti', () => {
  const ora = new Date('2026-11-10T12:00:00Z');
  const p = padronanzaCapitoli(
    [
      { file: 'a.html', punti: 0, massimo: 4, data: '2026-09-01T10:00:00Z' },
      { file: 'a.html', punti: 4, massimo: 4, data: '2026-11-10T10:00:00Z' },
      { file: 'a.html', punti: 4, massimo: 4, data: '2026-11-09T10:00:00Z' },
    ],
    ora,
  );
  assert.equal(p.get('a.html')!.stato, 'solido');
});

import { prossimoCapitolo } from '../src/lib/calcoli.ts';

test('prossimoCapitolo: prima il debole, poi il mai provato, poi la crescita, saltando i non pronti', () => {
  const c = (file: string, stato: 'mai-provato' | 'debole' | 'in-crescita' | 'solido', quota: number | null, pronto = true, ultima: string | null = null) => ({
    file,
    stato,
    quota,
    risposte: quota === null ? 0 : 2,
    inPalio: quota === null ? 0 : 8,
    ultima,
    pronto,
  });
  assert.equal(prossimoCapitolo([c('a', 'in-crescita', 0.7), c('b', 'debole', 0.5), c('c', 'debole', 0.3, false)])?.capitolo.file, 'b');
  assert.equal(prossimoCapitolo([c('a', 'in-crescita', 0.7), c('b', 'mai-provato', null), c('d', 'mai-provato', null)])?.capitolo.file, 'b');
  assert.equal(prossimoCapitolo([c('a', 'in-crescita', 0.8), c('b', 'in-crescita', 0.65)])?.motivo, 'in-crescita');
  assert.equal(prossimoCapitolo([c('a', 'solido', 0.95, true, '2026-11-09'), c('b', 'solido', 0.92, true, '2026-11-01')])?.capitolo.file, 'b');
  assert.equal(prossimoCapitolo([c('a', 'debole', 0.2, false)]), null);
});

import { padronanzaArgomenti, maggioranza, postiEmiciclo } from '../src/lib/calcoli.ts';

test('padronanzaArgomenti raggruppa per nucleo del kit', () => {
  const ora = new Date('2026-11-10T12:00:00Z');
  const p = padronanzaArgomenti(
    [
      { file: 'a.html', nucleo: 'N01', punti: 4, massimo: 4, data: '2026-11-10T10:00:00Z' },
      { file: 'a.html', nucleo: 'N01', punti: 4, massimo: 4, data: '2026-11-10T10:00:00Z' },
      { file: 'a.html', nucleo: 'N02', punti: 1, massimo: 4, data: '2026-11-10T10:00:00Z' },
      { file: 'b.html', punti: 1, massimo: 1, data: '2026-11-10T10:00:00Z' },
    ],
    ora,
  );
  assert.equal(p.get('N01')!.stato, 'solido');
  assert.equal(p.get('N02')!.stato, 'debole');
  assert.equal(p.size, 2);
});

test('maggioranza: metà più uno dei seggi', () => {
  assert.deepEqual(maggioranza(71, 21), { soglia: 36, raggiunta: false, mancano: 15 });
  assert.equal(maggioranza(42, 22).raggiunta, true);
  assert.equal(maggioranza(0, 0).raggiunta, false);
});

test('postiEmiciclo: un posto per seggio, tutti sopra il centro, ordinati da sinistra', () => {
  for (const n of [1, 13, 42, 71]) {
    const posti = postiEmiciclo(n, { cx: 170, cy: 170, raggio: 60, passo: 20 });
    assert.equal(posti.length, n);
    assert.ok(posti.every((p) => p.y <= 170.01));
  }
  const p = postiEmiciclo(71, { cx: 170, cy: 170, raggio: 60, passo: 20 });
  assert.ok(p[0].x < 100 && p[70].x > 240);
});
