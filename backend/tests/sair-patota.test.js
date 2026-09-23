import test from 'node:test'
import assert from 'node:assert/strict'
import pool from '../db.js'
import { sairDaPatota } from '../patotas/controller.js'

function criarResposta() {
  return {
    statusCode: 200,
    body: null,
    status: function (codigo) {
      this.statusCode = codigo
      return this
    },
    json: function (dados) {
      this.body = dados
      return this
    }
  }
}

function prepararBanco(contexto, presidenteId, membroAtivo) {
  let exclusoes = 0

  contexto.mock.method(pool, 'query', async function (querySql, arrayValores) {
    if (querySql.includes('DELETE FROM membro_patotas mp')) {
      exclusoes = exclusoes + 1
      assert.deepEqual(arrayValores, ['patota', 'jogador'])
      assert.match(querySql, /mp\.role = 'JOGADOR'/)
      assert.match(querySql, /p\.presidente_id <> \$2/)
      assert.match(querySql, /RETURNING mp\.id/)
      if (membroAtivo) return { rows: [{ id: 'vinculo' }] }
      return { rows: [] }
    }

    if (querySql.includes('FROM patotas p')) {
      assert.deepEqual(arrayValores, ['patota'])
      if (!presidenteId) return { rows: [] }
      return { rows: [{ id: 'patota', presidenteId: presidenteId }] }
    }

    if (querySql.includes('COUNT(*)')) {
      return { rows: [{ total: 2 }] }
    }

    throw new Error('Consulta inesperada: ' + querySql)
  })

  return function () {
    return exclusoes
  }
}

test('jogador autenticado sai da patota removendo apenas o próprio vínculo', async function (contexto) {
  const contarExclusoes = prepararBanco(contexto, 'presidente', true)
  const resposta = criarResposta()

  await sairDaPatota({ params: { id: 'patota' }, usuarioId: 'jogador' }, resposta)

  assert.equal(resposta.statusCode, 200)
  assert.equal(resposta.body.mensagem, 'Você saiu da patota com sucesso')
  assert.equal(contarExclusoes(), 1)
})

test('presidente não pode sair da própria patota', async function (contexto) {
  const contarExclusoes = prepararBanco(contexto, 'presidente', true)
  const resposta = criarResposta()

  await sairDaPatota({ params: { id: 'patota' }, usuarioId: 'presidente' }, resposta)

  assert.equal(resposta.statusCode, 403)
  assert.equal(contarExclusoes(), 0)
})

test('usuário que não é membro não pode sair', async function (contexto) {
  const contarExclusoes = prepararBanco(contexto, 'presidente', false)
  const resposta = criarResposta()

  await sairDaPatota({ params: { id: 'patota' }, usuarioId: 'jogador' }, resposta)

  assert.equal(resposta.statusCode, 404)
  assert.equal(contarExclusoes(), 1)
})

test('patota inexistente retorna 404 sem remover vínculo', async function (contexto) {
  const contarExclusoes = prepararBanco(contexto, null, true)
  const resposta = criarResposta()

  await sairDaPatota({ params: { id: 'patota' }, usuarioId: 'jogador' }, resposta)

  assert.equal(resposta.statusCode, 404)
  assert.equal(contarExclusoes(), 0)
})
