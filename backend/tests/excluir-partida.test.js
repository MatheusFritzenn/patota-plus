import test from 'node:test'
import assert from 'node:assert/strict'
import pool from '../db.js'
import { excluirPartida } from '../partidas/model.js'

function prepararConexao(contexto, status, presidenteId) {
  const arrayComandos = []
  let excluida = false

  const client = {
    query: async function (query, arrayValores) {
      arrayComandos.push(query.trim())

      if (query.includes('FOR UPDATE OF pa')) {
        if (status === null) {
          return { rows: [] }
        }
        return { rows: [{ status: status, presidenteId: presidenteId }] }
      }
      if (query.includes('DELETE FROM partidas')) {
        assert.deepEqual(arrayValores, ['partida'])
        excluida = true
        return { rows: [{ patotaId: 'patota' }] }
      }
      return { rows: [] }
    },
    release: function () {}
  }

  contexto.mock.method(pool, 'connect', async function () {
    return client
  })

  return {
    arrayComandos: arrayComandos,
    foiExcluida: function () {
      return excluida
    }
  }
}

test('presidente exclui uma partida agendada em uma transação', async function (contexto) {
  const conexao = prepararConexao(contexto, 'AGENDADA', 'presidente')
  const resultado = await excluirPartida('partida', 'presidente')

  assert.deepEqual(resultado, { patotaId: 'patota' })
  assert.equal(conexao.foiExcluida(), true)
  assert.equal(conexao.arrayComandos[0], 'BEGIN')
  assert.equal(conexao.arrayComandos.at(-1), 'COMMIT')
})

test('outro usuário não pode excluir a partida', async function (contexto) {
  const conexao = prepararConexao(contexto, 'EM_ANDAMENTO', 'presidente')
  const resultado = await excluirPartida('partida', 'jogador')

  assert.deepEqual(resultado, { semPermissao: true })
  assert.equal(conexao.foiExcluida(), false)
  assert.equal(conexao.arrayComandos.at(-1), 'ROLLBACK')
})

test('partidas encerradas são preservadas', async function (contexto) {
  const conexao = prepararConexao(contexto, 'FINALIZADA', 'presidente')
  const resultado = await excluirPartida('partida', 'presidente')

  assert.deepEqual(resultado, { encerrada: true })
  assert.equal(conexao.foiExcluida(), false)
  assert.equal(conexao.arrayComandos.at(-1), 'ROLLBACK')
})

test('partida inexistente retorna ausência sem excluir nada', async function (contexto) {
  const conexao = prepararConexao(contexto, null, 'presidente')
  const resultado = await excluirPartida('partida', 'presidente')

  assert.deepEqual(resultado, { naoEncontrada: true })
  assert.equal(conexao.foiExcluida(), false)
  assert.equal(conexao.arrayComandos.at(-1), 'ROLLBACK')
})
