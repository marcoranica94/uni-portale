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
