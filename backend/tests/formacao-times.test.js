import test from 'node:test'
import assert from 'node:assert/strict'
import { balancearTimes, gerarTimes, buscarTimes } from '../partidas/model.js'
import pool from '../db.js'

function jogador(id, forca, arrayPosicoes, posicaoTemporariaId = null) {
  return { id: id, forca: forca, posicoesIds: arrayPosicoes, posicaoTemporariaId: posicaoTemporariaId }
}

function contarPosicao(time, posicaoId) {
  return time.jogadores.filter(function (item) {
    return item.posicoesIds.includes(posicaoId)
  }).length
}

test('caso da imagem aproxima as médias sem concentrar goleiros ou posições', function () {
  const arrayTimes = balancearTimes([
    jogador('Weverton', 8, [1]), jogador('Noriega', 6.25, [7]),
    jogador('Marlon', 6.75, [8]), jogador('Pavon', 7, [8]),
    jogador('Ellen', 9, [9]), jogador('Grando', 5.5, [1]),
    jogador('Matheus', 9.25, [7, 8]), jogador('Rodrigo', 7, [7]),
    jogador('Edilson', 6.25, [8]), jogador('Wallace', null, [9])
  ])
  const diferenca = Math.abs(arrayTimes[0].somaForca / 5 - arrayTimes[1].somaForca / 5)
  assert.ok(diferenca <= 0.055555556)
  for (const time of arrayTimes) {
    assert.equal(contarPosicao(time, 1), 1)
    assert.equal(contarPosicao(time, 8), 2)
    assert.equal(contarPosicao(time, 9), 1)
  }
})

test('encontra melhoria que exige mais de uma troca ao mesmo tempo', function () {
  const arrayForcas = [1.7, 3.8, 4.8, 2.6, 6.1, 6.2, 9.4, 0.7, 8.9, 0.9]
  const arrayEntrada = arrayForcas.map(function (forca, indice) {
    return jogador(String(indice), forca, [8])
  })
  const arrayTimes = balancearTimes(arrayEntrada)
  // Trocas isoladas paravam numa diferença de soma 0,3; o ótimo é 0,1.
  assert.ok(Math.abs(Math.abs(arrayTimes[0].somaForca - arrayTimes[1].somaForca) - 0.1) < 0.000000001)
})

test('nenhuma divisão de tamanho válido supera o resultado nos três critérios', function () {
  const arrayBase = [
    jogador('a', 10, [1], 8), jogador('b', 9, [8], 1),
    jogador('c', 1, [1]), jogador('d', 2, [7, 8]),
    jogador('e', 7, [7]), jogador('f', 5, [9]),
    jogador('g', null, []), jogador('h', 0, [8])
  ]
  // Oráculo independente: enumera subconjuntos por máscara, sem usar os
  // auxiliares de avaliação nem a recursão do código de produção.
  for (const quantidade of [7, 8]) {
    const arrayEntrada = arrayBase.slice(0, quantidade)
    const arrayTimes = balancearTimes(arrayEntrada)
    const arrayJogadores = arrayTimes.flatMap(function (time) { return time.jogadores })

    function pontuar(arrayGrupoA, arrayGrupoB) {
      let diferencaGoleiros = 0
      let desequilibrio = 0
      for (const posicao of [1, 7, 8, 9]) {
        const quantidadeA = arrayGrupoA.filter(function (item) { return item.posicoesIds.includes(posicao) }).length
        const quantidadeB = arrayGrupoB.filter(function (item) { return item.posicoesIds.includes(posicao) }).length
        const diferenca = quantidadeA - quantidadeB
        desequilibrio += diferenca * diferenca
        if (posicao === 1) diferencaGoleiros = Math.abs(diferenca)
      }
      const somaA = arrayGrupoA.reduce(function (soma, item) { return soma + item.forcaEfetiva }, 0)
      const somaB = arrayGrupoB.reduce(function (soma, item) { return soma + item.forcaEfetiva }, 0)
      return [diferencaGoleiros, desequilibrio, Math.abs(somaA / arrayGrupoA.length - somaB / arrayGrupoB.length)]
    }

    const arrayObtida = pontuar(arrayTimes[0].jogadores, arrayTimes[1].jogadores)
    for (let mascara = 1; mascara < 2 ** quantidade - 1; mascara += 1) {
      const arrayGrupoA = []
      const arrayGrupoB = []
      for (let indice = 0; indice < quantidade; indice += 1) {
        if (mascara & (1 << indice)) arrayGrupoA.push(arrayJogadores[indice])
        else arrayGrupoB.push(arrayJogadores[indice])
      }
      if (Math.abs(arrayGrupoA.length - arrayGrupoB.length) > 1) continue
      const arrayAlternativa = pontuar(arrayGrupoA, arrayGrupoB)
      for (let criterio = 0; criterio < 3; criterio += 1) {
        if (Math.abs(arrayObtida[criterio] - arrayAlternativa[criterio]) < 0.000000001) continue
        assert.ok(arrayObtida[criterio] < arrayAlternativa[criterio])
        break
      }
    }
  }
})

test('distribui cada posição e encontra forças iguais com perfis complementares', function () {
  const arrayEntrada = [
    jogador('a', 10, [1]), jogador('b', 4, [1]),
    jogador('c', 9, [7]), jogador('d', 3, [7]),
    jogador('e', 8, [8]), jogador('f', 2, [8]),
    jogador('g', 7, [9]), jogador('h', 1, [9])
  ]
  const arrayTimes = balancearTimes(arrayEntrada)
  for (const time of arrayTimes) {
    assert.equal(time.jogadores.length, 4)
    for (const posicaoId of [1, 7, 8, 9]) {
      assert.equal(contarPosicao(time, posicaoId), 1)
    }
    assert.equal(time.somaForca, 22)
  }
})

test('posição temporária substitui o perfil, inclusive entrada e saída do gol', function () {
  const arrayTimes = balancearTimes([
    jogador('a', 5, [1], 9), jogador('b', 5, [8], 1),
    jogador('c', 5, [1]), jogador('d', 5, [9])
  ])
  const arrayJogadores = arrayTimes.flatMap(function (time) { return time.jogadores })
  const remanejado = arrayJogadores.find(function (item) { return item.id === 'a' })
  assert.deepEqual(remanejado.posicoesIds, [9])
  assert.equal(remanejado.ehGoleiro, false)
  for (const time of arrayTimes) {
    assert.equal(contarPosicao(time, 1), 1)
    assert.equal(contarPosicao(time, 9), 1)
  }
})

test('considera todas as opções do perfil sem duplicar o jogador', function () {
  const arrayTimes = balancearTimes([
    jogador('a', 5, [7, 8, 8]), jogador('b', 5, [7]),
    jogador('c', 5, [8]), jogador('d', 5, [])
  ])
  for (const time of arrayTimes) {
    assert.equal(contarPosicao(time, 7), 1)
    assert.equal(contarPosicao(time, 8), 1)
    assert.equal(time.jogadores.length, 2)
  }
})

test('força neutra preserva nota zero e usa 5 quando ninguém foi avaliado', function () {
  const arrayTimes = balancearTimes([
    jogador('a', 0, []), jogador('b', 10, []), jogador('c', null, []), jogador('d', undefined, [])
  ])
  for (const time of arrayTimes) {
    for (const item of time.jogadores) {
      if (item.id === 'c' || item.id === 'd') {
        assert.equal(item.forcaEfetiva, 5)
      }
      if (item.id === 'a') {
        assert.equal(item.forcaEfetiva, 0)
      }
    }
  }
  const arraySemNotas = balancearTimes([jogador('a', null, []), jogador('b', null, [])])
  assert.equal(arraySemNotas[0].somaForca, 5)
  assert.equal(arraySemNotas[1].somaForca, 5)
})

test('sem posições ainda equilibra força, inclusive com quantidade ímpar', function () {
  const arrayTimes = balancearTimes([
    jogador('a', 10, []), jogador('b', 8, []), jogador('c', 6, []),
    jogador('d', 4, []), jogador('e', 2, [])
  ])
  assert.equal(arrayTimes[0].somaForca / arrayTimes[0].jogadores.length, 6)
  assert.equal(arrayTimes[1].somaForca / arrayTimes[1].jogadores.length, 6)
})

test('resultado independe da ordem da entrada e não altera os participantes', function () {
  const arrayEntrada = [jogador('c', 5, [7]), jogador('b', 5, [8]), jogador('a', 5, [7])]
  const original = JSON.stringify(arrayEntrada)
  assert.deepEqual(balancearTimes(arrayEntrada), balancearTimes(arrayEntrada.slice().reverse()))
  assert.equal(JSON.stringify(arrayEntrada), original)
})

test('mantém tamanhos, unicidade e distribuição de goleiros para listas variadas', function () {
  for (let quantidade = 2; quantidade <= 31; quantidade += 1) {
    for (const quantidadeGoleiros of [0, 1, 2, 3, quantidade]) {
      const arrayEntrada = []
      for (let indice = 0; indice < quantidade; indice += 1) {
        let posicao = 7 + indice % 3
        if (indice < quantidadeGoleiros) {
          posicao = 1
        }
        arrayEntrada.push(jogador(String(indice), indice % 11, [posicao]))
      }
      const arrayTimes = balancearTimes(arrayEntrada)
      const arrayIds = arrayTimes.flatMap(function (time) {
        return time.jogadores.map(function (item) { return item.id })
      })
      assert.equal(arrayIds.length, quantidade)
      assert.equal(new Set(arrayIds).size, quantidade)
      assert.ok(Math.abs(arrayTimes[0].jogadores.length - arrayTimes[1].jogadores.length) <= 1)
      assert.ok(Math.abs(contarPosicao(arrayTimes[0], 1) - contarPosicao(arrayTimes[1], 1)) <= 1)
    }
  }
})

test('geração lê pela conexão transacional e desfaz alterações se a gravação falhar', async function (contexto) {
  const arrayComandos = []
  let liberado = false
  contexto.mock.method(pool, 'connect', async function () {
    return {
      query: async function (queryComando) {
        arrayComandos.push(queryComando)
        if (queryComando.includes('SELECT u.id')) {
          return { rows: [
            { id: 'a', mediaGeral: '8', totalAvaliacoes: 1, posicoesIds: [1], posicaoTemporariaId: 9 },
            { id: 'b', mediaGeral: null, totalAvaliacoes: null, posicoesIds: [9], posicaoTemporariaId: 1 }
          ] }
        }
        if (queryComando.includes('INSERT INTO times')) {
          throw new Error('falha simulada')
        }
        return { rows: [] }
      },
      release: function () { liberado = true }
    }
  })
  contexto.mock.method(pool, 'query', async function () { assert.fail('Leitura fora da transação') })
  await assert.rejects(gerarTimes('partida'), /falha simulada/)
  assert.equal(arrayComandos[0], 'BEGIN')
  assert.equal(arrayComandos.at(-1), 'ROLLBACK')
  assert.equal(liberado, true)
})

test('regeneração substitui os times e associa cada participante uma única vez', async function (contexto) {
  const arrayAssociacoes = []
  const arrayComandos = []
  let totalTimes = 0
  let liberado = false
  contexto.mock.method(pool, 'connect', async function () {
    return {
      query: async function (queryComando, arrayValores) {
        arrayComandos.push(queryComando)
        if (queryComando.includes('SELECT u.id')) {
          return { rows: [
            { id: 'a', mediaGeral: '8', totalAvaliacoes: 1, posicoesIds: [1], posicaoTemporariaId: 9 },
            { id: 'b', mediaGeral: '8', totalAvaliacoes: 1, posicoesIds: [9], posicaoTemporariaId: 1 },
            { id: 'c', mediaGeral: null, totalAvaliacoes: 0, posicoesIds: [1], posicaoTemporariaId: null },
            { id: 'd', mediaGeral: null, totalAvaliacoes: 0, posicoesIds: [9], posicaoTemporariaId: null }
          ] }
        }
        if (queryComando.includes('INSERT INTO times')) {
          totalTimes += 1
          return { rows: [{ id: 'novo-' + totalTimes }] }
        }
        if (queryComando.includes('SET time_id = $1')) {
          arrayAssociacoes.push(arrayValores)
        }
        return { rows: [] }
      },
      release: function () { liberado = true }
    }
  })
  contexto.mock.method(pool, 'query', async function (queryComando) {
    if (queryComando.includes('AS "forcaNeutra"')) {
      return { rows: [{ forcaNeutra: '8' }] }
    }
    return { rows: [] }
  })
  await gerarTimes('partida')
  assert.equal(totalTimes, 2)
  assert.equal(arrayAssociacoes.length, 4)
  const arrayIds = arrayAssociacoes.map(function (arrayValores) { return arrayValores[2] })
  assert.equal(new Set(arrayIds).size, 4)
  const arrayAssociacaoB = arrayAssociacoes.find(function (arrayValores) { return arrayValores[2] === 'b' })
  const arrayAssociacaoC = arrayAssociacoes.find(function (arrayValores) { return arrayValores[2] === 'c' })
  assert.notEqual(arrayAssociacaoB[0], arrayAssociacaoC[0])
  assert.ok(arrayComandos.some(function (queryComando) { return queryComando.includes('DELETE FROM times') }))
  assert.ok(arrayComandos.every(function (queryComando) {
    return !queryComando.includes('SET posicao_id') && !queryComando.includes('UPDATE usuario_posicoes')
  }))
  assert.equal(arrayComandos.at(-1), 'COMMIT')
  assert.equal(liberado, true)
})

test('média exibida inclui a força neutra dos jogadores sem avaliação', async function (contexto) {
  contexto.mock.method(pool, 'query', async function (queryComando) {
    if (queryComando.includes('AS "forcaNeutra"')) {
      return { rows: [{ forcaNeutra: '6' }] }
    }
    if (queryComando.includes('AS "modalidadeId"')) {
      return { rows: [{ modalidadeId: 2 }] }
    }
    if (queryComando.includes('SELECT id, nome FROM times')) {
      return { rows: [{ id: 'time-a', nome: 'Time 1' }] }
    }
    if (queryComando.includes('SELECT u.id')) {
      return { rows: [
        { id: 'a', mediaGeral: '10', totalAvaliacoes: 1 },
        { id: 'b', mediaGeral: null, totalAvaliacoes: null }
      ] }
    }
    return { rows: [] }
  })
  const arrayTimes = await buscarTimes('partida')
  assert.equal(arrayTimes[0].mediaForca, 8)
  assert.equal(arrayTimes[0].jogadores[1].forca, null)
  assert.equal(arrayTimes[0].jogadores[1].forcaEfetiva, 6)
})
