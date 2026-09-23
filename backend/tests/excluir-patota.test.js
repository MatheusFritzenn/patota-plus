import test from 'node:test'
import assert from 'node:assert/strict'
import pool from '../db.js'
import { excluirPatota } from '../patotas/model.js'

function prepararConexao(contexto, existe, falharSolicitacoes) {
  const arrayComandos = []
  const client = {
    query: async function (querySql, arrayValores) {
      arrayComandos.push(querySql)

      if (querySql.includes('FROM patotas') && querySql.includes('FOR UPDATE')) {
        assert.deepEqual(arrayValores, ['patota'])
        if (!existe) return { rows: [] }
        return { rows: [{ id: 'patota' }] }
      }

      if (querySql.includes('DELETE FROM solicitacoes_entrada')) {
        assert.deepEqual(arrayValores, ['patota'])
        if (falharSolicitacoes) throw new Error('Falha ao excluir solicitações')
      }

      if (querySql.includes('DELETE FROM patotas')) {
        assert.deepEqual(arrayValores, ['patota'])
      }

      return { rows: [] }
    },
    release: function () {}
  }

  contexto.mock.method(pool, 'connect', async function () {
    return client
  })

  return arrayComandos
}

test('exclui solicitações antes da patota, na mesma transação', async function (contexto) {
  const arrayComandos = prepararConexao(contexto, true, false)

  const resultado = await excluirPatota('patota')

  assert.equal(resultado, true)
  assert.deepEqual(arrayComandos, [
    'BEGIN',
    'SELECT id FROM patotas WHERE id = $1 FOR UPDATE',
    'DELETE FROM solicitacoes_entrada WHERE patota_id = $1',
    'DELETE FROM patotas WHERE id = $1',
    'COMMIT'
  ])
})

test('falha ao excluir solicitações desfaz a transação e preserva a patota', async function (contexto) {
  const arrayComandos = prepararConexao(contexto, true, true)

  await assert.rejects(excluirPatota('patota'), /Falha ao excluir solicitações/)

  assert.equal(arrayComandos.includes('DELETE FROM patotas WHERE id = $1'), false)
  assert.equal(arrayComandos.at(-1), 'ROLLBACK')
})

test('patota já removida retorna ausência sem excluir registros', async function (contexto) {
  const arrayComandos = prepararConexao(contexto, false, false)

  const resultado = await excluirPatota('patota')

  assert.equal(resultado, false)
  assert.deepEqual(arrayComandos, [
    'BEGIN',
    'SELECT id FROM patotas WHERE id = $1 FOR UPDATE',
    'ROLLBACK'
  ])
})
