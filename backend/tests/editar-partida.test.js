import test from 'node:test'
import assert from 'node:assert/strict'
import pool from '../db.js'
import { editarPartida } from '../partidas/model.js'

const dadosPartida = {
  data: '2026-09-25',
  horario: '20:00',
  local: 'Quadra central',
  vagasTotal: 8
}

function prepararConexao(contexto, status, vagasPreenchidas, presidenteId) {
  const arrayComandos = []
  let partidaSalva = null

  const client = {
    query: async function (query, arrayValores) {
      arrayComandos.push(query.trim())

      if (query.includes('FOR UPDATE OF pa')) {
        return { rows: [{ status: status, presidenteId: presidenteId }] }
      }
      if (query.includes('SELECT COUNT(*)')) {
        return { rows: [{ total: vagasPreenchidas }] }
      }
      if (query.includes('UPDATE partidas')) {
        partidaSalva = {
          id: arrayValores[0],
          data: arrayValores[1],
          horario: arrayValores[2],
          local: arrayValores[3],
          vagasTotal: arrayValores[4],
          status: status
        }
        return { rows: [partidaSalva] }
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
    obterPartidaSalva: function () {
      return partidaSalva
    }
  }
}

test('presidente edita partida em andamento e pode manter vagas iguais aos confirmados', async function (contexto) {
  const conexao = prepararConexao(contexto, 'EM_ANDAMENTO', 8, 'presidente')
  const resultado = await editarPartida('partida', 'presidente', dadosPartida)

  assert.deepEqual(resultado.partida, conexao.obterPartidaSalva())
  assert.equal(resultado.partida.local, 'Quadra central')
  assert.equal(conexao.arrayComandos[0], 'BEGIN')
  assert.equal(conexao.arrayComandos.at(-1), 'COMMIT')
})

test('edição não reduz vagas abaixo dos participantes confirmados', async function (contexto) {
  const conexao = prepararConexao(contexto, 'AGENDADA', 9, 'presidente')
  const resultado = await editarPartida('partida', 'presidente', dadosPartida)

  assert.deepEqual(resultado, { vagasInsuficientes: true, vagasPreenchidas: 9 })
  assert.equal(conexao.obterPartidaSalva(), null)
  assert.equal(conexao.arrayComandos.at(-1), 'ROLLBACK')
})

test('edição rejeita outro usuário e partida encerrada', async function (contexto) {
  const conexao = prepararConexao(contexto, 'FINALIZADA', 2, 'presidente')

  assert.deepEqual(await editarPartida('partida', 'jogador', dadosPartida), { semPermissao: true })
  assert.deepEqual(await editarPartida('partida', 'presidente', dadosPartida), { encerrada: true })
  assert.equal(conexao.obterPartidaSalva(), null)
  assert.equal(conexao.arrayComandos.filter(function (comando) {
    return comando === 'ROLLBACK'
  }).length, 2)
})

test('partida cancelada não volta a ser editável', async function (contexto) {
  const conexao = prepararConexao(contexto, 'CANCELADA', 0, 'presidente')
  const resultado = await editarPartida('partida', 'presidente', dadosPartida)

  assert.deepEqual(resultado, { encerrada: true })
  assert.equal(conexao.obterPartidaSalva(), null)
  assert.equal(conexao.arrayComandos.at(-1), 'ROLLBACK')
})
