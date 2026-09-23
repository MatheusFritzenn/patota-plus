import test from 'node:test'
import assert from 'node:assert/strict'
import pool from '../db.js'
import { listarDisponiveis } from '../patotas/controller.js'

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

test('busca filtra a modalidade no banco e devolve somente os resultados encontrados', async function (contexto) {
  let arrayParametros = null
  contexto.mock.method(pool, 'query', async function (querySelect, arrayValores) {
    assert.match(querySelect, /p\.modalidade_id = \$2/)
    arrayParametros = arrayValores
    return { rows: [{ id: 'patota-society', modalidadeId: 2, modalidadeNome: 'Futebol society' }] }
  })

  const resposta = criarResposta()
  await listarDisponiveis({ usuarioId: 'usuario', query: { modalidadeId: '2' } }, resposta)

  assert.deepEqual(arrayParametros, ['usuario', 2])
  assert.equal(resposta.statusCode, 200)
  assert.equal(resposta.body.length, 1)
  assert.equal(resposta.body[0].modalidadeId, 2)
})

test('sem modalidade a busca mantém a opção de listar todas', async function (contexto) {
  let arrayParametros = null
  contexto.mock.method(pool, 'query', async function (querySelect, arrayValores) {
    arrayParametros = arrayValores
    return { rows: [] }
  })

  const resposta = criarResposta()
  await listarDisponiveis({ usuarioId: 'usuario', query: {} }, resposta)

  assert.deepEqual(arrayParametros, ['usuario', null])
  assert.deepEqual(resposta.body, [])
})

test('modalidade inválida é recusada antes da consulta', async function (contexto) {
  let consultouBanco = false
  contexto.mock.method(pool, 'query', async function () {
    consultouBanco = true
    return { rows: [] }
  })

  const resposta = criarResposta()
  await listarDisponiveis({ usuarioId: 'usuario', query: { modalidadeId: '2abc' } }, resposta)

  assert.equal(resposta.statusCode, 400)
  assert.equal(consultouBanco, false)
})
