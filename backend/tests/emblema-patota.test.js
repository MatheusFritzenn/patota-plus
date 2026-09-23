import test from 'node:test'
import assert from 'node:assert/strict'
import pool from '../db.js'
import { atualizar } from '../patotas/controller.js'

const patotaId = '11111111-1111-4111-8111-111111111111'
const caminhoValido = patotaId + '/22222222-2222-4222-8222-222222222222.png'

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

test('apenas o presidente atualiza o emblema da própria patota', async function (contexto) {
  let atualizou = false
  contexto.mock.method(pool, 'query', async function (querySql) {
    if (querySql.includes('COUNT(*)')) return { rows: [{ total: 1 }] }
    if (querySql.startsWith('UPDATE')) {
      atualizou = true
      return { rows: [] }
    }
    return { rows: [{ id: patotaId, presidenteId: 'presidente', emblemaPath: null }] }
  })

  const resposta = criarResposta()
  await atualizar({ params: { id: patotaId }, usuarioId: 'outro', body: { emblemaPath: caminhoValido } }, resposta)

  assert.equal(resposta.statusCode, 403)
  assert.equal(atualizou, false)
})

test('caminho de outra patota é rejeitado antes de atualizar', async function (contexto) {
  let atualizou = false
  contexto.mock.method(pool, 'query', async function (querySql) {
    if (querySql.includes('COUNT(*)')) return { rows: [{ total: 1 }] }
    if (querySql.startsWith('UPDATE')) {
      atualizou = true
      return { rows: [] }
    }
    return { rows: [{ id: patotaId, presidenteId: 'presidente', emblemaPath: null }] }
  })

  const resposta = criarResposta()
  const caminhoExterno = '33333333-3333-4333-8333-333333333333/22222222-2222-4222-8222-222222222222.png'
  await atualizar({ params: { id: patotaId }, usuarioId: 'presidente', body: { emblemaPath: caminhoExterno } }, resposta)

  assert.equal(resposta.statusCode, 400)
  assert.equal(atualizou, false)
})

test('presidente pode salvar e remover o emblema sem alterar outros dados', async function (contexto) {
  const arrayAtualizacoes = []
  let emblemaAtual = null
  contexto.mock.method(pool, 'query', async function (querySql, arrayValores) {
    if (querySql.includes('COUNT(*)')) return { rows: [{ total: 1 }] }
    if (querySql.startsWith('UPDATE')) {
      assert.match(querySql, /emblema_path = \$1/)
      arrayAtualizacoes.push(arrayValores)
      emblemaAtual = arrayValores[0]
      return { rows: [] }
    }
    assert.match(querySql, /p\.emblema_path AS "emblemaPath"/)
    return { rows: [{ id: patotaId, presidenteId: 'presidente', emblemaPath: emblemaAtual }] }
  })

  const respostaCadastro = criarResposta()
  await atualizar({ params: { id: patotaId }, usuarioId: 'presidente', body: { emblemaPath: caminhoValido } }, respostaCadastro)
  assert.equal(respostaCadastro.statusCode, 200)
  assert.equal(respostaCadastro.body.emblemaPath, caminhoValido)

  const respostaRemocao = criarResposta()
  await atualizar({ params: { id: patotaId }, usuarioId: 'presidente', body: { emblemaPath: null } }, respostaRemocao)
  assert.equal(respostaRemocao.statusCode, 200)
  assert.equal(respostaRemocao.body.emblemaPath, null)
  assert.deepEqual(arrayAtualizacoes, [[caminhoValido, patotaId], [null, patotaId]])
})
