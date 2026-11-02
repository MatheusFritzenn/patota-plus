import assert from 'node:assert/strict'
import { balancearTimes } from '../../partidas/model.js'

function resumirTime(nome, arrayJogadores) {
  assert.ok(arrayJogadores.length > 0, 'Time vazio')
  const soma = arrayJogadores.reduce(function (total, j) { return total + j.forca }, 0)
  return { nome: nome, jogadores: arrayJogadores, media: soma / arrayJogadores.length }
}

export function compararRodada(partida, arrayFonte) {
  assert.ok(arrayFonte.length >= 2, 'Rodada sem participantes suficientes')
  assert.equal(new Set(arrayFonte.map(function (j) { return j.id })).size, arrayFonte.length, 'Participante duplicado')
  const mapaTimes = new Map()
  for (const jogador of arrayFonte) {
    assert.ok(Number.isFinite(jogador.forca) && jogador.forca >= 0 && jogador.forca <= 10, 'Nota ausente ou inválida: ' + jogador.nome)
    assert.ok(jogador.timeId && jogador.timeNome, 'Participante sem time manual')
    if (!mapaTimes.has(jogador.timeId)) mapaTimes.set(jogador.timeId, [])
    mapaTimes.get(jogador.timeId).push(jogador)
  }
  assert.equal(mapaTimes.size, 2, 'Esperados exatamente dois times manuais')
  const arrayManual = []
  for (const arrayJogadores of mapaTimes.values()) arrayManual.push(resumirTime(arrayJogadores[0].timeNome, arrayJogadores))
  const formacao = balancearTimes(arrayFonte, partida.modalidadeId)
  const arrayAutomatico = formacao.times.map(function (time) { return resumirTime('Time ' + time.numero, time.jogadores) })
  const arrayIdsAutomaticos = arrayAutomatico.flatMap(function (time) { return time.jogadores.map(function (j) { return j.id }) }).sort()
  assert.deepEqual(arrayIdsAutomaticos, arrayFonte.map(function (j) { return j.id }).sort(), 'Formação alterou os participantes')
  const manual = Math.abs(arrayManual[0].media - arrayManual[1].media)
  const automatico = Math.abs(arrayAutomatico[0].media - arrayAutomatico[1].media)
  return { partidaId: partida.id, data: partida.data, participantes: arrayFonte.length, manual: manual, automatico: automatico, diferenca: manual - automatico, timesManuais: arrayManual, timesAutomaticos: arrayAutomatico, divisoesAvaliadas: formacao.divisoesAvaliadas, buscaConcluida: formacao.buscaConcluida }
}
