import test from 'node:test'
import assert from 'node:assert/strict'
import { obterDataSugerida, obterLocalSugerido } from '../src/utils/sugestoesPartida.js'

test('sugere a próxima sexta-feira no fuso de Brasília', function () {
  const agora = new Date('2026-09-21T15:00:00Z')
  assert.equal(obterDataSugerida(5, '20:00:00', agora), '2026-09-25')
})

test('sugere hoje se o horário habitual ainda não passou', function () {
  const agora = new Date('2026-09-25T22:00:00Z')
  assert.equal(obterDataSugerida(5, '20:00:00', agora), '2026-09-25')
})

test('sugere a próxima semana se o horário habitual passou', function () {
  const agora = new Date('2026-09-25T23:00:01Z')
  assert.equal(obterDataSugerida(5, '20:00:00', agora), '2026-10-02')
})

test('usa o dia de Brasília mesmo quando a data UTC já virou', function () {
  const agora = new Date('2026-09-26T01:30:00Z')
  assert.equal(obterDataSugerida(5, '23:00:00', agora), '2026-09-25')
})

test('sem horário sugere o próprio dia; sem dia não preenche a data', function () {
  const agora = new Date('2026-09-25T22:00:00Z')
  assert.equal(obterDataSugerida(5, null, agora), '2026-09-25')
  assert.equal(obterDataSugerida(null, '20:00:00', agora), '')
})

test('monta o local a partir do endereço disponível da patota', function () {
  assert.equal(obterLocalSugerido({ rua: 'Rua A', cidade: 'Brasília', estado: 'DF' }), 'Rua A — Brasília/DF')
  assert.equal(obterLocalSugerido({ rua: null, cidade: 'Brasília', estado: 'DF' }), 'Brasília/DF')
})
